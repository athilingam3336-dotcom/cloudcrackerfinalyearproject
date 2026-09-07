from datetime import datetime
from beanie import PydanticObjectId

from app.exceptions import UnauthorizedException, ValidationException
from app.models.refresh_token import RefreshToken
from app.repositories.refresh_token_repository import RefreshTokenRepository
from app.schemas.refresh_token import CreateRefreshTokenRequest


class RefreshTokenService:
    def __init__(self) -> None:
        self.token_repo = RefreshTokenRepository()

    async def create_token(self, data: CreateRefreshTokenRequest) -> RefreshToken:
        """Record a newly issued refresh token in the database."""
        try:
            uid = PydanticObjectId(data.user_id)
        except Exception:
            raise ValidationException(message="Invalid user_id format.")

        token_data = {
            "user_id": uid,
            "token": data.token,
            "is_revoked": False,
            "expires_at": data.expires_at,
        }
        return await self.token_repo.create(token_data)

    async def get_valid_token(self, token_str: str) -> RefreshToken:
        """Validate token exists, is not revoked, and is not expired."""
        token = await self.token_repo.get_by_token(token_str)
        if not token:
            raise UnauthorizedException(message="Refresh token not found.")
        if token.is_revoked:
            raise UnauthorizedException(message="Refresh token has been revoked.")
        if token.expires_at < datetime.utcnow():
            raise UnauthorizedException(message="Refresh token has expired.")
        return token

    async def revoke_token(self, token_str: str) -> RefreshToken:
        """Revoke a single refresh token."""
        token = await self.get_valid_token(token_str)
        return await self.token_repo.revoke_token(token)

    async def revoke_all_user_tokens(self, user_id: str) -> int:
        """Revoke all tokens for a user (e.g. on logout-all or password change)."""
        return await self.token_repo.revoke_all_for_user(user_id)
