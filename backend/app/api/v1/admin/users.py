from typing import Optional
from fastapi import APIRouter, Depends, Query, status

from app.core.dependencies import get_current_admin
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.user import UserRoleUpdateRequest, UserStatusUpdateRequest
from app.services.user_service import UserService

router = APIRouter(prefix="/admin/users", tags=["Admin User Management"])


@router.get(
    "",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="List users with pagination, filters, and KPI summary metrics (Admin Only)",
    description="Returns paginated users, search matches on name/email/phone, role filter, account status filter, and live aggregated user counts.",
)
async def list_users(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by full name, email, or phone"),
    role: Optional[str] = Query(None, description="Filter by role: CUSTOMER or ADMIN"),
    account_status: Optional[str] = Query(None, description="Filter by status: active, inactive, blocked"),
    sort_by: str = Query("created_at", description="Sort by field: created_at, full_name, email, role, status"),
    sort_order: str = Query("desc", description="Sort direction: asc or desc"),
    current_admin: User = Depends(get_current_admin),
    user_service: UserService = Depends(),
) -> ApiResponse:
    data = await user_service.list_users_admin(
        page=page,
        limit=limit,
        search=search,
        role=role,
        account_status=account_status,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return ApiResponse(
        success=True,
        message="Users listed successfully",
        data=data,
    )


@router.get(
    "/{user_id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve detailed user profile and order metrics (Admin Only)",
    description="Returns full profile information, lifetime order summary, and recent order history for the specified user.",
)
async def get_user_detail(
    user_id: str,
    current_admin: User = Depends(get_current_admin),
    user_service: UserService = Depends(),
) -> ApiResponse:
    data = await user_service.get_user_details_admin(user_id)
    return ApiResponse(
        success=True,
        message="User details retrieved successfully",
        data=data,
    )


@router.patch(
    "/{user_id}/status",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Update user account status (Admin Only)",
    description="Activates, deactivates, or blocks a customer or administrator account with admin lockout safety protection.",
)
async def update_user_status(
    user_id: str,
    payload: UserStatusUpdateRequest,
    current_admin: User = Depends(get_current_admin),
    user_service: UserService = Depends(),
) -> ApiResponse:
    data = await user_service.update_user_status(
        user_id=user_id,
        status=payload.status,
        is_active=payload.is_active,
        current_admin=current_admin,
    )
    return ApiResponse(
        success=True,
        message="User status updated successfully",
        data=data,
    )


@router.patch(
    "/{user_id}/role",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Update user role (Admin Only)",
    description="Assigns CUSTOMER or ADMIN role to an account with lockout protection for the sole remaining administrator.",
)
async def update_user_role(
    user_id: str,
    payload: UserRoleUpdateRequest,
    current_admin: User = Depends(get_current_admin),
    user_service: UserService = Depends(),
) -> ApiResponse:
    data = await user_service.update_user_role(
        user_id=user_id,
        role=payload.role,
        current_admin=current_admin,
    )
    return ApiResponse(
        success=True,
        message="User role updated successfully",
        data=data,
    )


@router.get(
    "/{user_id}/orders",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="List paginated order history for customer (Admin Only)",
    description="Returns order history records, line items, and aggregate financial totals for a specific user ID.",
)
async def get_user_orders(
    user_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    current_admin: User = Depends(get_current_admin),
    user_service: UserService = Depends(),
) -> ApiResponse:
    data = await user_service.get_user_orders_admin(
        user_id=user_id,
        page=page,
        limit=limit,
    )
    return ApiResponse(
        success=True,
        message="User orders retrieved successfully",
        data=data,
    )


@router.delete(
    "/{user_id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Soft-delete / deactivate user account (Admin Only)",
    description="Safely deactivates user account without destroying historical orders, coupons, or payments.",
)
async def delete_user(
    user_id: str,
    current_admin: User = Depends(get_current_admin),
    user_service: UserService = Depends(),
) -> ApiResponse:
    data = await user_service.soft_delete_user(
        user_id=user_id,
        current_admin=current_admin,
    )
    return ApiResponse(
        success=True,
        message="User account deactivated successfully",
        data=data,
    )
