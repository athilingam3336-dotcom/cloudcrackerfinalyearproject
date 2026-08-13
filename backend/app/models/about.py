from datetime import datetime
from typing import List, Optional
from beanie import Document
from pydantic import BaseModel, Field

from app.core.constants import Collections


class AboutSection(BaseModel):
    title: str
    content: str


class About(Document):
    version: str = "v2.4.0"
    description: Optional[str] = "Premier Pyrotechnics & Celebration Platform"
    sections: List[AboutSection] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    class Settings:
        name = Collections.ABOUT

    async def update_timestamp(self) -> None:
        self.updated_at = datetime.utcnow()
        await self.save()
