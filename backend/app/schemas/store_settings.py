from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class StoreSettingsResponse(BaseModel):
    min_online_delivery_amount: float
    store_name: str
    updated_at: Optional[datetime] = None


class StoreSettingsUpdate(BaseModel):
    min_online_delivery_amount: float = Field(..., ge=0)
    store_name: Optional[str] = "Meera Crackers"
