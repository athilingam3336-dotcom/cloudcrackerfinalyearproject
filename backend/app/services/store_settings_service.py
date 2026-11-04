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
                announcement_text=settings.announcement_text,
                location_map_url=settings.location_map_url,
                contact_email=settings.contact_email,
                contact_phone=settings.contact_phone,
                whatsapp_number=settings.whatsapp_number,
                popup_enabled=settings.popup_enabled,
                popup_title=settings.popup_title,
                popup_message=settings.popup_message,
                popup_image_type=settings.popup_image_type,
                popup_image_url=settings.popup_image_url,
                popup_button_text=settings.popup_button_text,
                popup_button_link=settings.popup_button_link,
                updated_at=settings.updated_at,
            )
        except Exception as e:
            logger.error(f"Error fetching store settings, falling back to default threshold: {e}")
            return StoreSettingsResponse(
                min_online_delivery_amount=5000.0,
                store_name="Meera Crackers",
                announcement_text="Direct Sivakasi Factory Prices | Express Delivery Across Tamil Nadu & All India",
                location_map_url="https://maps.app.goo.gl/6BE5qX4vxyutrkAD6?g_st=aw",
                contact_email="Meeracrackers@gmail.com",
                contact_phone="7339624431",
                whatsapp_number="7339624431",
                popup_enabled=True,
                popup_title="⚡ Urgent Diwali Booking Notice!",
                popup_message="Diwali parcel & transport bookings close 3 days prior to the festival. Place your cracker orders early to guarantee doorstep delivery across Tamil Nadu & India!",
                popup_image_type="diwali",
                popup_image_url=None,
                popup_button_text="Book Diwali Crackers Now ➔",
                popup_button_link="Categories",
                updated_at=datetime.utcnow(),
            )

    async def update_settings(self, data: StoreSettingsUpdate, user_id: str) -> StoreSettingsResponse:
        try:
            settings = await StoreSettings.find_one()
            if not settings:
                settings = StoreSettings(
                    min_online_delivery_amount=data.min_online_delivery_amount or 5000.0,
                    store_name=data.store_name or "Meera Crackers",
                    announcement_text=data.announcement_text or "Direct Sivakasi Factory Prices | Express Delivery Across Tamil Nadu & All India",
                    location_map_url=data.location_map_url or "https://maps.app.goo.gl/6BE5qX4vxyutrkAD6?g_st=aw",
                    contact_email=data.contact_email or "Meeracrackers@gmail.com",
                    contact_phone=data.contact_phone or "7339624431",
                    whatsapp_number=data.whatsapp_number or "7339624431",
                    popup_enabled=data.popup_enabled if data.popup_enabled is not None else True,
                    popup_title=data.popup_title or "⚡ Urgent Diwali Booking Notice!",
                    popup_message=data.popup_message or "Diwali parcel & transport bookings close 3 days prior to the festival. Place your cracker orders early to guarantee doorstep delivery across Tamil Nadu & India!",
                    popup_image_type=data.popup_image_type or "diwali",
                    popup_image_url=data.popup_image_url,
                    popup_button_text=data.popup_button_text or "Book Diwali Crackers Now ➔",
                    popup_button_link=data.popup_button_link or "Categories",
                    updated_by=user_id,
                )
                await settings.insert()
            else:
                if data.min_online_delivery_amount is not None:
                    settings.min_online_delivery_amount = data.min_online_delivery_amount
                if data.store_name:
                    settings.store_name = data.store_name
                if data.announcement_text is not None:
                    settings.announcement_text = data.announcement_text
                if data.location_map_url is not None:
                    settings.location_map_url = data.location_map_url
                if data.contact_email is not None:
                    settings.contact_email = data.contact_email
                if data.contact_phone is not None:
                    settings.contact_phone = data.contact_phone
                if data.whatsapp_number is not None:
                    settings.whatsapp_number = data.whatsapp_number

                if data.popup_enabled is not None:
                    settings.popup_enabled = data.popup_enabled
                if data.popup_title is not None:
                    settings.popup_title = data.popup_title
                if data.popup_message is not None:
                    settings.popup_message = data.popup_message
                if data.popup_image_type is not None:
                    settings.popup_image_type = data.popup_image_type
                if data.popup_image_url is not None:
                    settings.popup_image_url = data.popup_image_url
                if data.popup_button_text is not None:
                    settings.popup_button_text = data.popup_button_text
                if data.popup_button_link is not None:
                    settings.popup_button_link = data.popup_button_link

                settings.updated_by = user_id
                settings.updated_at = datetime.utcnow()
                await settings.save()

            return StoreSettingsResponse(
                min_online_delivery_amount=settings.min_online_delivery_amount,
                store_name=settings.store_name,
                announcement_text=settings.announcement_text,
                location_map_url=settings.location_map_url,
                contact_email=settings.contact_email,
                contact_phone=settings.contact_phone,
                whatsapp_number=settings.whatsapp_number,
                popup_enabled=settings.popup_enabled,
                popup_title=settings.popup_title,
                popup_message=settings.popup_message,
                popup_image_type=settings.popup_image_type,
                popup_image_url=settings.popup_image_url,
                popup_button_text=settings.popup_button_text,
                popup_button_link=settings.popup_button_link,
                updated_at=settings.updated_at,
            )
        except Exception as e:
            logger.error(f"Error updating store settings: {e}")
            raise RuntimeError(f"Failed to save store settings: {str(e)}")
