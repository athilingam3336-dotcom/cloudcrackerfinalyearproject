from datetime import datetime
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field

from app.core.constants import Collections


class RefreshToken(Document):
    user_id: Indexed(PydanticObjectId)
    token: Indexed(str, unique=True)
    is_revoked: bool = False
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = Collections.REFRESH_TOKENS
