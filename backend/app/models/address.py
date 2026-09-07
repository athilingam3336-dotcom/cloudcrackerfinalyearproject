from datetime import datetime
from typing import Optional
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field

from app.core.constants import Collections


class Address(Document):
    user_id: Indexed(PydanticObjectId)
    full_name: str
    phone: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    country: str
    postal_code: str
    landmark: Optional[str] = None
    address_type: str = "Home"  # "Home", "Office", "Other"
    is_default: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "active"  # "active" or "deleted"

    class Settings:
        name = Collections.ADDRESSES

    async def update_timestamp(self) -> None:
        self.updated_at = datetime.utcnow()
        await self.save()
