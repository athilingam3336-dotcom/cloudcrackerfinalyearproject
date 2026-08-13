from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field, model_validator


class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    description: str = Field(..., max_length=500)
    image_url: str = Field(..., max_length=500)


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=50)
    description: Optional[str] = Field(None, max_length=500)
    image_url: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None


class CategoryResponse(BaseModel):
    id: str
    name: str
    description: str
    image_url: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    status: str

    @model_validator(mode="before")
    @classmethod
    def convert_id(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "_id" in data:
                data["id"] = str(data["_id"])
            elif "id" in data:
                data["id"] = str(data["id"])
        elif hasattr(data, "id"):
            # Beanie document
            data_dict = data.model_dump()
            data_dict["id"] = str(data.id)
            return data_dict
        return data
