from datetime import datetime
from typing import Any, Dict, Optional
from beanie import PydanticObjectId

from app.models.refresh_token import RefreshToken


class RefreshTokenRepository:
    async def get_by_token(self, token_str: str) -> Optional[RefreshToken]:
        """Fetch a refresh token document by token string."""
        return await RefreshToken.find_one(RefreshToken.token == token_str)

    async def create(self, token_data: Dict[str, Any]) -> RefreshToken:
        """Insert a new RefreshToken document."""
        token = RefreshToken(**token_data)
        await token.insert()
        return token

    async def revoke_token(self, token: RefreshToken) -> RefreshToken:
        """Revoke a refresh token."""
        token.is_revoked = True
        await token.save()
        return token

    async def revoke_all_for_user(self, user_id: str) -> int:
        """Revoke all refresh tokens associated with a user."""
        try:
            uid = PydanticObjectId(user_id)
        except Exception:
            return 0

        result = await RefreshToken.find(
            RefreshToken.user_id == uid,
            RefreshToken.is_revoked == False,
        ).update({"$set": {"is_revoked": True}})
        return result.modified_count if result else 0
