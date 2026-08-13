from datetime import datetime
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field

from app.core.constants import Collections


class OrderItem(Document):
    order_id: Indexed(PydanticObjectId)
    product_id: Indexed(PydanticObjectId)
    quantity: int = Field(..., ge=1)
    price: float = Field(..., gt=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "active"

    class Settings:
        name = Collections.ORDER_ITEMS

    async def update_timestamp(self) -> None:
        self.updated_at = datetime.utcnow()
        await self.save()
