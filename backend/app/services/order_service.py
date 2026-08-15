from datetime import datetime
import random
from typing import List, Optional



from app.exceptions import NotFoundException, ValidationException
from app.models.order import Order
from app.repositories.cart_repository import CartRepository
from app.repositories.order_repository import OrderRepository
from app.repositories.product_repository import ProductRepository
from app.schemas.order import (
    AdminOrderListItem,
    AdminOrderListResponseData,
    CheckoutRequest,
    OrderItemResponse,
    OrderResponse,
    OrderSummaryResponse,
)
from app.schemas.product import ProductResponse


class OrderService:
    def __init__(self) -> None:
        self.order_repo = OrderRepository()
        self.cart_repo = CartRepository()
        self.product_repo = ProductRepository()

    async def checkout(self, user_id: str, data: CheckoutRequest) -> OrderResponse:
        """Executes checkout: stock checks, order creation, stock decriments, cart clear."""
        cart_items = await self.cart_repo.list_user_cart(user_id)
        if not cart_items:
            raise ValidationException(message="Your cart is empty.")

        # 1. Validate stocks and populate items info
        products_to_update = []
        subtotal = 0.0
        total_discount = 0.0
        grand_total = 0.0

        for item in cart_items:
            product = await self.product_repo.get_by_id(str(item.product_id))
            if not product or not product.is_active or product.status == "deleted":
                raise ValidationException(
                    message=f"Product with ID '{item.product_id}' is no longer available."
                )

            if item.quantity > product.stock:
                raise ValidationException(
                    message=f"Insufficient stock for '{product.name}'. Only {product.stock} available."
                )

            products_to_update.append((product, item.quantity))

            # Financial metrics
            subtotal += item.quantity * product.price
            discount_diff = 0.0
            if product.discount_price is not None:
                discount_diff = product.price - product.discount_price
            total_discount += item.quantity * discount_diff
            grand_total += item.total_price

        # Coupon application
        applied_coupon_code = None
        coupon_discount_val = 0.0
        if data.coupon_code and data.coupon_code.strip():
            from app.schemas.coupon import CouponValidateRequest
            from app.services.coupon_service import CouponService

            coupon_service = CouponService()
            coupon_res = await coupon_service.apply_coupon(
                CouponValidateRequest(
                    coupon_code=data.coupon_code.strip(), order_total=round(subtotal, 2)
                )
            )
            applied_coupon_code = coupon_res.coupon_code
            coupon_discount_val = coupon_res.discount_amount
            grand_total = max(0.0, grand_total - coupon_discount_val)

        # Calculate shipping and tax
        shipping = 10.0 if grand_total > 0 else 0.0
        # If order total exceeds 100, free shipping
        if grand_total > 100.0:
            shipping = 0.0

        tax = round(0.05 * grand_total, 2)
        total = round(grand_total + shipping + tax, 2)

        # 2. Generate unique order number
        # Format: ORD-YYYYMMDD-XXXXXX
        date_str = datetime.utcnow().strftime("%Y%m%d")
        rand_suffix = random.randint(100000, 999999)
        order_number = f"ORD-{date_str}-{rand_suffix}"

        # 3. Create Order Header
        order_data = {
            "order_number": order_number,
            "user_id": user_id,
            "subtotal": round(subtotal, 2),
            "discount": round(total_discount, 2),
            "coupon_code": applied_coupon_code,
            "coupon_discount": round(coupon_discount_val, 2),
            "shipping": round(shipping, 2),
            "tax": tax,
            "total": total,
            "payment_method": data.payment_method,
            "payment_status": "Pending",
            "order_status": "Pending",
            "shipping_address": data.shipping_address,
            "status": "active",
        }
        order = await self.order_repo.create_order(order_data)

        # 4. Create Order Items and Update Product Stocks
        order_items_out = []
        for product, quantity in products_to_update:
            unit_price = (
                product.discount_price
                if product.discount_price is not None
                else product.price
            )
            item_data = {
                "order_id": order.id,
                "product_id": product.id,
                "quantity": quantity,
                "price": unit_price,
                "status": "active",
            }
            order_item = await self.order_repo.create_order_item(item_data)

            # Update product stock in DB
            new_stock = product.stock - quantity
            await self.product_repo.update(product, {"stock": new_stock})

            # Format item response
            item_resp = OrderItemResponse.convert_id(order_item)
            item_resp["product"] = ProductResponse.convert_id(product)
            order_items_out.append(OrderItemResponse(**item_resp))

        # 5. Clear User Cart
        await self.cart_repo.clear_user_cart(user_id)

        # 6. Format order response
        order_resp = OrderResponse.convert_id(order)
        order_resp["items"] = order_items_out
        await self._populate_customer_info(order_resp, user_id)
        return OrderResponse(**order_resp)

    async def get_user_orders(self, user_id: str) -> List[OrderResponse]:
        """List all order history logs placed by a user."""
        orders = await self.order_repo.list_user_orders(user_id)
        responses = []
        for order in orders:
            items = await self.order_repo.get_order_items(str(order.id))
            items_out = []
            for item in items:
                product = await self.product_repo.get_by_id(str(item.product_id))
                item_resp = OrderItemResponse.convert_id(item)
                if product:
                    item_resp["product"] = ProductResponse.convert_id(product)
                items_out.append(OrderItemResponse(**item_resp))

            order_resp = OrderResponse.convert_id(order)
            order_resp["items"] = items_out
            await self._populate_customer_info(order_resp, order.user_id)
            responses.append(OrderResponse(**order_resp))
        return responses

    async def get_order_details(
        self, user_id: str, order_id: str, is_admin: bool = False
    ) -> OrderResponse:
        """Fetches complete details of a single order header with its line items."""
        order = await self.order_repo.get_by_id(order_id)
        if not order or (str(order.user_id) != user_id and not is_admin):
            raise NotFoundException(message="Order not found.")

        items = await self.order_repo.get_order_items(order_id)
        items_out = []
        for item in items:
            product = await self.product_repo.get_by_id(str(item.product_id))
            item_resp = OrderItemResponse.convert_id(item)
            if product:
                item_resp["product"] = ProductResponse.convert_id(product)
            items_out.append(OrderItemResponse(**item_resp))

        order_resp = OrderResponse.convert_id(order)
        order_resp["items"] = items_out
        await self._populate_customer_info(order_resp, order.user_id)
        return OrderResponse(**order_resp)

    async def cancel_order(self, user_id: str, order_id: str) -> OrderResponse:
        """Cancels a pending order, restoring item stock counts to products inventory."""
        order = await self.order_repo.get_by_id(order_id)
        if not order or str(order.user_id) != user_id:
            raise NotFoundException(message="Order not found.")

        if order.order_status != "Pending":
            raise ValidationException(
                message=f"Order cannot be cancelled because its status is '{order.order_status}'."
            )

        # 1. Update order status
        await self.order_repo.update(order, {"order_status": "Cancelled"})

        # 2. Recover product stock
        items = await self.order_repo.get_order_items(order_id)
        items_out = []
        for item in items:
            product = await self.product_repo.get_by_id(str(item.product_id))
            if product:
                new_stock = product.stock + item.quantity
                await self.product_repo.update(product, {"stock": new_stock})

            item_resp = OrderItemResponse.convert_id(item)
            if product:
                item_resp["product"] = ProductResponse.convert_id(product)
            items_out.append(OrderItemResponse(**item_resp))

        order_resp = OrderResponse.convert_id(order)
        order_resp["items"] = items_out
        await self._populate_customer_info(order_resp, order.user_id)
        return OrderResponse(**order_resp)

    async def get_order_summary(self, user_id: str) -> OrderSummaryResponse:
        """Fetches total Spent, orders count, pending counts, and completion metrics."""
        summary = await self.order_repo.get_user_order_summary(user_id)
        return OrderSummaryResponse(**summary)
    from typing import Any
    async def _populate_customer_info(self, order_dict: dict, user_id: Any) -> None:
        """Populates customer_name, customer_email, customer_phone from the User model."""
        try:
            from app.models.user import User
            user = await User.get(user_id)
            if user:
                order_dict["customer_name"] = user.full_name
                order_dict["customer_email"] = user.email
                order_dict["customer_phone"] = getattr(user, "phone", None)
        except Exception:
            pass

    async def _format_order_response(self, order: Order) -> OrderResponse:
        items = await self.order_repo.get_order_items(str(order.id))
        items_out = []
        for item in items:
            product = await self.product_repo.get_by_id(str(item.product_id))
            item_resp = OrderItemResponse.convert_id(item)
            if product:
                item_resp["product"] = ProductResponse.convert_id(product)
            items_out.append(OrderItemResponse(**item_resp))

        order_resp = OrderResponse.convert_id(order)
        order_resp["items"] = items_out
        await self._populate_customer_info(order_resp, order.user_id)
        return OrderResponse(**order_resp)


    async def list_admin_orders(
        self,
        search: Optional[str] = None,
        order_status: Optional[str] = None,
        payment_status: Optional[str] = None,
        page: int = 1,
        limit: int = 10,
    ) -> AdminOrderListResponseData:
        """Lists paginated orders for Admin Management with database-level search and status filtering."""
        skip = (page - 1) * limit
        orders, total = await self.order_repo.list_all_orders_admin(
            search=search,
            order_status=order_status,
            payment_status=payment_status,
            skip=skip,
            limit=limit,
        )

        from app.models.user import User
        formatted_orders: List[AdminOrderListItem] = []
        for order in orders:
            # Lookup user info if available
            customer_name = None
            customer_email = None
            try:
                user = await User.get(order.user_id)
                if user:
                    customer_name = user.full_name
                    customer_email = user.email
            except Exception:
                pass

            items = await self.order_repo.get_order_items(str(order.id))
            items_out = []
            for item in items:
                product = await self.product_repo.get_by_id(str(item.product_id))
                item_resp = OrderItemResponse.convert_id(item)
                if product:
                    item_resp["product"] = ProductResponse.convert_id(product)
                items_out.append(OrderItemResponse(**item_resp))

            formatted_orders.append(
                AdminOrderListItem(
                    id=str(order.id),
                    order_number=order.order_number,
                    user_id=str(order.user_id),
                    customer_name=customer_name,
                    customer_email=customer_email,
                    subtotal=order.subtotal,
                    discount=order.discount,
                    shipping=order.shipping,
                    tax=order.tax,
                    total=order.total,
                    payment_method=order.payment_method,
                    payment_status=order.payment_status,
                    order_status=order.order_status,
                    shipping_address=order.shipping_address,
                    razorpay_order_id=getattr(order, "razorpay_order_id", None),
                    razorpay_payment_id=getattr(order, "razorpay_payment_id", None),
                    item_count=len(items_out),
                    created_at=order.created_at,
                    updated_at=order.updated_at,
                    items=items_out,
                )
            )

        total_pages = (total + limit - 1) // limit if total > 0 else 1

        return AdminOrderListResponseData(
            orders=formatted_orders,
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
        )

    async def update_order_status_admin(
        self, order_id: str, new_status: str
    ) -> OrderResponse:
        """Admin updates order status with automatic stock recovery on cancellation."""
        valid_statuses = {"Pending", "Confirmed", "Packed", "Shipped", "Delivered", "Cancelled"}
        if new_status not in valid_statuses:
            raise ValidationException(
                message=f"Invalid order status '{new_status}'. Valid choices: {', '.join(sorted(valid_statuses))}."
            )

        order = await self.order_repo.get_by_id(order_id)
        if not order:
            raise NotFoundException(message="Order not found.")

        old_status = order.order_status
        if old_status != new_status:
            # If moving to Cancelled from an active order: restore product stock
            if new_status == "Cancelled" and old_status != "Cancelled":
                items = await self.order_repo.get_order_items(order_id)
                for item in items:
                    product = await self.product_repo.get_by_id(str(item.product_id))
                    if product:
                        new_stock = product.stock + item.quantity
                        await self.product_repo.update(product, {"stock": new_stock})

            # If moving from Cancelled back to an active state: reduce product stock (ensuring enough stock available)
            elif old_status == "Cancelled" and new_status != "Cancelled":
                items = await self.order_repo.get_order_items(order_id)
                for item in items:
                    product = await self.product_repo.get_by_id(str(item.product_id))
                    if product and product.stock < item.quantity:
                        raise ValidationException(
                            message=f"Cannot reinstate order: insufficient stock for '{product.name}'."
                        )
                for item in items:
                    product = await self.product_repo.get_by_id(str(item.product_id))
                    if product:
                        new_stock = max(0, product.stock - item.quantity)
                        await self.product_repo.update(product, {"stock": new_stock})

            await self.order_repo.update(order, {"order_status": new_status})

        return await self._format_order_response(order)

    async def update_payment_status_admin(
        self, order_id: str, new_payment_status: str
    ) -> OrderResponse:
        """Admin updates payment status on an order and syncs payment record."""
        valid_statuses = {"Pending", "Paid", "Failed", "Refunded"}
        if new_payment_status not in valid_statuses:
            raise ValidationException(
                message=f"Invalid payment status '{new_payment_status}'. Valid choices: {', '.join(sorted(valid_statuses))}."
            )

        order = await self.order_repo.get_by_id(order_id)
        if not order:
            raise NotFoundException(message="Order not found.")

        await self.order_repo.update(order, {"payment_status": new_payment_status})

        # Sync associated Payment document if exists
        try:
            from app.models.payment import Payment
            from beanie import PydanticObjectId
            payment = await Payment.find_one(Payment.order_id == PydanticObjectId(order_id))
            if payment:
                payment.payment_status = "Success" if new_payment_status == "Paid" else new_payment_status
                payment.updated_at = datetime.utcnow()
                await payment.save()
        except Exception:
            pass

        return await self._format_order_response(order)

    async def delete_order(self, order_id: str, user_id: str, user_role: str) -> None:
        """Soft delete an order for customer or admin. Order must be in a closed state (Delivered, Cancelled, or Refunded)."""
        from app.exceptions import ForbiddenException, BadRequestException
        order = await self.order_repo.get_by_id(order_id)
        if not order:
            raise NotFoundException(message="Order not found.")
            
        eligible_statuses = {"Delivered", "Cancelled"}
        is_eligible = (order.order_status in eligible_statuses) or (order.payment_status == "Refunded")
        
        if not is_eligible:
            raise BadRequestException(
                message="Order cannot be deleted because it is still active. Only Delivered, Cancelled, or Refunded orders can be deleted."
            )
            
        if user_role == "CUSTOMER":
            if str(order.user_id) != user_id:
                raise ForbiddenException(message="You can only delete your own orders.")
            order.customer_deleted_at = datetime.utcnow()
        elif user_role == "ADMIN":
            order.admin_deleted_at = datetime.utcnow()
        else:
            raise ForbiddenException(message="Unauthorized role for deletion.")
            
        await order.save()

