from datetime import datetime
from typing import Optional
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field

from app.core.constants import Collections


class Order(Document):
    order_number: Indexed(str, unique=True)
    user_id: Indexed(PydanticObjectId)
    subtotal: float
    discount: float
    coupon_code: Optional[str] = None
    coupon_discount: float = 0.0
    shipping: float
    tax: float
    total: float
    payment_method: str
    payment_status: str = "Pending"  # "Pending", "Paid", "Failed", "Refunded"
    order_status: str = "Pending"  # "Pending", "Confirmed", "Packed", "Shipped", "Delivered", "Cancelled"
    shipping_address: str
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "active"
    customer_deleted_at: Optional[datetime] = None
    admin_deleted_at: Optional[datetime] = None

    class Settings:
        name = Collections.ORDERS

    async def update_timestamp(self) -> None:
        self.updated_at = datetime.utcnow()
        await self.save()
