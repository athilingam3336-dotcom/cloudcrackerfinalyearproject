from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, model_validator


class CreateRefreshTokenRequest(BaseModel):
    user_id: str
    token: str
    expires_at: datetime


class RefreshTokenResponse(BaseModel):
    id: str
    user_id: str
    token: str
    is_revoked: bool
    expires_at: datetime
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
