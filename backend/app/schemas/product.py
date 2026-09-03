from datetime import datetime
from typing import Any, List, Optional
from bson import ObjectId
from pydantic import BaseModel, Field, field_validator, model_validator


class ProductCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    description: str = Field(..., max_length=2000)
    price: float = Field(..., gt=0)
    discount_price: Optional[float] = Field(None, gt=0)
    category_id: str
    stock: int = Field(..., ge=0)
    image_url: Optional[str] = None
    images: List[str] = Field(default_factory=list)
    is_featured: bool = False
    is_bestseller: bool = False
    is_flash_sale: bool = False
    flash_sale_hours: Optional[float] = 4.0
    is_recommended: bool = False
    time_of_day: Optional[str] = "both"

    @field_validator("category_id")
    @classmethod
    def validate_category_id(cls, v: str) -> str:
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid category_id format. Must be a 24-character hex string.")
        return v

    @model_validator(mode="after")
    def validate_discount_price(self) -> "ProductCreate":
        if self.discount_price is not None and self.discount_price >= self.price:
            raise ValueError("Discount price must be strictly less than original price.")
        return self


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    description: Optional[str] = Field(None, max_length=2000)
    price: Optional[float] = Field(None, gt=0)
    discount_price: Optional[float] = Field(None, gt=0)
    category_id: Optional[str] = None
    stock: Optional[int] = Field(None, ge=0)
    image_url: Optional[str] = None
    images: Optional[List[str]] = None
    is_featured: Optional[bool] = None
    is_bestseller: Optional[bool] = None
    is_flash_sale: Optional[bool] = None
    flash_sale_hours: Optional[float] = None
    is_recommended: Optional[bool] = None
    is_active: Optional[bool] = None
    time_of_day: Optional[str] = None

    @field_validator("category_id")
    @classmethod
    def validate_category_id(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not ObjectId.is_valid(v):
            raise ValueError("Invalid category_id format. Must be a 24-character hex string.")
        return v

    @model_validator(mode="after")
    def validate_discount_price(self) -> "ProductUpdate":
        if self.discount_price is not None and self.price is not None:
            if self.discount_price >= self.price:
                raise ValueError("Discount price must be strictly less than original price.")
        return self


class ProductResponse(BaseModel):
    id: str
    name: str
    title: Optional[str] = None
    description: str
    price: float
    original_price: Optional[float] = None
    discount_price: Optional[float] = None
    category_id: str
    stock: int
    image_url: Optional[str] = None
    images: List[str] = Field(default_factory=list)
    rating: float = 0.0
    reviews_count: int = 0
    average_rating: float = 0.0
    total_reviews: int = 0
    rating_breakdown: dict = Field(default_factory=dict)
    is_featured: bool = False
    is_bestseller: bool = False
    is_flash_sale: bool = False
    flash_sale_hours: Optional[float] = 4.0
    flash_sale_ends_at: Optional[datetime] = None
    ends_in_seconds: Optional[int] = None
    is_recommended: bool = False
    is_active: bool = True
    time_of_day: Optional[str] = "both"
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="before")
    @classmethod
    def convert_id(cls, data: Any) -> Any:
        if isinstance(data, dict):
            dict_data = dict(data)
            if "_id" in dict_data:
                dict_data["id"] = str(dict_data["_id"])
            elif "id" in dict_data:
                dict_data["id"] = str(dict_data["id"])
            if "category_id" in dict_data:
                dict_data["category_id"] = str(dict_data["category_id"])
            if "name" in dict_data and not dict_data.get("title"):
                dict_data["title"] = dict_data["name"]
            if "price" in dict_data and not dict_data.get("original_price"):
                dict_data["original_price"] = dict_data["price"]
            if not dict_data.get("image_url") and dict_data.get("images"):
                dict_data["image_url"] = dict_data["images"][0]
            elif dict_data.get("image_url") and not dict_data.get("images"):
                dict_data["images"] = [dict_data["image_url"]]
            
            # Compute ends_in_seconds for flash sales
            hours = float(dict_data.get("flash_sale_hours") or 4.0)
            dict_data["flash_sale_hours"] = hours
            ends_at = dict_data.get("flash_sale_ends_at")
            if ends_at:
                if isinstance(ends_at, str):
                    try:
                        ends_at = datetime.fromisoformat(ends_at.replace("Z", "+00:00"))
                    except Exception:
                        ends_at = None
                if isinstance(ends_at, datetime):
                    now_utc = datetime.utcnow()
                    ends_naive = ends_at.replace(tzinfo=None) if ends_at.tzinfo else ends_at
                    dict_data["ends_in_seconds"] = max(0, int((ends_naive - now_utc).total_seconds()))
                else:
                    dict_data["ends_in_seconds"] = int(hours * 3600)
            else:
                dict_data["ends_in_seconds"] = int(hours * 3600)
            return dict_data
        elif hasattr(data, "id"):
            # Beanie document
            data_dict = data.model_dump()
            data_dict["id"] = str(data.id)
            data_dict["category_id"] = str(data.category_id)
            data_dict["title"] = data.name
            data_dict["original_price"] = data.price
            img_url = getattr(data, "image_url", None) or (data.images[0] if getattr(data, "images", None) else None)
            data_dict["image_url"] = img_url
            if img_url and not data_dict.get("images"):
                data_dict["images"] = [img_url]

            hours = float(data_dict.get("flash_sale_hours") or 4.0)
            data_dict["flash_sale_hours"] = hours
            ends_at = getattr(data, "flash_sale_ends_at", None)
            if ends_at:
                if isinstance(ends_at, str):
                    try:
                        ends_at = datetime.fromisoformat(ends_at.replace("Z", "+00:00"))
                    except Exception:
                        ends_at = None
                if isinstance(ends_at, datetime):
                    now_utc = datetime.utcnow()
                    ends_naive = ends_at.replace(tzinfo=None) if ends_at.tzinfo else ends_at
                    data_dict["ends_in_seconds"] = max(0, int((ends_naive - now_utc).total_seconds()))
                else:
                    data_dict["ends_in_seconds"] = int(hours * 3600)
            else:
                data_dict["ends_in_seconds"] = int(hours * 3600)
            return data_dict
        return data


class PaginationMeta(BaseModel):
    total: int
    page: int
    limit: int
    pages: int


class ProductListResponseData(BaseModel):
    products: List[ProductResponse]
    pagination: PaginationMeta
