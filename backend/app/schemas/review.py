from datetime import datetime
from typing import Any, Dict, List, Optional
from bson import ObjectId
from pydantic import BaseModel, Field, field_validator, model_validator


class CreateReviewRequest(BaseModel):
    product_id: str
    rating: int = Field(..., ge=1, le=5)
    title: str = Field(..., min_length=2, max_length=150)
    review: str = Field(..., min_length=2, max_length=1000)
    images: List[str] = Field(default_factory=list)

    @field_validator("product_id")
    @classmethod
    def validate_product_id(cls, v: str) -> str:
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid product_id format. Must be a 24-character hex string.")
        return v


class UpdateReviewRequest(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    title: Optional[str] = Field(None, min_length=2, max_length=150)
    review: Optional[str] = Field(None, min_length=2, max_length=1000)
    images: Optional[List[str]] = None


class ReviewResponse(BaseModel):
    id: str
    user_id: str
    product_id: str
    order_id: Optional[str] = None
    rating: int
    title: str
    review: str
    images: List[str] = Field(default_factory=list)
    is_verified_purchase: bool
    likes: int
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="before")
    @classmethod
    def convert_id(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "_id" in data:
                data["id"] = str(data["_id"])
            elif "id" in data:
                data["id"] = str(data["id"])
            if "user_id" in data:
                data["user_id"] = str(data["user_id"])
            if "product_id" in data:
                data["product_id"] = str(data["product_id"])
            if "order_id" in data:
                data["order_id"] = str(data["order_id"]) if data["order_id"] else None
        elif hasattr(data, "id"):
            data_dict = data.model_dump()
            data_dict["id"] = str(data.id)
            data_dict["user_id"] = str(data.user_id)
            data_dict["product_id"] = str(data.product_id)
            data_dict["order_id"] = str(data.order_id) if data.order_id else None
            return data_dict
        return data


class ReviewSummaryResponse(BaseModel):
    average_rating: float
    total_reviews: int
    rating_breakdown: Dict[str, int]


class RatingStatisticsResponse(BaseModel):
    average_rating: float
    total_reviews: int
    rating_breakdown: Dict[str, int]
    verified_purchase_percentage: float


class AdminReviewResponse(BaseModel):
    id: str
    user_id: str
    product_id: str
    order_id: Optional[str] = None
    rating: int
    title: str
    review: str
    images: List[str] = Field(default_factory=list)
    is_verified_purchase: bool
    status: str
    likes: int
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="before")
    @classmethod
    def convert_id(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "_id" in data:
                data["id"] = str(data["_id"])
            elif "id" in data:
                data["id"] = str(data["id"])
            if "user_id" in data:
                data["user_id"] = str(data["user_id"])
            if "product_id" in data:
                data["product_id"] = str(data["product_id"])
            if "order_id" in data:
                data["order_id"] = str(data["order_id"]) if data["order_id"] else None
        elif hasattr(data, "id"):
            data_dict = data.model_dump()
            data_dict["id"] = str(data.id)
            data_dict["user_id"] = str(data.user_id)
            data_dict["product_id"] = str(data.product_id)
            data_dict["order_id"] = str(data.order_id) if data.order_id else None
            return data_dict
        return data
