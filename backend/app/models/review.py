from datetime import datetime
from typing import List, Optional
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field

from app.core.constants import Collections


class Review(Document):
    user_id: Indexed(PydanticObjectId)
    product_id: Indexed(PydanticObjectId)
    order_id: Optional[PydanticObjectId] = None
    rating: Indexed(int)  # 1-5
    title: str
    review: str
    images: List[str] = Field(default_factory=list)
    is_verified_purchase: bool = False
    status: Indexed(str) = "ACTIVE"  # "ACTIVE", "HIDDEN", "DELETED"
    likes: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = Collections.REVIEWS

    async def update_timestamp(self) -> None:
        self.updated_at = datetime.utcnow()
        await self.save()
