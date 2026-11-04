from datetime import datetime
from typing import Optional
from beanie import Document
from pydantic import Field

from app.core.constants import Collections


class StoreSettings(Document):
    min_online_delivery_amount: float = Field(default=5000.0, ge=0)
    store_name: str = "Meera Crackers"
    announcement_text: str = Field(
        default="Direct Sivakasi Factory Prices | Express Delivery Across Tamil Nadu & All India"
    )
    location_map_url: str = Field(
        default="https://maps.app.goo.gl/6BE5qX4vxyutrkAD6?g_st=aw"
    )
    contact_email: str = Field(default="Meeracrackers@gmail.com")
    contact_phone: str = Field(default="7339624431")
    whatsapp_number: str = Field(default="7339624431")

    # Home Page Announcement & Festive Notice Popup
    popup_enabled: bool = Field(default=True)
    popup_title: str = Field(default="⚡ Urgent Diwali Booking Notice!")
    popup_message: str = Field(
        default="Diwali parcel & transport bookings close 3 days prior to the festival. Place your cracker orders early to guarantee doorstep delivery across Tamil Nadu & India!"
    )
    popup_image_type: str = Field(default="diwali")  # "diwali" | "delivery" | "giftbox" | "custom"
    popup_image_url: Optional[str] = None
    popup_button_text: str = Field(default="Book Diwali Crackers Now ➔")
    popup_button_link: str = Field(default="Categories")

    updated_at: datetime = Field(default_factory=datetime.utcnow)
    updated_by: Optional[str] = None

    class Settings:
        name = Collections.STORE_SETTINGS

    async def update_timestamp(self) -> None:
        self.updated_at = datetime.utcnow()
        await self.save()
