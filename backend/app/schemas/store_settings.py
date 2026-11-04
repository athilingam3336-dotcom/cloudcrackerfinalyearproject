import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator


def _clean_and_validate_indian_phone(v: Optional[str], field_name: str) -> Optional[str]:
    if v is None:
        return None
    cleaned = v.strip()
    if not cleaned:
        return cleaned
    digits = re.sub(r'\D', '', cleaned)
    if digits.startswith('91') and len(digits) == 12:
        digits = digits[2:]
    elif digits.startswith('0') and len(digits) == 11:
        digits = digits[1:]

    if len(digits) != 10:
        raise ValueError(
            f"Invalid {field_name}. Must be a valid 10-digit mobile number (received {len(digits)} digits)."
        )
    if digits[0] not in '6789':
        raise ValueError(
            f"Invalid {field_name}. Indian mobile numbers must start with 6, 7, 8, or 9."
        )
    return digits


class StoreSettingsResponse(BaseModel):
    min_online_delivery_amount: float
    store_name: str
    announcement_text: Optional[str] = (
        "Direct Sivakasi Factory Prices | Express Delivery Across Tamil Nadu & All India"
    )
    location_map_url: Optional[str] = (
        "https://maps.app.goo.gl/6BE5qX4vxyutrkAD6?g_st=aw"
    )
    contact_email: Optional[str] = "Meeracrackers@gmail.com"
    contact_phone: Optional[str] = "7339624431"
    whatsapp_number: Optional[str] = "7339624431"

    # Home Page Popup Settings
    popup_enabled: Optional[bool] = True
    popup_title: Optional[str] = "⚡ Urgent Diwali Booking Notice!"
    popup_message: Optional[str] = (
        "Diwali parcel & transport bookings close 3 days prior to the festival. Place your cracker orders early to guarantee doorstep delivery across Tamil Nadu & India!"
    )
    popup_image_type: Optional[str] = "diwali"
    popup_image_url: Optional[str] = None
    popup_button_text: Optional[str] = "Book Diwali Crackers Now ➔"
    popup_button_link: Optional[str] = "Categories"

    updated_at: Optional[datetime] = None


class StoreSettingsUpdate(BaseModel):
    min_online_delivery_amount: Optional[float] = Field(default=5000.0, ge=0)
    store_name: Optional[str] = "Meera Crackers"
    announcement_text: Optional[str] = None
    location_map_url: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    whatsapp_number: Optional[str] = None

    # Home Page Popup Settings
    popup_enabled: Optional[bool] = None
    popup_title: Optional[str] = None
    popup_message: Optional[str] = None
    popup_image_type: Optional[str] = None
    popup_image_url: Optional[str] = None
    popup_button_text: Optional[str] = None
    popup_button_link: Optional[str] = None

    @field_validator('contact_phone')
    @classmethod
    def validate_contact_phone(cls, v: Optional[str]) -> Optional[str]:
        return _clean_and_validate_indian_phone(v, "Call Phone Number")

    @field_validator('whatsapp_number')
    @classmethod
    def validate_whatsapp_number(cls, v: Optional[str]) -> Optional[str]:
        return _clean_and_validate_indian_phone(v, "WhatsApp Number")

    @field_validator('contact_email')
    @classmethod
    def validate_contact_email(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip()
        if not cleaned:
            return cleaned
        email_regex = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
        if not re.match(email_regex, cleaned):
            raise ValueError("Invalid contact email format. Example: Meeracrackers@gmail.com")
        return cleaned
