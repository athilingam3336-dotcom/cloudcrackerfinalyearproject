from datetime import datetime
from typing import Optional
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field

from app.core.constants import Collections


class Notification(Document):
    user_id: Indexed(PydanticObjectId)
    title: str
    message: str
    type: Indexed(str) = "system"  # "order", "price", "promo", "system"
    tag: Optional[str] = None
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "active"

    class Settings:
        name = Collections.NOTIFICATIONS

    async def update_timestamp(self) -> None:
        self.updated_at = datetime.utcnow()
        await self.save()
