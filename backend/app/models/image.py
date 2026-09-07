from datetime import datetime
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field

from app.core.constants import Collections


class Image(Document):
    user_id: Indexed(PydanticObjectId)
    public_id: str
    url: str
    secure_url: str
    resource_type: str = "image"
    format: str
    size: int
    width: int
    height: int
    folder: Indexed(str)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = Collections.IMAGES
