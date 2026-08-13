from datetime import datetime
from typing import Any, Optional
from bson import ObjectId
from pydantic import BaseModel, Field, field_validator, model_validator

from app.schemas.product import ProductResponse


class CartAddRequest(BaseModel):
    product_id: str
    quantity: int = Field(..., ge=1)

    @field_validator("product_id")
    @classmethod
    def validate_product_id(cls, v: str) -> str:
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid product_id format. Must be a 24-character hex string.")
        return v


class CartUpdateRequest(BaseModel):
    quantity: int = Field(..., ge=1)


class CartResponse(BaseModel):
    id: str
    user_id: str
    product_id: str
    quantity: int
    unit_price: float
    total_price: float
    created_at: datetime
    updated_at: datetime
    product: Optional[ProductResponse] = None

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
        elif hasattr(data, "id"):
            data_dict = data.model_dump()
            data_dict["id"] = str(data.id)
            data_dict["user_id"] = str(data.user_id)
            data_dict["product_id"] = str(data.product_id)
            return data_dict
        return data


class CartSummaryResponse(BaseModel):
    total_items: int
    subtotal: float
    total_discount: float
    grand_total: float
