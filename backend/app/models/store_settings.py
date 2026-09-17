from datetime import datetime
from typing import Optional
from beanie import Document
from pydantic import Field

from app.core.constants import Collections


class StoreSettings(Document):
    min_online_delivery_amount: float = Field(default=5000.0, ge=0)
    store_name: str = "Meera Crackers"
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    updated_by: Optional[str] = None

    class Settings:
        name = Collections.STORE_SETTINGS

    async def update_timestamp(self) -> None:
        self.updated_at = datetime.utcnow()
        await self.save()
