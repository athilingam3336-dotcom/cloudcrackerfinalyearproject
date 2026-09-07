from datetime import datetime
from typing import Optional
from beanie import Document, Indexed
from pydantic import Field

from app.core.constants import Collections


class Coupon(Document):
    coupon_code: Indexed(str, unique=True)
    description: Optional[str] = None
    discount_type: str  # "percentage" or "fixed"
    percentage: Optional[float] = None
    fixed_amount: Optional[float] = None
    minimum_order: float = 0.0
    maximum_discount: Optional[float] = None
    start_date: Optional[datetime] = None
    expiry_date: datetime
    usage_limit: int = 1
    used_count: int = 0
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "active"  # "active" or "deleted"

    class Settings:
        name = Collections.COUPONS

    async def update_timestamp(self) -> None:
        self.updated_at = datetime.utcnow()
        await self.save()
