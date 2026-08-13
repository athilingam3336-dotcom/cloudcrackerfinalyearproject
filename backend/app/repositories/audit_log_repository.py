from typing import Any, Dict, List, Optional, Tuple
from beanie import PydanticObjectId

from app.models.audit_log import AuditLog


class AuditLogRepository:
    async def get_by_id(self, audit_log_id: str) -> Optional[AuditLog]:
        """Fetch an audit log entry by ID."""
        try:
            aid = PydanticObjectId(audit_log_id)
        except Exception:
            return None
        return await AuditLog.get(aid)

    async def create(self, audit_log_data: Dict[str, Any]) -> AuditLog:
        """Insert a new AuditLog document."""
        log = AuditLog(**audit_log_data)
        await log.insert()
        return log

    async def list_logs(
        self,
        user_id: Optional[str] = None,
        action: Optional[str] = None,
        resource: Optional[str] = None,
        page: int = 1,
        limit: int = 50,
    ) -> Tuple[List[AuditLog], int]:
        """Fetch paginated audit logs filtered by user, action, or resource."""
        criteria = []

        if user_id:
            try:
                criteria.append(AuditLog.user_id == PydanticObjectId(user_id))
            except Exception:
                return [], 0

        if action:
            criteria.append(AuditLog.action == action)

        if resource:
            criteria.append(AuditLog.resource == resource)

        query = AuditLog.find(*criteria) if criteria else AuditLog.find_all()
        total = await query.count()

        skip = (page - 1) * limit
        logs = await query.sort(-AuditLog.created_at).skip(skip).limit(limit).to_list()
        return logs, total
