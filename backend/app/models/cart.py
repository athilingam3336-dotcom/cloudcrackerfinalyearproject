from datetime import datetime
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field

from app.core.constants import Collections


class Cart(Document):
    user_id: Indexed(PydanticObjectId)
    product_id: Indexed(PydanticObjectId)
    quantity: int = Field(..., ge=1)
    unit_price: float = Field(..., gt=0)
    total_price: float = Field(..., gt=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "active"

    class Settings:
        name = Collections.CART

    async def update_timestamp(self) -> None:
        self.updated_at = datetime.utcnow()
        await self.save()
