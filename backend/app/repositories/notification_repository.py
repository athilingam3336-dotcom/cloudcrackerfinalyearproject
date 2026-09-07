from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from beanie import PydanticObjectId

from app.models.notification import Notification


class NotificationRepository:
    async def get_by_id(self, notification_id: str) -> Optional[Notification]:
        """Fetch a notification by ID if not deleted."""
        try:
            nid = PydanticObjectId(notification_id)
        except Exception:
            return None
        notification = await Notification.get(nid)
        if notification and notification.status != "deleted":
            return notification
        return None

    async def create(self, notification_data: Dict[str, Any]) -> Notification:
        """Insert a new Notification document."""
        notification = Notification(**notification_data)
        await notification.insert()
        return notification

    async def update(
        self, notification: Notification, update_data: Dict[str, Any]
    ) -> Notification:
        """Update notification fields and save changes."""
        for key, value in update_data.items():
            setattr(notification, key, value)
        notification.updated_at = datetime.utcnow()
        await notification.save()
        return notification

    async def soft_delete(self, notification: Notification) -> Notification:
        """Mark notification as deleted."""
        notification.status = "deleted"
        notification.updated_at = datetime.utcnow()
        await notification.save()
        return notification

    async def list_by_user(
        self,
        user_id: str,
        is_read: Optional[bool] = None,
        page: int = 1,
        limit: int = 20,
    ) -> Tuple[List[Notification], int]:
        """Fetch paginated notifications for a specific user."""
        try:
            uid = PydanticObjectId(user_id)
        except Exception:
            return [], 0

        criteria = [
            Notification.user_id == uid,
            Notification.status != "deleted",
        ]
        if is_read is not None:
            criteria.append(Notification.is_read == is_read)

        query = Notification.find(*criteria)
        total = await query.count()

        skip = (page - 1) * limit
        notifications = (
            await query.sort(-Notification.created_at)
            .skip(skip)
            .limit(limit)
            .to_list()
        )
        return notifications, total

    async def mark_as_read(
        self, notification_id: str, user_id: str
    ) -> Optional[Notification]:
        """Mark a single notification as read if owned by the user."""
        notification = await self.get_by_id(notification_id)
        if not notification or str(notification.user_id) != user_id:
            return None
        notification.is_read = True
        notification.updated_at = datetime.utcnow()
        await notification.save()
        return notification

    async def mark_all_as_read(self, user_id: str) -> int:
        """Mark all active notifications for a user as read."""
        try:
            uid = PydanticObjectId(user_id)
        except Exception:
            return 0

        result = await Notification.find(
            Notification.user_id == uid,
            Notification.status != "deleted",
            Notification.is_read == False,
        ).update({"$set": {"is_read": True, "updated_at": datetime.utcnow()}})
        return result.modified_count if result else 0

    async def get_unread_count(self, user_id: str) -> int:
        """Count unread active notifications for a user."""
        try:
            uid = PydanticObjectId(user_id)
        except Exception:
            return 0

        return await Notification.find(
            Notification.user_id == uid,
            Notification.status != "deleted",
            Notification.is_read == False,
        ).count()
