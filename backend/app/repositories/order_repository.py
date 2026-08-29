from datetime import datetime
from typing import Any, Dict, List, Optional
from beanie import PydanticObjectId

from app.models.order import Order
from app.models.order_item import OrderItem


class OrderRepository:
    async def create_order(self, order_data: Dict[str, Any]) -> Order:
        """Create a new Order document."""
        order = Order(**order_data)
        await order.insert()
        return order

    async def create_order_item(self, item_data: Dict[str, Any]) -> OrderItem:
        """Create a new OrderItem document."""
        item = OrderItem(**item_data)
        await item.insert()
        return item

    async def get_by_id(self, order_id: str) -> Optional[Order]:
        """Fetch an order header by its ID."""
        try:
            oid = PydanticObjectId(order_id)
        except Exception:
            return None
        return await Order.get(oid)

    async def get_by_order_number(self, order_number: str) -> Optional[Order]:
        """Fetch an order by its unique order number."""
        return await Order.find_one(Order.order_number == order_number)

    async def list_user_orders(self, user_id: str) -> List[Order]:
        """List all orders for a user, sorted by newest first."""
        try:
            uid = PydanticObjectId(user_id)
        except Exception:
            return []
        return await Order.find(
            Order.user_id == uid,
            Order.customer_deleted_at == None
        ).sort(-Order.created_at).to_list()

    async def get_order_items(self, order_id: str) -> List[OrderItem]:
        """Fetch all order items associated with an order ID."""
        try:
            oid = PydanticObjectId(order_id)
        except Exception:
            return []
        return await OrderItem.find(OrderItem.order_id == oid).to_list()

    async def count_user_orders(self, user_id: str) -> int:
        """Count the total number of orders placed by a user."""
        try:
            uid = PydanticObjectId(user_id)
        except Exception:
            return 0
        return await Order.find(
            Order.user_id == uid,
            Order.customer_deleted_at == None
        ).count()

    async def update(self, order: Order, update_data: Dict[str, Any]) -> Order:
        """Update fields of an order document and save."""
        for key, value in update_data.items():
            setattr(order, key, value)
        order.updated_at = datetime.utcnow()
        await order.save()
        return order

    async def get_user_order_summary(self, user_id: str) -> Dict[str, Any]:
        """Aggregates metrics for user orders."""
        try:
            uid = PydanticObjectId(user_id)
        except Exception:
            return {
                "total_orders": 0,
                "total_spent": 0.0,
                "pending_orders": 0,
                "completed_orders": 0,
            }

        orders = await Order.find(
            Order.user_id == uid,
            Order.customer_deleted_at == None
        ).to_list()

        total_orders = len(orders)
        # Sum total of non-cancelled orders
        total_spent = sum(
            order.total for order in orders if (order.order_status or "").strip().lower() != "cancelled"
        )
        pending_orders = sum(
            1 for order in orders if (order.order_status or "").strip().lower() == "pending"
        )
        completed_orders = sum(
            1 for order in orders if (order.order_status or "").strip().lower() == "delivered"
        )

        return {
            "total_orders": total_orders,
            "total_spent": float(total_spent),
            "pending_orders": pending_orders,
            "completed_orders": completed_orders,
        }

    async def list_all_orders_admin(
        self,
        search: Optional[str] = None,
        order_status: Optional[str] = None,
        payment_status: Optional[str] = None,
        skip: int = 0,
        limit: int = 10,
    ) -> tuple[List[Order], int]:
        """Fetch paginated orders for admin with database-level search and filtering."""
        query_conditions = [Order.admin_deleted_at == None]

        if order_status and order_status != "All":
            query_conditions.append({"order_status": {"$regex": f"^{order_status}$", "$options": "i"}})
        if payment_status and payment_status != "All":
            query_conditions.append({"payment_status": {"$regex": f"^{payment_status}$", "$options": "i"}})
        if search and search.strip():
            s = search.strip()
            from app.models.user import User
            matching_users = await User.find(
                {"$or": [
                    {"full_name": {"$regex": s, "$options": "i"}},
                    {"email": {"$regex": s, "$options": "i"}},
                ]}
            ).to_list()
            user_ids = [u.id for u in matching_users]

            or_clauses = [
                {"order_number": {"$regex": s, "$options": "i"}},
                {"shipping_address": {"$regex": s, "$options": "i"}},
            ]
            if user_ids:
                or_clauses.append({"user_id": {"$in": user_ids}})

            query_conditions.append({"$or": or_clauses})

        if query_conditions:
            from beanie.operators import And
            find_query = Order.find(And(*query_conditions))
        else:
            find_query = Order.find()

        total = await find_query.count()
        orders = await find_query.sort(-Order.created_at).skip(skip).limit(limit).to_list()
        return orders, total


