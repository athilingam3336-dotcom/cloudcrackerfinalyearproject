from datetime import datetime
from typing import Optional
from beanie import Document, Indexed
from pydantic import Field

from app.core.constants import Collections


class Category(Document):
    name: Indexed(str, unique=True)
    description: str
    image_url: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    status: str = "active"  # "active" or "deleted"

    class Settings:
        name = Collections.CATEGORIES
        indexes = [
            [("status", 1), ("is_active", 1)],
        ]

    async def update_timestamp(self) -> None:
        self.updated_at = datetime.utcnow()
        await self.save()
