from datetime import datetime
import json
import logging
import random
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.exceptions import (
    BaseAppException,
    NotFoundException,
    ValidationException,
)
from app.models.coupon import Coupon
from app.models.order import Order
from app.models.payment import Payment
from app.repositories.cart_repository import CartRepository
from app.repositories.order_repository import OrderRepository
from app.repositories.payment_repository import PaymentRepository
from app.repositories.product_repository import ProductRepository
from app.schemas.order import OrderItemResponse, OrderResponse
from app.schemas.payment import (
    PaymentCreateRequest,
    PaymentResponse,
    PaymentVerifyRequest,
    RazorpayOrderCreateRequest,
    RazorpayOrderCreateResponse,
    RazorpayPaymentVerifyRequest,
)
from app.services.razorpay_service import RazorpayService

logger = logging.getLogger(__name__)


class PaymentService:
    def __init__(self) -> None:
        self.payment_repo = PaymentRepository()
        self.order_repo = OrderRepository()
        self.cart_repo = CartRepository()
        self.product_repo = ProductRepository()
        self.razorpay_service = RazorpayService()

    async def create_payment(self, user_id: str, data: PaymentCreateRequest) -> Payment:
        """Initiates a payment for an order. Generates mock transaction ID, validates amounts, and blocks duplicates."""
        order = await self.order_repo.get_by_id(data.order_id)
        if not order:
            raise NotFoundException(message="Order not found.")

        # Ownership validation
        if str(order.user_id) != user_id:
            raise BaseAppException(
                status_code=403,
                message="You do not have permission to pay for this order.",
            )

        # Order state validation
        if order.order_status == "Cancelled":
            raise ValidationException(message="Cannot pay for a cancelled order.")

        # Amount validation
        if abs(data.amount - order.total) > 0.01:
            raise ValidationException(
                message=f"Payment amount '{data.amount}' does not match order total '{order.total}'."
            )

        # Duplicate payment check
        existing = await self.payment_repo.get_by_order(data.order_id)
        if existing:
            if existing.payment_status in ["Success", "Paid"]:
                raise ValidationException(message="This order is already paid.")
            if existing.payment_status == "Pending":
                raise ValidationException(
                    message="A pending payment record already exists for this order."
                )

        # Generate unique transaction ID
        date_str = datetime.utcnow().strftime("%Y%m%d")
        rand_num = random.randint(10000000, 99999999)
        transaction_id = f"TXN-{date_str}-{rand_num}"

        payment_data = {
            "order_id": order.id,
            "user_id": user_id,
            "payment_method": data.payment_method,
            "payment_status": "Pending",
            "transaction_id": transaction_id,
            "gateway": data.gateway,
            "amount": data.amount,
            "currency": data.currency,
            "payment_created_at": datetime.utcnow(),
            "status": "active",
        }

        if data.payment_method == "COD":
            payment_data["gateway_response"] = {"info": "Cash on delivery"}

        return await self.payment_repo.create_payment(payment_data)

    async def verify_payment(
        self, user_id: str, data: PaymentVerifyRequest, is_admin: bool = False
    ) -> Payment:
        """Verifies a payment transaction status (Generic / Mock). Syncs successful payments to orders."""
        payment = await self.payment_repo.get_by_transaction(data.transaction_id)
        if not payment:
            raise NotFoundException(message="Payment transaction record not found.")

        # Security check
        if not is_admin and str(payment.user_id) != user_id:
            raise BaseAppException(
                status_code=403,
                message="You do not have permission to verify this payment.",
            )

        if payment.payment_status in ["Success", "Paid"]:
            return payment

        update_dict = {}
        if data.verification_status == "Success":
            update_dict["payment_status"] = "Success"
            update_dict["payment_date"] = datetime.utcnow()
            update_dict["payment_completed_at"] = datetime.utcnow()
            update_dict["gateway_response"] = data.gateway_response or {
                "status": "Success",
                "message": "Transaction verified successfully",
            }
            # Synchronize status to Order
            order = await self.order_repo.get_by_id(str(payment.order_id))
            if order:
                await self.order_repo.update(
                    order, {"payment_status": "Paid", "order_status": "Confirmed"}
                )

        else:  # "Failed"
            update_dict["payment_status"] = "Failed"
            update_dict["failure_reason"] = data.failure_reason or "Payment failed at gateway."
            update_dict["gateway_response"] = data.gateway_response or {
                "status": "Failed",
                "message": "Gateway reported failed status",
            }
            order = await self.order_repo.get_by_id(str(payment.order_id))
            if order:
                await self.order_repo.update(order, {"payment_status": "Failed"})

        return await self.payment_repo.update_status(payment, update_dict)

    async def create_razorpay_payment_order(
        self, user_id: str, data: RazorpayOrderCreateRequest
    ) -> RazorpayOrderCreateResponse:
        """
        Creates a Razorpay Test Order and registers a pending CloudCrackers Order and Payment.
        Calculates all financial amounts strictly server-side from active MongoDB records.
        Inventory deduction and cart clearing are deferred until payment verification.
        """
        order: Optional[Order] = None

        if data.order_id:
            order = await self.order_repo.get_by_id(data.order_id)
            if not order:
                raise NotFoundException(message="Order not found.")
            if str(order.user_id) != user_id:
                raise BaseAppException(
                    status_code=403,
                    message="You do not have permission to pay for this order.",
                )
            if order.order_status == "Cancelled":
                raise ValidationException(message="Cannot pay for a cancelled order.")
            if order.payment_status in ["Paid", "Success"]:
                raise ValidationException(message="This order is already paid.")
        else:
            # 1. Load user cart from MongoDB
            cart_items = await self.cart_repo.list_user_cart(user_id)
            if not cart_items:
                raise ValidationException(message="Your cart is empty.")

            # 2. Validate products and inventory
            products_to_order = []
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

                products_to_order.append((product, item.quantity))
                subtotal += item.quantity * product.price
                discount_diff = 0.0
                if product.discount_price is not None:
                    discount_diff = product.price - product.discount_price
                total_discount += item.quantity * discount_diff
                grand_total += item.total_price

            # 3. Validate and apply coupon if provided
            applied_coupon_code = None
            coupon_discount_val = 0.0
            if data.coupon_code and data.coupon_code.strip():
                from app.schemas.coupon import CouponValidateRequest
                from app.services.coupon_service import CouponService

                coupon_service = CouponService()
                coupon_res = await coupon_service.validate_coupon(
                    CouponValidateRequest(
                        coupon_code=data.coupon_code.strip(),
                        order_total=round(subtotal, 2),
                    )
                )
                applied_coupon_code = coupon_res.coupon_code
                coupon_discount_val = coupon_res.discount_amount
                grand_total = max(0.0, grand_total - coupon_discount_val)

            # 4. Calculate shipping and tax
            shipping = 250.0 if data.delivery_method == "express" else (0.0 if grand_total > 1000.0 else 99.0)
            if grand_total == 0:
                shipping = 0.0

            tax = round(0.05 * grand_total, 2)
            total = round(grand_total + shipping + tax, 2)

            # 5. Create CloudCrackers Order in Pending status
            date_str = datetime.utcnow().strftime("%Y%m%d")
            rand_suffix = random.randint(100000, 999999)
            order_number = f"ORD-{date_str}-{rand_suffix}"

            shipping_addr = data.shipping_address or "Customer Default Address"

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
                "payment_method": "Razorpay",
                "payment_status": "Pending",
                "order_status": "Pending",
                "shipping_address": shipping_addr,
                "status": "active",
            }
            order = await self.order_repo.create_order(order_data)

            # 6. Create Order Items (Stock deduction is deferred to verification!)
            for product, quantity in products_to_order:
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
                await self.order_repo.create_order_item(item_data)

        # 7. Create Razorpay Test Order
        rzp_notes = {
            "order_id": str(order.id),
            "order_number": order.order_number,
            "user_id": user_id,
        }
        rzp_order = self.razorpay_service.create_razorpay_order(
            amount=order.total,
            currency="INR",
            receipt=order.order_number,
            notes=rzp_notes,
        )

        razorpay_order_id = rzp_order["id"]

        # 8. Update Order with Razorpay order ID
        await self.order_repo.update(
            order,
            {
                "razorpay_order_id": razorpay_order_id,
                "payment_method": "Razorpay",
            },
        )

        # 9. Create / Update Payment Record
        existing_payment = await self.payment_repo.get_by_order(str(order.id))
        if existing_payment:
            await self.payment_repo.update_status(
                existing_payment,
                {
                    "razorpay_order_id": razorpay_order_id,
                    "payment_status": "Pending",
                    "amount": order.total,
                    "currency": "INR",
                    "gateway": "Razorpay",
                    "payment_method": "Razorpay",
                    "payment_created_at": datetime.utcnow(),
                },
            )
        else:
            transaction_id = f"TXN-RZP-{order.order_number}"
            payment_data = {
                "order_id": order.id,
                "user_id": user_id,
                "payment_method": "Razorpay",
                "payment_status": "Pending",
                "transaction_id": transaction_id,
                "gateway": "Razorpay",
                "amount": order.total,
                "currency": "INR",
                "razorpay_order_id": razorpay_order_id,
                "payment_created_at": datetime.utcnow(),
                "status": "active",
            }
            await self.payment_repo.create_payment(payment_data)

        return RazorpayOrderCreateResponse(
            razorpay_order_id=razorpay_order_id,
            razorpay_key_id=settings.RAZORPAY_KEY_ID or "",
            amount=int(round(order.total * 100)),
            currency="INR",
            order_id=str(order.id),
            order_number=order.order_number,
            subtotal=order.subtotal,
            discount=order.discount,
            coupon_discount=order.coupon_discount,
            shipping=order.shipping,
            tax=order.tax,
            total=order.total,
        )

    async def verify_razorpay_payment(
        self,
        user_id: str,
        data: RazorpayPaymentVerifyRequest,
        is_admin: bool = False,
    ) -> Dict[str, Any]:
        """
        Verifies Razorpay payment signature using HMAC SHA256 and RAZORPAY_KEY_SECRET.
        Upon valid signature:
          1. Idempotently marks payment as Success and order as Paid & Confirmed.
          2. Finalizes inventory deduction.
          3. Increments coupon usage count.
          4. Clears customer cart.
        """
        # 1. Verify Razorpay HMAC-SHA256 signature
        is_valid = self.razorpay_service.verify_payment_signature(
            razorpay_order_id=data.razorpay_order_id,
            razorpay_payment_id=data.razorpay_payment_id,
            razorpay_signature=data.razorpay_signature,
        )

        # Retrieve Payment and Order records
        payment = await self.payment_repo.get_by_razorpay_order(data.razorpay_order_id)
        order: Optional[Order] = None

        if payment:
            order = await self.order_repo.get_by_id(str(payment.order_id))
        else:
            from beanie import PydanticObjectId
            order = await Order.find_one(Order.razorpay_order_id == data.razorpay_order_id)
            if order:
                payment = await self.payment_repo.get_by_order(str(order.id))

        if not order:
            raise NotFoundException(message="No order associated with this Razorpay order ID.")

        # Permission check
        if not is_admin and str(order.user_id) != user_id:
            raise BaseAppException(
                status_code=403,
                message="You do not have permission to verify payment for this order.",
            )

        if not is_valid:
            # Mark payment and order as Failed
            if payment:
                await self.payment_repo.update_status(
                    payment,
                    {
                        "payment_status": "Failed",
                        "failure_reason": "Invalid Razorpay payment signature",
                        "razorpay_payment_id": data.razorpay_payment_id,
                        "razorpay_signature": data.razorpay_signature,
                    },
                )
            await self.order_repo.update(order, {"payment_status": "Failed"})
            raise ValidationException(
                message="Invalid Razorpay payment signature. Payment verification failed."
            )

        # 2. Idempotency check: If already paid, return early safely
        if order.payment_status == "Paid" and payment and payment.payment_status == "Success":
            formatted_order = await self._format_order_response(order)
            return {
                "order": formatted_order,
                "payment": PaymentResponse.convert_id(payment),
                "already_processed": True,
            }

        # 3. Finalize Inventory Deduction
        order_items = await self.order_repo.get_order_items(str(order.id))
        for item in order_items:
            product = await self.product_repo.get_by_id(str(item.product_id))
            if product:
                new_stock = max(0, product.stock - item.quantity)
                await self.product_repo.update(product, {"stock": new_stock})

        # 4. Update Coupon Usage Consistency
        if order.coupon_code:
            coupon = await Coupon.find_one(Coupon.coupon_code == order.coupon_code)
            if coupon:
                coupon.used_count += 1
                coupon.updated_at = datetime.utcnow()
                await coupon.save()

        # 5. Clear User Cart
        await self.cart_repo.clear_user_cart(str(order.user_id))

        # 6. Update Payment Document
        completed_time = datetime.utcnow()
        if payment:
            await self.payment_repo.update_status(
                payment,
                {
                    "payment_status": "Success",
                    "razorpay_payment_id": data.razorpay_payment_id,
                    "razorpay_signature": data.razorpay_signature,
                    "payment_completed_at": completed_time,
                    "payment_date": completed_time,
                    "gateway_response": {
                        "razorpay_order_id": data.razorpay_order_id,
                        "razorpay_payment_id": data.razorpay_payment_id,
                        "razorpay_signature": data.razorpay_signature,
                        "status": "captured",
                    },
                },
            )
        else:
            transaction_id = f"TXN-RZP-{order.order_number}"
            payment_data = {
                "order_id": order.id,
                "user_id": order.user_id,
                "payment_method": "Razorpay",
                "payment_status": "Success",
                "transaction_id": transaction_id,
                "gateway": "Razorpay",
                "amount": order.total,
                "currency": "INR",
                "razorpay_order_id": data.razorpay_order_id,
                "razorpay_payment_id": data.razorpay_payment_id,
                "razorpay_signature": data.razorpay_signature,
                "payment_created_at": completed_time,
                "payment_completed_at": completed_time,
                "payment_date": completed_time,
                "gateway_response": {
                    "razorpay_order_id": data.razorpay_order_id,
                    "razorpay_payment_id": data.razorpay_payment_id,
                    "status": "captured",
                },
                "status": "active",
            }
            payment = await self.payment_repo.create_payment(payment_data)

        # 7. Update Order Document
        await self.order_repo.update(
            order,
            {
                "payment_status": "Paid",
                "order_status": "Confirmed",
                "razorpay_order_id": data.razorpay_order_id,
                "razorpay_payment_id": data.razorpay_payment_id,
                "razorpay_signature": data.razorpay_signature,
            },
        )

        formatted_order = await self._format_order_response(order)
        return {
            "order": formatted_order,
            "payment": PaymentResponse.convert_id(payment),
            "already_processed": False,
        }

    async def handle_razorpay_webhook(
        self, raw_body: bytes, signature: Optional[str]
    ) -> Dict[str, Any]:
        """
        Handles incoming Razorpay Webhooks idempotently.
        Verifies HMAC signature with RAZORPAY_WEBHOOK_SECRET.
        """
        if not signature:
            raise ValidationException(message="Missing Razorpay webhook signature header.")

        is_valid = self.razorpay_service.verify_webhook_signature(
            body=raw_body, signature=signature
        )
        if not is_valid:
            raise ValidationException(message="Invalid Razorpay webhook signature.")

        try:
            event_data = json.loads(raw_body.decode("utf-8"))
        except Exception:
            raise ValidationException(message="Invalid JSON payload in webhook.")

        event = event_data.get("event", "")
        logger.info("Processing Razorpay webhook event: %s", event)

        payload_payment = (
            event_data.get("payload", {}).get("payment", {}).get("entity", {})
        )
        rzp_order_id = payload_payment.get("order_id")
        rzp_payment_id = payload_payment.get("id")

        if not rzp_order_id:
            return {"status": "ignored", "event": event, "message": "No order_id found"}

        payment = await self.payment_repo.get_by_razorpay_order(rzp_order_id)
        order: Optional[Order] = None
        if payment:
            order = await self.order_repo.get_by_id(str(payment.order_id))
        else:
            order = await Order.find_one(Order.razorpay_order_id == rzp_order_id)
            if order:
                payment = await self.payment_repo.get_by_order(str(order.id))

        if not order:
            return {"status": "not_found", "event": event, "order_id": rzp_order_id}

        if event in ["payment.captured", "order.paid"]:
            if order.payment_status != "Paid":
                # Finalize stock, coupon, cart, and statuses
                order_items = await self.order_repo.get_order_items(str(order.id))
                for item in order_items:
                    product = await self.product_repo.get_by_id(str(item.product_id))
                    if product:
                        new_stock = max(0, product.stock - item.quantity)
                        await self.product_repo.update(product, {"stock": new_stock})

                if order.coupon_code:
                    coupon = await Coupon.find_one(Coupon.coupon_code == order.coupon_code)
                    if coupon:
                        coupon.used_count += 1
                        await coupon.save()

                await self.cart_repo.clear_user_cart(str(order.user_id))

                completed_time = datetime.utcnow()
                if payment:
                    await self.payment_repo.update_status(
                        payment,
                        {
                            "payment_status": "Success",
                            "razorpay_payment_id": rzp_payment_id,
                            "payment_completed_at": completed_time,
                            "payment_date": completed_time,
                        },
                    )

                await self.order_repo.update(
                    order,
                    {
                        "payment_status": "Paid",
                        "order_status": "Confirmed",
                        "razorpay_payment_id": rzp_payment_id,
                    },
                )

        elif event == "payment.failed":
            if order.payment_status != "Paid":
                if payment:
                    await self.payment_repo.update_status(
                        payment,
                        {
                            "payment_status": "Failed",
                            "failure_reason": payload_payment.get(
                                "error_description", "Payment failed"
                            ),
                        },
                    )
                await self.order_repo.update(order, {"payment_status": "Failed"})

        return {"status": "processed", "event": event, "order_id": rzp_order_id}

    async def get_payment_details(
        self, user_id: str, payment_id: str, is_admin: bool = False
    ) -> Payment:
        """Fetches details of a payment by its database ID."""
        payment = await self.payment_repo.get_by_id(payment_id)
        if not payment:
            raise NotFoundException(message="Payment details not found.")

        if not is_admin and str(payment.user_id) != user_id:
            raise BaseAppException(
                status_code=403, message="You do not have permission to view this payment."
            )

        return payment

    async def get_payment_by_order(
        self, user_id: str, order_id: str, is_admin: bool = False
    ) -> Payment:
        """Fetches payment record details associated with a specific order ID."""
        payment = await self.payment_repo.get_by_order(order_id)
        if not payment:
            raise NotFoundException(message="No payment associated with this order.")

        if not is_admin and str(payment.user_id) != user_id:
            raise BaseAppException(
                status_code=403, message="You do not have permission to view this payment."
            )

        return payment

    async def get_payment_history(
        self, user_id: str, is_admin: bool = False
    ) -> List[Payment]:
        """Fetch payment history logs."""
        if is_admin:
            return await self.payment_repo.get_payment_history()
        return await self.payment_repo.get_payment_history(user_id=user_id)

    async def _format_order_response(self, order: Order) -> OrderResponse:
        items = await self.order_repo.get_order_items(str(order.id))
        items_out = []
        for item in items:
            product = await self.product_repo.get_by_id(str(item.product_id))
            item_resp = OrderItemResponse.convert_id(item)
            if product:
                from app.schemas.product import ProductResponse
                item_resp["product"] = ProductResponse.convert_id(product)
            items_out.append(OrderItemResponse(**item_resp))

        order_resp = OrderResponse.convert_id(order)
        order_resp["items"] = items_out
        try:
            from app.models.user import User
            user = await User.get(order.user_id)
            if user:
                order_resp["customer_name"] = user.full_name
                order_resp["customer_email"] = user.email
                order_resp["customer_phone"] = getattr(user, "phone", None)
        except Exception:
            pass
        return OrderResponse(**order_resp)

