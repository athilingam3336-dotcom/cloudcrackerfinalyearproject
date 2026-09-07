from datetime import datetime
from typing import Any, List, Optional
from bson import ObjectId
from pydantic import BaseModel, Field, field_validator, model_validator


class CreateNotificationRequest(BaseModel):
    user_id: str
    title: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1, max_length=2000)
    type: str = Field(default="system")
    tag: Optional[str] = None

    @field_validator("user_id")
    @classmethod
    def validate_user_id(cls, v: str) -> str:
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid user_id format. Must be a 24-character hex string.")
        return v


class UpdateNotificationRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    message: Optional[str] = Field(None, min_length=1, max_length=2000)
    type: Optional[str] = None
    tag: Optional[str] = None
    is_read: Optional[bool] = None


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    type: str
    tag: Optional[str] = None
    is_read: bool
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
        elif hasattr(data, "id"):
            data_dict = data.model_dump()
            data_dict["id"] = str(data.id)
            data_dict["user_id"] = str(data.user_id)
            return data_dict
        return data


class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]
    unread_count: int
    total_count: int
