from typing import List, Optional, Tuple
from beanie import PydanticObjectId

from app.exceptions import NotFoundException
from app.models.audit_log import AuditLog
from app.repositories.audit_log_repository import AuditLogRepository
from app.schemas.audit_log import CreateAuditLogRequest


class AuditLogService:
    def __init__(self) -> None:
        self.audit_repo = AuditLogRepository()

    async def create_log(self, data: CreateAuditLogRequest) -> AuditLog:
        """Record a new audit log entry."""
        log_data = {
            "action": data.action,
            "resource": data.resource,
            "resource_id": data.resource_id,
            "details": data.details,
            "ip_address": data.ip_address,
            "user_agent": data.user_agent,
        }
        if data.user_id:
            try:
                log_data["user_id"] = PydanticObjectId(data.user_id)
            except Exception:
                pass

        return await self.audit_repo.create(log_data)

    async def get_log(self, log_id: str) -> AuditLog:
        """Retrieve a specific audit log by ID."""
        log = await self.audit_repo.get_by_id(log_id)
        if not log:
            raise NotFoundException(message="Audit log entry not found.")
        return log

    async def list_logs(
        self,
        user_id: Optional[str] = None,
        action: Optional[str] = None,
        resource: Optional[str] = None,
        page: int = 1,
        limit: int = 50,
    ) -> Tuple[List[AuditLog], int]:
        """Fetch paginated audit logs."""
        return await self.audit_repo.list_logs(
            user_id=user_id,
            action=action,
            resource=resource,
            page=page,
            limit=limit,
        )
