import logging
from typing import Optional
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError

from app.core.constants import UserRoles
from app.core.security import decode_token
from app.exceptions import ForbiddenException, UnauthorizedException
from app.models.user import User
from app.repositories.user_repository import UserRepository

logger = logging.getLogger("app.dependencies")

# Auto-error is False so that we can handle custom exception formats
security_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    user_repo: UserRepository = Depends(),
) -> User:
    """Dependency that extracts the JWT from headers, validates it, and returns the current User."""
    if not credentials:
        raise UnauthorizedException(message="Authentication credentials are required.")

    token = credentials.credentials
    try:
        payload = decode_token(token)
        token_type = payload.get("type")

        if token_type != "access":
            raise UnauthorizedException(
                message="Invalid token type. Access token expected."
            )

        user_id = payload.get("sub")
        if not user_id:
            raise UnauthorizedException(
                message="Authentication credentials could not be validated."
            )

    except JWTError as e:
        logger.warning(f"JWT validation failed: {e}")
        raise UnauthorizedException(message="Token is invalid or has expired.")

    user = await user_repo.get_by_id(user_id)
    if not user:
        raise UnauthorizedException(message="User associated with token not found.")

    if not user.is_active or user.status != "active":
        raise UnauthorizedException(
            message="Your account is deactivated. Please contact an administrator."
        )

    return user


async def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Dependency that asserts the currently logged-in user is an ADMIN."""
    if current_user.role != UserRoles.ADMIN:
        raise ForbiddenException(
            message="Forbidden. You do not have permission to access this resource."
        )
    return current_user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    user_repo: UserRepository = Depends(),
) -> Optional[User]:
    """Dependency that returns the current User if a valid token is provided, else returns None."""
    if not credentials:
        return None

    token = credentials.credentials
    try:
        payload = decode_token(token)
        token_type = payload.get("type")

        if token_type != "access":
            return None

        user_id = payload.get("sub")
        if not user_id:
            return None

        user = await user_repo.get_by_id(user_id)
        if not user or not user.is_active or user.status != "active":
            return None

        return user
    except Exception:
        return None
