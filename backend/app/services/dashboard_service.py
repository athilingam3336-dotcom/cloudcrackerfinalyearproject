import asyncio
import re
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
    @classmethod
    def clear_cache(cls) -> None:
        global _dashboard_cache, _dashboard_cache_time
        _dashboard_cache = {}
        _dashboard_cache_time = 0.0

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

        # 1. Total Stock Units
        stock_pipeline = [
            {"$match": {"status": {"$ne": "deleted"}}},
            {"$group": {"_id": None, "total_stock": {"$sum": "$stock"}}},
        ]

        # Paid condition: strictly match paid/confirmed/verified/success or delivered orders
        paid_condition = {
            "admin_deleted_at": None,
            "$or": [
                {"payment_status": re.compile(r"^(paid|confirmed|verified|success)$", re.IGNORECASE)},
                {"order_status": re.compile(r"^(delivered|completed)$", re.IGNORECASE)}
            ]
        }
        pending_condition = {
            "admin_deleted_at": None,
            "payment_status": re.compile(r"^(pending|under review|payment pending)$", re.IGNORECASE),
            "order_status": {"$not": re.compile(r"^(cancelled|canceled|delivered)$", re.IGNORECASE)}
        }
        failed_condition = {
            "admin_deleted_at": None,
            "$or": [
                {"order_status": re.compile(r"^(cancelled|canceled)$", re.IGNORECASE)},
                {"payment_status": re.compile(r"^(failed|rejected|cancelled|canceled)$", re.IGNORECASE)}
            ]
        }

        rev_pipeline = [
            {"$match": paid_condition},
            {"$group": {"_id": None, "total_revenue": {"$sum": "$total"}}},
        ]
        today_rev_pipeline = [
            {
                "$match": {
                    **paid_condition,
                    "created_at": {"$gte": today_start},
                }
            },
            {"$group": {"_id": None, "revenue": {"$sum": "$total"}}},
        ]
        pending_rev_pipeline = [
            {"$match": pending_condition},
            {"$group": {"_id": None, "revenue": {"$sum": "$total"}}},
        ]
        failed_rev_pipeline = [
            {"$match": failed_condition},
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
            pending_rev_results,
            failed_rev_results,
        ) = await asyncio.gather(
            User.find().count(),
            User.find(User.role == "CUSTOMER").count(),
            User.find(User.role == "ADMIN").count(),
            Category.find(Category.status != "deleted").count(),
            Product.find(Product.status != "deleted").count(),
            Order.find(Order.admin_deleted_at == None).count(),
            Order.find(Order.admin_deleted_at == None, Order.order_status == re.compile(r"^pending$", re.IGNORECASE)).count(),
            Order.find(Order.admin_deleted_at == None, Order.order_status == re.compile(r"^delivered$", re.IGNORECASE)).count(),
            Order.find(Order.admin_deleted_at == None, Order.order_status == re.compile(r"^cancelled$", re.IGNORECASE)).count(),
            Order.find(Order.admin_deleted_at == None, Order.created_at >= today_start).count(),
            Order.find({
                "admin_deleted_at": None,
                "created_at": {"$gte": last_30_start},
                "order_status": {"$not": re.compile(r"^(cancelled|canceled)$", re.IGNORECASE)}
            }).count(),
            Order.find({
                "admin_deleted_at": None,
                "created_at": {"$gte": prev_30_start, "$lt": last_30_start},
                "order_status": {"$not": re.compile(r"^(cancelled|canceled)$", re.IGNORECASE)}
            }).count(),
            User.find(User.created_at >= last_30_start).count(),
            User.find(User.created_at >= prev_30_start, User.created_at < last_30_start).count(),
            Product.get_pymongo_collection().aggregate(stock_pipeline).to_list(length=None),
            Order.get_pymongo_collection().aggregate(rev_pipeline).to_list(length=None),
            Order.get_pymongo_collection().aggregate(today_rev_pipeline).to_list(length=None),
            Order.get_pymongo_collection().aggregate(pending_rev_pipeline).to_list(length=None),
            Order.get_pymongo_collection().aggregate(failed_rev_pipeline).to_list(length=None),
        )

        total_stock_units = stock_results[0]["total_stock"] if stock_results else 0
        total_revenue = round(rev_results[0]["total_revenue"], 2) if rev_results else 0.0
        today_revenue = round(today_rev_results[0]["revenue"], 2) if today_rev_results else 0.0
        pending_revenue = round(pending_rev_results[0]["revenue"], 2) if pending_rev_results else 0.0
        failed_revenue = round(failed_rev_results[0]["revenue"], 2) if failed_rev_results else 0.0

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
        all_inventory = await Inventory.find_all().to_list()
        low_stock_products_count = sum(1 for inv in all_inventory if inv.current_stock <= inv.minimum_stock)
        out_of_stock_products_count = sum(1 for inv in all_inventory if inv.current_stock == 0)

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

        # 11. Monthly Revenue & Orders (Paid only)
        monthly_pipeline = [
            {"$match": paid_condition},
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
                "pending_revenue": pending_revenue,
                "failed_revenue": failed_revenue,
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

        total_stock = stock_results[0]["total_stock"] if stock_results else 0
        today_revenue = round(today_rev_results[0]["revenue"], 2) if today_rev_results else 0.0
        today_items_sold = items_results[0]["total_items_sold"] if items_results else 0

        today_orders_count = await Order.find(
            Order.admin_deleted_at == None,
            Order.created_at >= today_start
        ).count()

        today_orders = await Order.find(
            Order.admin_deleted_at == None,
            Order.created_at >= today_start
        ).sort("-created_at").to_list(length=100)

        from app.models.order_item import OrderItem

        orders_list = []
        sold_today_map: Dict[str, int] = {}

        for o in today_orders:
            items_list = getattr(o, "items", None)
            if items_list is None:
                items_list = await OrderItem.find(OrderItem.order_id == o.id).to_list()

            items_summary = []
            is_active_order = o.order_status and not o.order_status.lower().startswith("cancel")

            for item in items_list:
                p_name = getattr(item, "product_name", None)
                p_id = getattr(item, "product_id", None)
                qty = getattr(item, "quantity", 1)

                if not p_name and p_id:
                    prod = await Product.get(p_id)
                    p_name = prod.name if prod else "Cracker Item"

                p_name = p_name or "Cracker Item"
                items_summary.append(f"{p_name} x{qty}")

                if is_active_order:
                    if p_id:
                        sold_today_map[str(p_id)] = sold_today_map.get(str(p_id), 0) + qty
                    if p_name:
                        sold_today_map[p_name.lower()] = sold_today_map.get(p_name.lower(), 0) + qty

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

        categories = await Category.find(Category.status != "deleted").to_list()
        cat_map = {str(c.id): c.name for c in categories}

        products = await Product.find(Product.status != "deleted").sort("name").to_list()
        stock_inventory_list = []
        for p in products:
            p_id = str(p.id)
            c_name = cat_map.get(str(p.category_id), "General Crackers")
            sold_qty = sold_today_map.get(p_id, sold_today_map.get(p.name.lower(), 0))
            if p.stock == 0:
                stock_status = "Out of Stock"
            elif p.stock <= 5:
                stock_status = "Low Stock"
            else:
                stock_status = "In Stock"

            stock_inventory_list.append({
                "id": p_id,
                "name": p.name,
                "category_name": c_name,
                "price": round(p.price, 2),
                "sold_today": sold_qty,
                "stock_left": p.stock,
                "status": stock_status,
            })

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
            "stock_inventory_list": stock_inventory_list,
        }

    async def record_today_report_download(self) -> Dict[str, Any]:
        global _today_report_downloads
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        current_count = _today_report_downloads.get(today_str, 0)
        _today_report_downloads[today_str] = current_count + 1
        return await self.get_today_report_metrics()

    async def get_sales_summary(self) -> Dict[str, Any]:
        """Calculates real-time today's sales summary analytics with IST timezone alignment."""
        now_utc = datetime.utcnow()
        now_ist = now_utc + timedelta(hours=5, minutes=30)
        today_ist_start = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
        today_utc_start = today_ist_start - timedelta(hours=5, minutes=30)
        today_str = today_ist_start.strftime("%Y-%m-%d")

        today_orders_query = {
            "admin_deleted_at": None,
            "created_at": {"$gte": today_utc_start},
            "order_status": {"$not": {"$regex": "^cancelled$", "$options": "i"}},
            "payment_status": {"$ne": "Failed"},
        }

        active_orders = await Order.find(today_orders_query).sort("-created_at").to_list()
        today_orders_count = len(active_orders)
        today_revenue = round(sum(o.total for o in active_orders), 2)
        average_order_value = round(today_revenue / today_orders_count, 2) if today_orders_count > 0 else 0.0

        order_ids = [o.id for o in active_orders]

        order_items = []
        if order_ids:
            order_items = await OrderItem.find({"order_id": {"$in": order_ids}}).to_list()

        total_units_sold = sum(item.quantity for item in order_items)

        product_stats: Dict[str, Dict[str, Any]] = {}
        for item in order_items:
            p_id_str = str(item.product_id)
            if p_id_str not in product_stats:
                product_stats[p_id_str] = {
                    "product_id": p_id_str,
                    "units_sold": 0,
                    "revenue": 0.0,
                }
            product_stats[p_id_str]["units_sold"] += item.quantity
            product_stats[p_id_str]["revenue"] += item.quantity * item.price

        categories_map: Dict[str, str] = {}
        all_categories = await Category.find(Category.status != "deleted").to_list()
        for cat in all_categories:
            categories_map[str(cat.id)] = cat.name

        products_list = []
        category_stats: Dict[str, Dict[str, Any]] = {}

        for p_id_str, stats in product_stats.items():
            prod = await Product.get(p_id_str)
            p_name = prod.name if prod else "Unknown Product"
            c_id_str = str(prod.category_id) if prod and prod.category_id else "general"
            c_name = categories_map.get(c_id_str, "General Crackers")

            products_list.append({
                "product_id": p_id_str,
                "product_name": p_name,
                "total_sold": stats["units_sold"],
                "total_revenue": round(stats["revenue"], 2),
                "category": c_name,
            })

            if c_name not in category_stats:
                category_stats[c_name] = {
                    "category_id": c_id_str,
                    "category_name": c_name,
                    "total_sold": 0,
                    "total_revenue": 0.0,
                }
            category_stats[c_name]["total_sold"] += stats["units_sold"]
            category_stats[c_name]["total_revenue"] += stats["revenue"]

        products_list.sort(key=lambda x: x["total_sold"], reverse=True)
        top_products = products_list[:10]

        best_selling_product = None
        if top_products:
            best_selling_product = {
                "name": top_products[0]["product_name"],
                "units_sold": top_products[0]["total_sold"],
                "revenue": top_products[0]["total_revenue"],
            }

        categories_list = []
        for c_name, c_data in category_stats.items():
            pct = round((c_data["total_sold"] / total_units_sold) * 100.0, 1) if total_units_sold > 0 else 0.0
            categories_list.append({
                "category_id": c_data["category_id"],
                "category_name": c_name,
                "total_sold": c_data["total_sold"],
                "total_revenue": round(c_data["total_revenue"], 2),
                "percentage": pct,
            })
        categories_list.sort(key=lambda x: x["total_sold"], reverse=True)

        hourly_map: Dict[int, Dict[str, Any]] = {
            h: {"revenue": 0.0, "orders": 0, "units": 0} for h in range(24)
        }

        for order in active_orders:
            order_ist = order.created_at + timedelta(hours=5, minutes=30)
            h = order_ist.hour
            hourly_map[h]["revenue"] += order.total
            hourly_map[h]["orders"] += 1

        for item in order_items:
            item_ist = item.created_at + timedelta(hours=5, minutes=30)
            h = item_ist.hour
            hourly_map[h]["units"] += item.quantity

        hourly_trend = []
        current_ist_hour = now_ist.hour
        for h in range(24):
            if h <= current_ist_hour or hourly_map[h]["orders"] > 0:
                hour_12 = h % 12
                if hour_12 == 0:
                    hour_12 = 12
                ampm = "AM" if h < 12 else "PM"
                label = f"{hour_12} {ampm}"
                hourly_trend.append({
                    "hour": f"{h:02d}:00",
                    "hour_label": label,
                    "revenue": round(hourly_map[h]["revenue"], 2),
                    "orders": hourly_map[h]["orders"],
                    "units": hourly_map[h]["units"],
                })

        insights = []
        if today_orders_count > 0:
            if best_selling_product:
                insights.append(
                    f"🔥 {best_selling_product['name']} is today's best-selling product with {best_selling_product['units_sold']} units sold."
                )
            if categories_list:
                top_cat = categories_list[0]
                insights.append(
                    f"📦 {top_cat['category_name']} generated the highest category sales today ({top_cat['percentage']}% volume share)."
                )
            insights.append(
                f"💰 Today's revenue is ₹{today_revenue:,.2f} across {today_orders_count} orders with an average order value of ₹{average_order_value:,.2f}."
            )
        else:
            insights.append(
                "No sales data recorded yet today. Real-time sales analytics will automatically populate once orders arrive."
            )

        return {
            "date": today_str,
            "today_revenue": today_revenue,
            "today_orders": today_orders_count,
            "total_units_sold": total_units_sold,
            "average_order_value": average_order_value,
            "best_selling_product": best_selling_product,
            "products": top_products,
            "categories": categories_list,
            "hourly_trend": hourly_trend,
            "insights": insights,
        }
