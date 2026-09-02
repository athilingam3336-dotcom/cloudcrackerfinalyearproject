import asyncio
import time
from datetime import datetime, timedelta
from typing import Any, Dict

from app.models.category import Category
from app.models.product import Product
from app.models.user import User
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.inventory import Inventory
from app.schemas.order import OrderResponse, OrderItemResponse
from app.schemas.product import ProductResponse

# Module-level cache for dashboard metrics (15-second TTL)
_dashboard_cache: Dict[str, Any] = {}
_dashboard_cache_time: float = 0.0
_today_report_downloads: Dict[str, int] = {}


class DashboardService:
    async def get_admin_dashboard_metrics(self) -> Dict[str, Any]:
        """Assembles real-time dashboard metrics from MongoDB Atlas with parallel execution & 15s TTL cache."""
        global _dashboard_cache, _dashboard_cache_time
        now_ts = time.time()
        if _dashboard_cache and (now_ts - _dashboard_cache_time < 15.0):
            return _dashboard_cache

        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        now = datetime.utcnow()
        last_30_start = now - timedelta(days=30)
        prev_30_start = now - timedelta(days=60)

        # Pipelines
        stock_pipeline = [
            {"$match": {"status": {"$ne": "deleted"}}},
            {"$group": {"_id": None, "total_stock": {"$sum": "$stock"}}},
        ]
        rev_pipeline = [
            {"$match": {"admin_deleted_at": None, "order_status": {"$not": {"$regex": "^cancelled$", "$options": "i"}}}},
            {"$group": {"_id": None, "total_revenue": {"$sum": "$total"}}},
        ]
        today_rev_pipeline = [
            {
                "$match": {
                    "admin_deleted_at": None,
                    "created_at": {"$gte": today_start},
                    "order_status": {"$not": {"$regex": "^cancelled$", "$options": "i"}},
                }
            },
            {"$group": {"_id": None, "revenue": {"$sum": "$total"}}},
        ]

        # Execute top independent queries in parallel via asyncio.gather
        (
            total_users,
            total_customers,
            total_admins,
            total_categories,
            total_products,
            total_orders,
            pending_orders,
            completed_orders,
            cancelled_orders,
            today_orders,
            cur_period_orders,
            prev_period_orders,
            cur_period_users,
            prev_period_users,
            stock_results,
            rev_results,
            today_rev_results,
        ) = await asyncio.gather(
            User.find().count(),
            User.find(User.role == "CUSTOMER").count(),
            User.find(User.role == "ADMIN").count(),
            Category.find(Category.status != "deleted").count(),
            Product.find(Product.status != "deleted").count(),
            Order.find(Order.admin_deleted_at == None).count(),
            Order.find(Order.admin_deleted_at == None, {"order_status": {"$regex": "^pending$", "$options": "i"}}).count(),
            Order.find(Order.admin_deleted_at == None, {"order_status": {"$regex": "^delivered$", "$options": "i"}}).count(),
            Order.find(Order.admin_deleted_at == None, {"order_status": {"$regex": "^cancelled$", "$options": "i"}}).count(),
            Order.find(Order.admin_deleted_at == None, Order.created_at >= today_start).count(),
            Order.find(Order.admin_deleted_at == None, Order.created_at >= last_30_start, {"order_status": {"$not": {"$regex": "^cancelled$", "$options": "i"}}}).count(),
            Order.find(Order.admin_deleted_at == None, Order.created_at >= prev_30_start, Order.created_at < last_30_start, {"order_status": {"$not": {"$regex": "^cancelled$", "$options": "i"}}}).count(),
            User.find(User.created_at >= last_30_start).count(),
            User.find(User.created_at >= prev_30_start, User.created_at < last_30_start).count(),
            Product.get_pymongo_collection().aggregate(stock_pipeline).to_list(length=None),
            Order.get_pymongo_collection().aggregate(rev_pipeline).to_list(length=None),
            Order.get_pymongo_collection().aggregate(today_rev_pipeline).to_list(length=None),
        )

        total_stock_units = stock_results[0]["total_stock"] if stock_results else 0
        total_revenue = round(rev_results[0]["total_revenue"], 2) if rev_results else 0.0
        today_revenue = round(today_rev_results[0]["revenue"], 2) if today_rev_results else 0.0

        # 6. Real Period-over-Period Growth Calculations (Last 30 days vs Previous 30 days)
        now = datetime.utcnow()
        last_30_start = now - timedelta(days=30)
        prev_30_start = now - timedelta(days=60)

        # Recent 30 days revenue & orders
        cur_period_orders = await Order.find(
            Order.admin_deleted_at == None,
            Order.created_at >= last_30_start,
            Order.order_status != "Cancelled"
        ).count()
        prev_period_orders = await Order.find(
            Order.admin_deleted_at == None,
            Order.created_at >= prev_30_start,
            Order.created_at < last_30_start,
            Order.order_status != "Cancelled"
        ).count()

        cur_period_users = await User.find(User.created_at >= last_30_start).count()
        prev_period_users = await User.find(
            User.created_at >= prev_30_start,
            User.created_at < last_30_start
        ).count()

        def calc_growth_str(current: float, previous: float) -> str:
            if previous > 0:
                pct = ((current - previous) / previous) * 100.0
                sign = "+" if pct >= 0 else ""
                return f"{sign}{pct:.1f}%"
            elif current > 0:
                return "+100.0%"
            else:
                return "+0.0%"

        orders_growth = calc_growth_str(cur_period_orders, prev_period_orders)
        users_growth = calc_growth_str(cur_period_users, prev_period_users)
        revenue_growth = calc_growth_str(total_revenue, 0) if total_revenue > 0 else "+0.0%"

        # 7. Top Selling Products
        top_prod_pipeline = [
            {"$group": {
                "_id": "$product_id",
                "total_quantity": {"$sum": "$quantity"},
                "total_revenue": {"$sum": {"$multiply": ["$quantity", "$price"]}}
            }},
            {"$sort": {"total_quantity": -1}},
            {"$limit": 5}
        ]
        top_prod_cursor = OrderItem.get_pymongo_collection().aggregate(top_prod_pipeline)
        top_prod_results = await top_prod_cursor.to_list(length=None)
        top_selling_products = []
        for item in top_prod_results:
            prod = await Product.get(item["_id"])
            top_selling_products.append({
                "product_id": str(item["_id"]),
                "name": prod.name if prod else "Unknown Product",
                "quantity_sold": item["total_quantity"],
                "revenue_generated": round(item["total_revenue"], 2),
            })

        # 8. Top Categories
        top_cat_pipeline = [
            {"$lookup": {
                "from": "Products",
                "localField": "product_id",
                "foreignField": "_id",
                "as": "product"
            }},
            {"$unwind": "$product"},
            {"$group": {
                "_id": "$product.category_id",
                "sales_count": {"$sum": "$quantity"},
                "revenue": {"$sum": {"$multiply": ["$quantity", "$price"]}}
            }},
            {"$sort": {"sales_count": -1}},
            {"$limit": 5}
        ]
        top_cat_cursor = OrderItem.get_pymongo_collection().aggregate(top_cat_pipeline)
        top_cat_results = await top_cat_cursor.to_list(length=None)
        top_categories = []
        for r in top_cat_results:
            cat = await Category.get(r["_id"])
            top_categories.append({
                "category_id": str(r["_id"]),
                "name": cat.name if cat else "Unknown Category",
                "sales_count": r["sales_count"],
                "revenue_generated": round(r["revenue"], 2)
            })

        # 9. Stock alerts
        low_stock_products_count = await Inventory.find(
            {"$expr": {"$lte": ["$current_stock", "$minimum_stock"]}}
        ).count()
        out_of_stock_products_count = await Inventory.find(
            Inventory.current_stock == 0
        ).count()

        # 10. Recent Orders list enriched with User information
        recent_orders = await Order.find({"admin_deleted_at": None, "customer_deleted_at": None}).sort(-Order.created_at).limit(10).to_list()
        recent_orders_out = []
        for order in recent_orders:
            items = await OrderItem.find(OrderItem.order_id == order.id).to_list()
            items_out = []
            for item in items:
                prod = await Product.get(item.product_id)
                item_resp = OrderItemResponse.convert_id(item)
                if prod:
                    item_resp["product"] = ProductResponse.convert_id(prod)
                items_out.append(OrderItemResponse(**item_resp))
            order_resp = OrderResponse.convert_id(order)
            
            # Enrich customer info
            user = await User.get(order.user_id)
            if user:
                order_resp["customer_name"] = user.full_name or user.email
                order_resp["customer_email"] = user.email
                order_resp["customer_phone"] = user.phone
            elif order.shipping_address:
                addr_first = order.shipping_address.split(",")[0]
                order_resp["customer_name"] = addr_first.split("(")[0].strip()

            order_resp["items"] = items_out
            recent_orders_out.append(OrderResponse(**order_resp))

        # 11. Monthly Revenue & Orders
        monthly_pipeline = [
            {"$match": {"order_status": {"$ne": "Cancelled"}}},
            {"$group": {
                "_id": {
                    "year": {"$year": "$created_at"},
                    "month": {"$month": "$created_at"}
                },
                "revenue": {"$sum": "$total"},
                "orders_count": {"$sum": 1}
            }},
            {"$sort": {"_id.year": 1, "_id.month": 1}}
        ]
        monthly_cursor = Order.get_pymongo_collection().aggregate(monthly_pipeline)
        monthly_results = await monthly_cursor.to_list(length=None)
        monthly_data = []
        for r in monthly_results:
            monthly_data.append({
                "month": f"{r['_id']['year']}-{r['_id']['month']:02d}",
                "revenue": round(r["revenue"], 2),
                "orders_count": r["orders_count"]
            })

        result = {
            "counters": {
                "total_users": total_users,
                "total_customers": total_customers,
                "total_admins": total_admins,
                "total_categories": total_categories,
                "total_products": total_products,
                "total_stock_units": total_stock_units,
                "total_orders": total_orders,
                "pending_orders": pending_orders,
                "completed_orders": completed_orders,
                "cancelled_orders": cancelled_orders,
            },
            "revenue": {
                "total_revenue": total_revenue,
                "today_orders": today_orders,
                "today_revenue": today_revenue,
            },
            "growth": {
                "revenue_growth": revenue_growth,
                "orders_growth": orders_growth,
                "users_growth": users_growth,
            },
            "stock_alerts": {
                "low_stock_count": low_stock_products_count,
                "out_of_stock_count": out_of_stock_products_count,
            },
            "top_selling_products": top_selling_products,
            "top_categories": top_categories,
            "recent_orders": recent_orders_out,
            "monthly_trends": monthly_data,
        }

        _dashboard_cache = result
        _dashboard_cache_time = time.time()
        return result

    async def get_today_report_metrics(self) -> Dict[str, Any]:
        """Calculates real-time today's sales, today's order count, today's stock outflow & download tracking."""
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_str = datetime.utcnow().strftime("%Y-%m-%d")

        stock_pipeline = [
            {"$match": {"status": {"$ne": "deleted"}}},
            {"$group": {"_id": None, "total_stock": {"$sum": "$stock"}}},
        ]
        today_rev_pipeline = [
            {
                "$match": {
                    "admin_deleted_at": None,
                    "created_at": {"$gte": today_start},
                    "order_status": {"$not": {"$regex": "^cancelled$", "$options": "i"}},
                }
            },
            {"$group": {"_id": None, "revenue": {"$sum": "$total"}}},
        ]
        today_items_pipeline = [
            {
                "$match": {
                    "admin_deleted_at": None,
                    "created_at": {"$gte": today_start},
                    "order_status": {"$not": {"$regex": "^cancelled$", "$options": "i"}},
                }
            },
            {"$unwind": "$items"},
            {"$group": {"_id": None, "total_items_sold": {"$sum": "$items.quantity"}}},
        ]

        stock_results, today_rev_results, items_results = await asyncio.gather(
            Product.get_pymongo_collection().aggregate(stock_pipeline).to_list(length=None),
            Order.get_pymongo_collection().aggregate(today_rev_pipeline).to_list(length=None),
            Order.get_pymongo_collection().aggregate(today_items_pipeline).to_list(length=None),
        )

        today_orders_count = await Order.find(
            Order.admin_deleted_at == None,
            Order.created_at >= today_start
        ).count()

        today_orders = await Order.find(
            Order.admin_deleted_at == None,
            Order.created_at >= today_start
        ).sort("-created_at").to_list(length=100)

        orders_list = []
        for o in today_orders:
            items_summary = []
            for item in o.items:
                items_summary.append(f"{item.product_name} x{item.quantity}")
            orders_list.append({
                "id": str(o.id),
                "order_number": str(o.id)[-6:].upper(),
                "customer_name": o.shipping_address.split(",")[0].split("(")[0].strip() if o.shipping_address else "Customer",
                "total": round(o.total, 2),
                "order_status": o.order_status,
                "payment_status": o.payment_status,
                "items_summary": ", ".join(items_summary) if items_summary else "Crackers item",
                "created_at": o.created_at.strftime("%I:%M %p"),
            })

        total_stock = stock_results[0]["total_stock"] if stock_results else 0
        today_revenue = round(today_rev_results[0]["revenue"], 2) if today_rev_results else 0.0
        today_items_sold = items_results[0]["total_items_sold"] if items_results else 0

        dl_count = _today_report_downloads.get(today_str, 0)
        day_closed = dl_count >= 2

        return {
            "date": today_str,
            "today_revenue": today_revenue,
            "today_orders": today_orders_count,
            "today_items_sold": today_items_sold,
            "remaining_stock": total_stock,
            "download_count": dl_count,
            "day_closed": day_closed,
            "today_orders_list": orders_list,
        }

    async def record_today_report_download(self) -> Dict[str, Any]:
        global _today_report_downloads
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        current_count = _today_report_downloads.get(today_str, 0)
        _today_report_downloads[today_str] = current_count + 1
        return await self.get_today_report_metrics()
