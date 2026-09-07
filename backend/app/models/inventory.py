from datetime import datetime
from typing import List, Optional
from beanie import Document, Indexed, PydanticObjectId
from pydantic import BaseModel, Field

from app.core.constants import Collections


class InventoryHistory(BaseModel):
    transaction_type: str  # "IN", "OUT", "ADJUST"
    quantity: int
    old_stock: int
    new_stock: int
    remarks: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Inventory(Document):
    product_id: Indexed(PydanticObjectId, unique=True)
    current_stock: int = 0
    minimum_stock: int = 5
    maximum_stock: int = 1000
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    history: List[InventoryHistory] = Field(default_factory=list)

    class Settings:
        name = Collections.INVENTORY

    async def update_timestamp(self) -> None:
        self.last_updated = datetime.utcnow()
        await self.save()
