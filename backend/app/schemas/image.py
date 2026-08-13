from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field, model_validator


class ImageMetadataResponse(BaseModel):
    id: str
    user_id: str
    public_id: str
    url: str
    secure_url: str
    resource_type: str
    format: str
    size: int
    width: int
    height: int
    folder: str
    created_at: datetime

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
        elif hasattr(data, "id"):
            data_dict = data.model_dump()
            data_dict["id"] = str(data.id)
            data_dict["user_id"] = str(data.user_id)
            return data_dict
        return data


class UploadImageResponse(BaseModel):
    image_id: str
    url: str
    secure_url: str
    public_id: str
    metadata: ImageMetadataResponse


class DeleteImageResponse(BaseModel):
    image_id: str
    result: str = "ok"
