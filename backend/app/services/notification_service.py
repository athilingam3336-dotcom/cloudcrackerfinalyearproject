from typing import List, Optional, Tuple
from beanie import PydanticObjectId

from app.exceptions import NotFoundException, UnauthorizedException, ValidationException
from app.models.notification import Notification
from app.repositories.notification_repository import NotificationRepository
from app.repositories.user_repository import UserRepository
from app.schemas.notification import CreateNotificationRequest, UpdateNotificationRequest


class NotificationService:
    def __init__(self) -> None:
        self.notification_repo = NotificationRepository()
        self.user_repo = UserRepository()

    async def create_notification(
        self, data: CreateNotificationRequest
    ) -> Notification:
        """Create a notification for a user."""
        user = await self.user_repo.get_by_id(data.user_id)
        if not user or not user.is_active:
            raise ValidationException(
                message=f"User with ID '{data.user_id}' does not exist or is inactive."
            )

        notification_data = {
            "user_id": user.id,
            "title": data.title,
            "message": data.message,
            "type": data.type,
            "tag": data.tag,
            "is_read": False,
            "status": "active",
        }
        return await self.notification_repo.create(notification_data)

    async def get_notification(
        self, notification_id: str, user_id: str
    ) -> Notification:
        """Retrieve a specific notification, verifying user ownership."""
        notification = await self.notification_repo.get_by_id(notification_id)
        if not notification:
            raise NotFoundException(message="Notification not found.")
        if str(notification.user_id) != user_id:
            raise UnauthorizedException(
                message="You do not have permission to access this notification."
            )
        return notification

    async def get_user_notifications(
        self,
        user_id: str,
        is_read: Optional[bool] = None,
        page: int = 1,
        limit: int = 20,
    ) -> Tuple[List[Notification], int, int]:
        """Fetch paginated user notifications, total count, and unread count."""
        notifications, total = await self.notification_repo.list_by_user(
            user_id=user_id, is_read=is_read, page=page, limit=limit
        )
        unread_count = await self.notification_repo.get_unread_count(user_id)
        return notifications, unread_count, total

    async def update_notification(
        self,
        notification_id: str,
        user_id: str,
        data: UpdateNotificationRequest,
    ) -> Notification:
        """Update a user notification."""
        notification = await self.get_notification(notification_id, user_id)
        update_dict = data.model_dump(exclude_unset=True)
        return await self.notification_repo.update(notification, update_dict)

    async def mark_as_read(
        self, notification_id: str, user_id: str
    ) -> Notification:
        """Mark a notification as read."""
        notification = await self.get_notification(notification_id, user_id)
        if not notification.is_read:
            notification = await self.notification_repo.update(
                notification, {"is_read": True}
            )
        return notification

    async def mark_all_as_read(self, user_id: str) -> int:
        """Mark all active notifications for a user as read."""
        return await self.notification_repo.mark_all_as_read(user_id)

    async def delete_notification(
        self, notification_id: str, user_id: str
    ) -> Notification:
        """Soft delete a user notification."""
        notification = await self.get_notification(notification_id, user_id)
        return await self.notification_repo.soft_delete(notification)
