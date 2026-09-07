from datetime import datetime
from typing import Any, Dict, Optional
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field

from app.core.constants import Collections


class Payment(Document):
    order_id: Indexed(PydanticObjectId)
    user_id: Indexed(PydanticObjectId)
    payment_method: str
    payment_status: str = "Pending"  # "Pending", "Success", "Failed"
    transaction_id: Indexed(str, unique=True)
    gateway: str  # "COD", "UPI", "Card", "Net Banking", "Wallet", "Mock"
    amount: float = Field(..., gt=0)
    currency: str = "USD"
    razorpay_order_id: Optional[Indexed(str)] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None
    payment_created_at: Optional[datetime] = None
    payment_completed_at: Optional[datetime] = None
    payment_date: Optional[datetime] = None
    gateway_response: Optional[Dict[str, Any]] = None
    failure_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "active"

    class Settings:
        name = Collections.PAYMENTS

    async def update_timestamp(self) -> None:
        self.updated_at = datetime.utcnow()
        await self.save()
