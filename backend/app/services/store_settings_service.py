from datetime import datetime
import logging
from app.models.store_settings import StoreSettings
from app.schemas.store_settings import StoreSettingsResponse, StoreSettingsUpdate

logger = logging.getLogger(__name__)


class StoreSettingsService:
    async def get_settings(self) -> StoreSettingsResponse:
        try:
            settings = await StoreSettings.find_one()
            if not settings:
                settings = StoreSettings(min_online_delivery_amount=5000.0)
                try:
                    await settings.insert()
                except Exception as insert_err:
                    logger.warning(f"Could not persist default store settings: {insert_err}")
            return StoreSettingsResponse(
                min_online_delivery_amount=settings.min_online_delivery_amount,
                store_name=settings.store_name,
                updated_at=settings.updated_at,
            )
        except Exception as e:
            logger.error(f"Error fetching store settings, falling back to default ₹5,000 threshold: {e}")
            return StoreSettingsResponse(
                min_online_delivery_amount=5000.0,
                store_name="Meera Crackers",
                updated_at=datetime.utcnow(),
            )

    async def update_settings(self, data: StoreSettingsUpdate, user_id: str) -> StoreSettingsResponse:
        try:
            settings = await StoreSettings.find_one()
            if not settings:
                settings = StoreSettings(
                    min_online_delivery_amount=data.min_online_delivery_amount,
                    store_name=data.store_name or "Meera Crackers",
                    updated_by=user_id,
                )
                await settings.insert()
            else:
                settings.min_online_delivery_amount = data.min_online_delivery_amount
                if data.store_name:
                    settings.store_name = data.store_name
                settings.updated_by = user_id
                settings.updated_at = datetime.utcnow()
                await settings.save()

            return StoreSettingsResponse(
                min_online_delivery_amount=settings.min_online_delivery_amount,
                store_name=settings.store_name,
                updated_at=settings.updated_at,
            )
        except Exception as e:
            logger.error(f"Error updating store settings: {e}")
            raise RuntimeError(f"Failed to save store settings: {str(e)}")
