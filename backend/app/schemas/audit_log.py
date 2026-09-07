from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, model_validator


class CreateAuditLogRequest(BaseModel):
    user_id: Optional[str] = None
    action: str
    resource: str
    resource_id: Optional[str] = None
    details: Dict[str, Any] = {}
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class AuditLogResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    action: str
    resource: str
    resource_id: Optional[str] = None
    details: Dict[str, Any]
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime

    @model_validator(mode="before")
    @classmethod
    def convert_id(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "_id" in data:
                data["id"] = str(data["_id"])
            elif "id" in data:
                data["id"] = str(data["id"])
            if "user_id" in data and data["user_id"]:
                data["user_id"] = str(data["user_id"])
        elif hasattr(data, "id"):
            data_dict = data.model_dump()
            data_dict["id"] = str(data.id)
            if data.user_id:
                data_dict["user_id"] = str(data.user_id)
            return data_dict
        return data


class AuditLogListResponse(BaseModel):
    audit_logs: List[AuditLogResponse]
    total_count: int
