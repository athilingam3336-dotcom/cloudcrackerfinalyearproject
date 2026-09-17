import logging
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.dependencies import get_current_user
from app.models.user import User
from app.core.constants import UserRoles
from app.exceptions.custom_exceptions import ForbiddenException
from app.schemas.store_settings import StoreSettingsResponse, StoreSettingsUpdate
from app.services.store_settings_service import StoreSettingsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/settings", tags=["Store Settings"])
admin_router = APIRouter(prefix="/admin/settings", tags=["Admin Store Settings"])

service = StoreSettingsService()


@router.get("", response_model=dict)
async def get_settings():
    try:
        settings = await service.get_settings()
        return {
            "success": True,
            "message": "Store settings retrieved successfully.",
            "data": settings.model_dump(),
        }
    except Exception as e:
        logger.error(f"Failed to fetch public store settings: {e}")
        # Fallback to prevent 500 error on client
        return {
            "success": True,
            "message": "Store settings retrieved using default fallback.",
            "data": {
                "min_online_delivery_amount": 5000.0,
                "store_name": "Meera Crackers",
            },
        }


@admin_router.get("", response_model=dict)
async def get_admin_settings(current_user: User = Depends(get_current_user)):
    try:
        if current_user.role != UserRoles.ADMIN:
            raise ForbiddenException(message="Admin access required.")
        settings = await service.get_settings()
        return {
            "success": True,
            "message": "Store settings retrieved successfully.",
            "data": settings.model_dump(),
        }
    except ForbiddenException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving admin settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve store settings: {str(e)}",
        )


@admin_router.put("", response_model=dict)
async def update_settings(
    data: StoreSettingsUpdate,
    current_user: User = Depends(get_current_user),
):
    try:
        if current_user.role != UserRoles.ADMIN:
            raise ForbiddenException(message="Admin access required.")
        updated = await service.update_settings(data, user_id=str(current_user.id))
        return {
            "success": True,
            "message": "Store settings updated successfully.",
            "data": updated.model_dump(),
        }
    except ForbiddenException:
        raise
    except Exception as e:
        logger.error(f"Error updating store settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update store settings: {str(e)}",
        )
