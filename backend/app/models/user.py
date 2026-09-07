from datetime import datetime
from typing import Optional
from beanie import Document, Indexed
from pydantic import EmailStr, Field

from app.core.constants import Collections


class User(Document):
    full_name: str
    email: Indexed(EmailStr, unique=True)
    phone: Optional[str] = None
    password_hash: Optional[str] = None
    role: str = "CUSTOMER"  # "CUSTOMER" or "ADMIN"
    is_verified: bool = False
    is_active: bool = True
    auth_provider: str = "local"  # "local" or "google"
    google_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    status: str = "active"
    avatar_url: Optional[str] = None

    class Settings:
        name = Collections.USERS

    async def update_timestamp(self) -> None:
        self.updated_at = datetime.utcnow()
        await self.save()
