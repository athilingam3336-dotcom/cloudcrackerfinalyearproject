from datetime import datetime
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field

from app.core.constants import Collections


class Wishlist(Document):
    user_id: Indexed(PydanticObjectId)
    product_id: Indexed(PydanticObjectId)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "active"

    class Settings:
        name = Collections.WISHLIST

    async def update_timestamp(self) -> None:
        self.updated_at = datetime.utcnow()
        await self.save()
