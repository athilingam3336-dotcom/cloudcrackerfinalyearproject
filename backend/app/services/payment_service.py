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
    UpiOrderCreateRequest,
    UpiOrderCreateResponse,
    UpiPaymentVerifyAdminRequest,
)
import urllib.parse
import base64
import io
import qrcode
from app.services.email_service import EmailService

logger = logging.getLogger(__name__)


class PaymentService:
    def __init__(self) -> None:
        self.payment_repo = PaymentRepository()
        self.order_repo = OrderRepository()
        self.cart_repo = CartRepository()
        self.product_repo = ProductRepository()

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

    async def create_upi_payment_order(
        self, user_id: str, data: UpiOrderCreateRequest
    ) -> UpiOrderCreateResponse:
        """
        Creates an Order and Payment in Pending state for UPI QR.
        Calculates all financial amounts strictly server-side.
        Inventory deduction is deferred until admin verification.
        Generates dynamic UPI URI and QR code, sends email, and returns them.
        """
        # 1. Load user cart from MongoDB
        cart_items = await self.cart_repo.list_user_cart(user_id)
        if not cart_items:
            raise ValidationException(message="Your cart is empty.")

        # 2. Validate products
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
        order_number = f"CC-{date_str}-{rand_suffix}"

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
            "payment_method": "UPI_QR",
            "payment_status": "Pending",
            "order_status": "Pending",
            "shipping_address": shipping_addr,
            "status": "active",
        }
        order = await self.order_repo.create_order(order_data)

        # 6. Create Order Items (Stock deduction is deferred to verification)
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

        # 7. Create Payment Record
        transaction_id = f"TXN-UPI-{order.order_number}"
        payment_data = {
            "order_id": order.id,
            "user_id": user_id,
            "payment_method": "UPI_QR",
            "payment_status": "Pending",
            "transaction_id": transaction_id,
            "gateway": "UPI",
            "amount": order.total,
            "currency": "INR",
            "payment_created_at": datetime.utcnow(),
            "status": "active",
        }
        payment = await self.payment_repo.create_payment(payment_data)

        # 8. Generate UPI URI and QR Code
        upi_id = settings.UPI_PAYMENT_ID or "cloudcrackers@upi"
        payee_name = settings.UPI_PAYEE_NAME or "CloudCrackers"
        
        # Ensure proper exact amount to 2 decimal places
        exact_amount = f"{order.total:.2f}"
        
        upi_params = {
            "pa": upi_id,
            "pn": payee_name,
            "am": exact_amount,
            "cu": "INR",
            "tn": order_number
        }
        
        query_string = urllib.parse.urlencode(upi_params, safe='@')
        upi_uri = f"upi://pay?{query_string}"
        
        # Generate QR code base64
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(upi_uri)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        qr_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
        qr_data_uri = f"data:image/png;base64,{qr_base64}"
        
        # 9. Send Email
        from app.models.user import User
        user = await User.get(user_id)
        if user and user.email:
            try:
                await EmailService.send_upi_payment_email(
                    to_email=user.email,
                    order_number=order.order_number,
                    amount=exact_amount,
                    upi_id=upi_id,
                    qr_base64=qr_base64,
                    items=products_to_order,
                    shipping=shipping,
                    tax=tax,
                    subtotal=subtotal
                )
            except Exception as e:
                logger.error(f"Failed to send UPI payment email for order {order.order_number}: {e}")

        logger.info(
            f"Created UPI payment order: order_number={order.order_number}, total={order.total}"
        )

        return UpiOrderCreateResponse(
            order_id=str(order.id),
            order_number=order.order_number,
            payment_id=str(payment.id),
            amount=order.total,
            currency="INR",
            upi_uri=upi_uri,
            qr_code_base64=qr_data_uri,
            subtotal=order.subtotal,
            discount=order.discount,
            coupon_discount=order.coupon_discount,
            shipping=order.shipping,
            tax=order.tax,
            total=order.total,
        )

    async def verify_upi_payment_admin(
        self,
        admin_id: str,
        payment_id: str,
        data: UpiPaymentVerifyAdminRequest,
    ) -> Dict[str, Any]:
        """
        Admin manually verifies a pending UPI payment using a UTR reference.
        Upon valid verification:
          1. Idempotently marks payment as Verified and order as Confirmed.
          2. Finalizes inventory deduction.
          3. Increments coupon usage count.
          4. Clears customer cart.
        """
        payment = await self.payment_repo.get_by_id(payment_id)
        if not payment:
            raise NotFoundException(message="Payment not found.")

        order = await self.order_repo.get_by_id(str(payment.order_id))
        if not order:
            raise NotFoundException(message="No order associated with this payment.")

        # Idempotency check
        if payment.payment_status == "Verified" or order.payment_status == "Paid":
            raise ValidationException(message="Payment has already been verified.")
            
        if payment.payment_status != "Pending":
            raise ValidationException(message=f"Cannot verify a payment in {payment.payment_status} state.")

        # Finalize Inventory Deduction
        order_items = await self.order_repo.get_order_items(str(order.id))
        for item in order_items:
            product = await self.product_repo.get_by_id(str(item.product_id))
            if product:
                if product.stock < item.quantity:
                    raise ValidationException(message=f"Insufficient stock for '{product.name}' to confirm order.")
                new_stock = max(0, product.stock - item.quantity)
                await self.product_repo.update(product, {"stock": new_stock})

        # Update Coupon Usage
        if order.coupon_code:
            coupon = await Coupon.find_one(Coupon.coupon_code == order.coupon_code)
            if coupon:
                coupon.used_count += 1
                coupon.updated_at = datetime.utcnow()
                await coupon.save()

        # Clear User Cart
        await self.cart_repo.clear_user_cart(str(order.user_id))

        completed_time = datetime.utcnow()
        
        # Update Payment
        await self.payment_repo.update_status(
            payment,
            {
                "payment_status": "Verified",
                "transaction_reference": data.transaction_reference,
                "verified_by": admin_id,
                "verified_at": completed_time,
                "payment_completed_at": completed_time,
                "payment_date": completed_time,
            },
        )

        # Update Order
        await self.order_repo.update(
            order,
            {
                "payment_status": "Paid",
                "order_status": "Confirmed",
            },
        )
        
        logger.info(
            f"UPI payment verification SUCCESS for order {order.order_number}, UTR={data.transaction_reference}, Admin={admin_id}"
        )

        formatted_order = await self._format_order_response(order)
        return {
            "order": formatted_order,
            "payment": PaymentResponse.convert_id(payment),
            "already_processed": False,
        }

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

