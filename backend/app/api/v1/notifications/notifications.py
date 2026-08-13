from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, Path, Query, status

from app.core.dependencies import get_current_admin, get_current_user
from app.exceptions import ValidationException
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.notification import (
    CreateNotificationRequest,
    NotificationListResponse,
    NotificationResponse,
    UpdateNotificationRequest,
)
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])
admin_router = APIRouter(prefix="/admin/notifications", tags=["Admin Notifications"])


def get_validated_notification_id(id: str = Path(..., description="24-character hex ID of the notification")) -> str:
    """Path parameter validator for notification ID."""
    if not ObjectId.is_valid(id):
        raise ValidationException(
            message="Invalid ID format. Must be a 24-character hexadecimal string."
        )
    return id


# --- Customer Endpoints ---

@router.get(
    "",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="List notifications (Customer)",
    description="Retrieves a paginated list of notifications for the authenticated user.",
)
async def get_my_notifications(
    is_read: Optional[bool] = Query(None, description="Filter by read status (true/false)"),
    page: int = Query(1, ge=1, description="Page number starting from 1"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    notification_service: NotificationService = Depends(),
) -> ApiResponse:
    notifications, unread_count, total = await notification_service.get_user_notifications(
        user_id=str(current_user.id),
        is_read=is_read,
        page=page,
        limit=limit,
    )
    serialized = [NotificationResponse.convert_id(n) for n in notifications]
    data = NotificationListResponse(
        notifications=serialized,
        unread_count=unread_count,
        total_count=total,
    )
    return ApiResponse(
        success=True,
        message="Notifications retrieved successfully.",
        data=data.model_dump(),
    )


@router.get(
    "/unread-count",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Get unread notifications count (Customer)",
    description="Returns the total number of unread active notifications for the current user.",
)
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    notification_service: NotificationService = Depends(),
) -> ApiResponse:
    _, unread_count, _ = await notification_service.get_user_notifications(
        user_id=str(current_user.id)
    )
    return ApiResponse(
        success=True,
        message="Unread notification count retrieved.",
        data={"unread_count": unread_count},
    )


@router.put(
    "/read-all",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Mark all notifications as read (Customer)",
    description="Marks all unread active notifications for the current user as read.",
)
async def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    notification_service: NotificationService = Depends(),
) -> ApiResponse:
    count = await notification_service.mark_all_as_read(str(current_user.id))
    return ApiResponse(
        success=True,
        message=f"{count} notifications marked as read.",
        data={"updated_count": count},
    )


@router.get(
    "/{id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Get notification details (Customer)",
    description="Retrieves specific notification details by ID for the current user.",
)
async def get_notification_details(
    id: str = Depends(get_validated_notification_id),
    current_user: User = Depends(get_current_user),
    notification_service: NotificationService = Depends(),
) -> ApiResponse:
    notification = await notification_service.get_notification(id, str(current_user.id))
    return ApiResponse(
        success=True,
        message="Notification details retrieved.",
        data=NotificationResponse.convert_id(notification),
    )


@router.put(
    "/{id}/read",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Mark single notification as read (Customer)",
    description="Marks a specific notification as read for the current user.",
)
async def mark_as_read(
    id: str = Depends(get_validated_notification_id),
    current_user: User = Depends(get_current_user),
    notification_service: NotificationService = Depends(),
) -> ApiResponse:
    notification = await notification_service.mark_as_read(id, str(current_user.id))
    return ApiResponse(
        success=True,
        message="Notification marked as read.",
        data=NotificationResponse.convert_id(notification),
    )


@router.delete(
    "/{id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete notification (Customer)",
    description="Soft-deletes a notification for the current user.",
)
async def delete_notification(
    id: str = Depends(get_validated_notification_id),
    current_user: User = Depends(get_current_user),
    notification_service: NotificationService = Depends(),
) -> ApiResponse:
    await notification_service.delete_notification(id, str(current_user.id))
    return ApiResponse(
        success=True,
        message="Notification deleted successfully.",
        data=None,
    )


# --- Admin Endpoints ---

@admin_router.post(
    "",
    response_model=ApiResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create notification (Admin Only)",
    description="Sends a new notification to a specific user. Requires Admin role.",
)
async def create_notification(
    data: CreateNotificationRequest,
    current_admin: User = Depends(get_current_admin),
    notification_service: NotificationService = Depends(),
) -> ApiResponse:
    notification = await notification_service.create_notification(data)
    return ApiResponse(
        success=True,
        message="Notification created successfully.",
        data=NotificationResponse.convert_id(notification),
    )
