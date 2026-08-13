from datetime import datetime
from typing import Any, Dict, List, Optional
from beanie import PydanticObjectId

from app.models.payment import Payment


class PaymentRepository:
    async def create_payment(self, payment_data: Dict[str, Any]) -> Payment:
        """Create and insert a new Payment document."""
        payment = Payment(**payment_data)
        await payment.insert()
        return payment

    async def get_by_id(self, payment_id: str) -> Optional[Payment]:
        """Fetch payment by its primary database ID."""
        try:
            pid = PydanticObjectId(payment_id)
        except Exception:
            return None
        return await Payment.get(pid)

    async def get_by_order(self, order_id: str) -> Optional[Payment]:
        """Fetch payment record associated with an order ID."""
        try:
            oid = PydanticObjectId(order_id)
        except Exception:
            return None
        return await Payment.find_one(Payment.order_id == oid)

    async def get_by_transaction(self, transaction_id: str) -> Optional[Payment]:
        """Fetch payment record associated with a unique transaction ID."""
        return await Payment.find_one(Payment.transaction_id == transaction_id)

    async def get_by_razorpay_order(self, razorpay_order_id: str) -> Optional[Payment]:
        """Fetch payment record associated with a Razorpay Order ID."""
        return await Payment.find_one(Payment.razorpay_order_id == razorpay_order_id)

    async def get_by_razorpay_payment(self, razorpay_payment_id: str) -> Optional[Payment]:
        """Fetch payment record associated with a Razorpay Payment ID."""
        return await Payment.find_one(Payment.razorpay_payment_id == razorpay_payment_id)

    async def get_payment_history(self, user_id: Optional[str] = None) -> List[Payment]:
        """List payment history. Admin retrieves all, Customer retrieves their own."""
        if user_id:
            try:
                uid = PydanticObjectId(user_id)
                return await Payment.find(Payment.user_id == uid).sort(-Payment.created_at).to_list()
            except Exception:
                return []
        return await Payment.find_all().sort(-Payment.created_at).to_list()

    async def update_status(
        self, payment: Payment, update_data: Dict[str, Any]
    ) -> Payment:
        """Update payment fields (status, verification, responses) and save."""
        for key, value in update_data.items():
            setattr(payment, key, value)
        payment.updated_at = datetime.utcnow()
        await payment.save()
        return payment
