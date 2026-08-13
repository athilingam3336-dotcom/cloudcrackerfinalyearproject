from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, Path, Query, status

from app.core.dependencies import get_current_admin
from app.exceptions import ValidationException
from app.models.user import User
from app.schemas.audit_log import AuditLogListResponse, AuditLogResponse, CreateAuditLogRequest
from app.schemas.common import ApiResponse
from app.services.audit_log_service import AuditLogService

router = APIRouter(prefix="/admin/audit-logs", tags=["Admin Audit Logs"])


def get_validated_audit_log_id(id: str = Path(..., description="24-character hex ID of the audit log entry")) -> str:
    """Path parameter validator for audit log ID."""
    if not ObjectId.is_valid(id):
        raise ValidationException(
            message="Invalid ID format. Must be a 24-character hexadecimal string."
        )
    return id


@router.get(
    "",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="List audit logs (Admin Only)",
    description="Retrieves a paginated list of system audit logs with optional filters. Requires Admin role.",
)
async def list_audit_logs(
    user_id: Optional[str] = Query(None, description="Filter by Target/Actor User ID"),
    action: Optional[str] = Query(None, description="Filter by action name (e.g. USER_LOGIN, ORDER_CREATE)"),
    resource: Optional[str] = Query(None, description="Filter by resource type (e.g. Products, Orders)"),
    page: int = Query(1, ge=1, description="Page number starting from 1"),
    limit: int = Query(50, ge=1, le=200, description="Items per page"),
    current_admin: User = Depends(get_current_admin),
    audit_service: AuditLogService = Depends(),
) -> ApiResponse:
    logs, total = await audit_service.list_logs(
        user_id=user_id,
        action=action,
        resource=resource,
        page=page,
        limit=limit,
    )
    serialized = [AuditLogResponse.convert_id(log) for log in logs]
    data = AuditLogListResponse(audit_logs=serialized, total_count=total)
    return ApiResponse(
        success=True,
        message="Audit logs retrieved successfully.",
        data=data.model_dump(),
    )


@router.get(
    "/{id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Get audit log details (Admin Only)",
    description="Retrieves specific audit log record details by ID. Requires Admin role.",
)
async def get_audit_log_details(
    id: str = Depends(get_validated_audit_log_id),
    current_admin: User = Depends(get_current_admin),
    audit_service: AuditLogService = Depends(),
) -> ApiResponse:
    log = await audit_service.get_log(id)
    return ApiResponse(
        success=True,
        message="Audit log details retrieved.",
        data=AuditLogResponse.convert_id(log),
    )


@router.post(
    "",
    response_model=ApiResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create audit log entry (Admin Only)",
    description="Manually records a system audit event. Requires Admin role.",
)
async def create_audit_log(
    data: CreateAuditLogRequest,
    current_admin: User = Depends(get_current_admin),
    audit_service: AuditLogService = Depends(),
) -> ApiResponse:
    log = await audit_service.create_log(data)
    return ApiResponse(
        success=True,
        message="Audit log entry created successfully.",
        data=AuditLogResponse.convert_id(log),
    )
