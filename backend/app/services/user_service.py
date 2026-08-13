from datetime import datetime
import math
from typing import Any, Dict, List, Optional
from beanie import PydanticObjectId

from app.exceptions import NotFoundException, ValidationException
from app.models.payment import Payment
from app.models.product import Product
from app.models.user import User
from app.repositories.order_repository import OrderRepository
from app.repositories.user_repository import UserRepository
from app.schemas.user import (
    AdminUserDetailResponseData,
    AdminUserListItem,
    AdminUserListResponseData,
    CustomerOrderDetailData,
    CustomerOrderItemData,
    UserOrdersResponseData,
    UserSummaryMetrics,
)


class UserService:
    def __init__(self) -> None:
        self.user_repo = UserRepository()
        self.order_repo = OrderRepository()

    def _validate_object_id(self, user_id: str) -> PydanticObjectId:
        try:
            return PydanticObjectId(user_id)
        except Exception:
            raise ValidationException(message=f"Invalid user ID format: '{user_id}'.")

    async def _format_customer_order(self, o: Any) -> CustomerOrderDetailData:
        items = await self.order_repo.get_order_items(str(o.id))
        items_list: List[CustomerOrderItemData] = []
        for item in items:
            prod = None
            try:
                prod = await Product.get(item.product_id)
            except Exception:
                pass

            prod_name = prod.name if prod else "Cracker Item"
            prod_img = None
            if prod and prod.images and len(prod.images) > 0:
                prod_img = prod.images[0]
            elif prod and getattr(prod, "image_url", None):
                prod_img = prod.image_url

            category_str = ""
            if prod and hasattr(prod, "category_id") and prod.category_id:
                category_str = str(prod.category_id)

            items_list.append(
                CustomerOrderItemData(
                    id=str(item.id),
                    product_id=str(item.product_id),
                    product_name=prod_name,
                    product_image=prod_img,
                    category=category_str,
                    quantity=item.quantity,
                    unit_price=item.price,
                    price=item.price,
                    subtotal=round(item.quantity * item.price, 2),
                    total=round(item.quantity * item.price, 2),
                )
            )

        # Check payment details for Razorpay info
        payment = await Payment.find_one(Payment.order_id == o.id)
        pay_completed_at = None
        if payment and payment.payment_completed_at:
            pay_completed_at = payment.payment_completed_at.isoformat()

        # Razorpay IDs (Requirement 10: pending payment must not show fake razorpay payment id)
        razorpay_order_id = getattr(o, "razorpay_order_id", None) or (payment.razorpay_order_id if payment else None)
        razorpay_payment_id = getattr(o, "razorpay_payment_id", None) or (payment.razorpay_payment_id if payment else None)
        if o.payment_status.lower() == "pending":
            if not razorpay_payment_id or razorpay_payment_id in ["null", "None", "fake_id", ""]:
                razorpay_payment_id = None

        return CustomerOrderDetailData(
            id=str(o.id),
            order_number=o.order_number,
            user_id=str(o.user_id),
            date=o.created_at.strftime("%b %d, %Y") if hasattr(o, "created_at") else "Recent",
            created_at=o.created_at.isoformat() if hasattr(o, "created_at") else "",
            order_status=o.order_status,
            payment_status=o.payment_status,
            payment_method=getattr(o, "payment_method", "Card"),
            subtotal=getattr(o, "subtotal", o.total),
            discount=getattr(o, "discount", 0.0),
            shipping=getattr(o, "shipping", 0.0),
            tax=getattr(o, "tax", 0.0),
            total=o.total,
            coupon_code=getattr(o, "coupon_code", None),
            coupon_discount=getattr(o, "coupon_discount", 0.0),
            shipping_address=getattr(o, "shipping_address", ""),
            item_count=len(items_list),
            razorpay_order_id=razorpay_order_id,
            razorpay_payment_id=razorpay_payment_id,
            payment_completed_at=pay_completed_at,
            items=items_list,
        )

    async def list_users_admin(
        self,
        page: int = 1,
        limit: int = 10,
        search: Optional[str] = None,
        role: Optional[str] = None,
        account_status: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> AdminUserListResponseData:
        """Fetches paginated user records with order metrics, search, filtering, and summary KPI counters."""
        if page < 1:
            page = 1
        if limit < 1:
            limit = 10
        skip = (page - 1) * limit

        users, total, raw_metrics = await self.user_repo.list_users_admin(
            search=search,
            role=role,
            account_status=account_status,
            sort_by=sort_by,
            sort_order=sort_order,
            skip=skip,
            limit=limit,
        )

        user_items: List[AdminUserListItem] = []
        for u in users:
            order_sum = await self.order_repo.get_user_order_summary(str(u.id))
            item_dict = u.model_dump()
            item_dict["id"] = str(u.id)
            item_dict["order_count"] = order_sum.get("total_orders", 0)
            item_dict["total_spent"] = order_sum.get("total_spent", 0.0)
            user_items.append(AdminUserListItem(**item_dict))

        metrics_obj = UserSummaryMetrics(**raw_metrics)

        total_pages = math.ceil(total / limit) if total > 0 else 1

        return AdminUserListResponseData(
            users=user_items,
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
            metrics=metrics_obj,
        )

    async def get_user_details_admin(self, user_id: str) -> AdminUserDetailResponseData:
        """Fetches detailed profile information, financial metrics, and recent order history for a single user."""
        self._validate_object_id(user_id)
        user = await self.user_repo.get_by_id(user_id)
        if not user or user.status == "deleted":
            raise NotFoundException(message=f"User with ID '{user_id}' not found.")

        order_sum = await self.order_repo.get_user_order_summary(user_id)
        orders = await self.order_repo.list_user_orders(user_id)

        recent_orders = []
        for o in orders[:5]:
            formatted_o = await self._format_customer_order(o)
            recent_orders.append(formatted_o.model_dump())

        user_dict = user.model_dump()
        user_dict["id"] = str(user.id)
        user_dict["order_summary"] = order_sum
        user_dict["recent_orders"] = recent_orders
        return AdminUserDetailResponseData(**user_dict)

    async def update_user_status(
        self,
        user_id: str,
        status: str,
        is_active: Optional[bool] = None,
        current_admin: Optional[User] = None,
    ) -> AdminUserDetailResponseData:
        """Updates user account status (active, inactive, blocked) with admin lockout protection."""
        self._validate_object_id(user_id)
        user = await self.user_repo.get_by_id(user_id)
        if not user or user.status == "deleted":
            raise NotFoundException(message=f"User with ID '{user_id}' not found.")

        norm_status = status.strip().lower()
        if norm_status not in ["active", "inactive", "blocked"]:
            raise ValidationException(
                message=f"Invalid account status '{status}'. Allowed values: active, inactive, blocked"
            )

        # Safety Check: If deactivating/blocking an admin, ensure there is at least one other active admin
        if user.role == "ADMIN" and norm_status in ["inactive", "blocked"]:
            admin_count = await self.user_repo.count_active_admins()
            if admin_count <= 1:
                raise ValidationException(
                    message="Cannot deactivate or block the only remaining administrator account."
                )

        update_fields: Dict[str, Any] = {"status": norm_status}
        if is_active is not None:
            update_fields["is_active"] = is_active
        else:
            update_fields["is_active"] = norm_status == "active"

        await self.user_repo.update(user, update_fields)
        return await self.get_user_details_admin(user_id)

    async def update_user_role(
        self,
        user_id: str,
        role: str,
        current_admin: Optional[User] = None,
    ) -> AdminUserDetailResponseData:
        """Updates user role (CUSTOMER, ADMIN) with last admin protection."""
        self._validate_object_id(user_id)
        user = await self.user_repo.get_by_id(user_id)
        if not user or user.status == "deleted":
            raise NotFoundException(message=f"User with ID '{user_id}' not found.")

        norm_role = role.strip().upper()
        if norm_role not in ["CUSTOMER", "ADMIN"]:
            raise ValidationException(
                message=f"Invalid role '{role}'. Allowed values: CUSTOMER, ADMIN"
            )

        # Safety Check: Demoting an admin
        if user.role == "ADMIN" and norm_role != "ADMIN":
            admin_count = await self.user_repo.count_active_admins()
            if admin_count <= 1:
                raise ValidationException(
                    message="Cannot demote the only remaining administrator account."
                )

        await self.user_repo.update(user, {"role": norm_role})
        return await self.get_user_details_admin(user_id)

    async def get_user_orders_admin(
        self,
        user_id: str,
        page: int = 1,
        limit: int = 10,
    ) -> UserOrdersResponseData:
        """Returns paginated customer order history with complete product line items, shipping address, and financial breakdown for admin review."""
        self._validate_object_id(user_id)
        user = await self.user_repo.get_by_id(user_id)
        if not user or user.status == "deleted":
            raise NotFoundException(message=f"User with ID '{user_id}' not found.")

        if page < 1:
            page = 1
        if limit < 1:
            limit = 10

        all_orders = await self.order_repo.list_user_orders(user_id)
        total = len(all_orders)
        start = (page - 1) * limit
        end = start + limit
        paginated_orders = all_orders[start:end]

        formatted_orders: List[CustomerOrderDetailData] = []
        for o in paginated_orders:
            formatted_o = await self._format_customer_order(o)
            formatted_orders.append(formatted_o)

        order_sum = await self.order_repo.get_user_order_summary(user_id)
        total_pages = math.ceil(total / limit) if total > 0 else 1

        return UserOrdersResponseData(
            orders=formatted_orders,
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
            order_summary=order_sum,
        )

    async def soft_delete_user(
        self,
        user_id: str,
        current_admin: Optional[User] = None,
    ) -> AdminUserDetailResponseData:
        """Performs safe account deactivation without breaking historical references."""
        self._validate_object_id(user_id)
        user = await self.user_repo.get_by_id(user_id)
        if not user or user.status == "deleted":
            raise NotFoundException(message=f"User with ID '{user_id}' not found.")

        # Safety Check: Prevent deleting the only active admin
        if user.role == "ADMIN":
            active_admins = await self.user_repo.count_active_admins()
            if active_admins <= 1:
                raise ValidationException(
                    message="Cannot delete or deactivate the only remaining administrator account."
                )

        update_data = {
            "status": "inactive",
            "is_active": False,
        }
        await self.user_repo.update(user, update_data)
        return await self.get_user_details_admin(user_id)
