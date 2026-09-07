from datetime import datetime
from typing import Any, Dict, Optional
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field

from app.core.constants import Collections


class AuditLog(Document):
    user_id: Optional[Indexed(PydanticObjectId)] = None
    action: Indexed(str)
    resource: str
    resource_id: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = Collections.AUDIT_LOGS
