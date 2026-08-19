from datetime import datetime
from typing import List, Optional
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field

from app.core.constants import Collections


class Product(Document):
    name: Indexed(str)
    description: str
    price: float
    discount_price: Optional[float] = None
    category_id: Indexed(PydanticObjectId)
    stock: int
    image_url: Optional[str] = None
    images: List[str] = Field(default_factory=list)
    rating: float = 0.0
    reviews_count: int = 0
    average_rating: float = 0.0
    total_reviews: int = 0
    rating_breakdown: dict = Field(default_factory=lambda: {"5": 0, "4": 0, "3": 0, "2": 0, "1": 0})
    is_featured: bool = False
    is_bestseller: bool = False
    is_flash_sale: bool = False
    is_recommended: bool = False
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    status: str = "active"  # "active" or "deleted"

    class Settings:
        name = Collections.PRODUCTS
        # Declare indexes for fields (specifically those that cannot use Indexed wrapper, like bool)
        indexes = [
            "is_featured",
            "is_bestseller",
        ]

    async def update_timestamp(self) -> None:
        self.updated_at = datetime.utcnow()
        await self.save()
