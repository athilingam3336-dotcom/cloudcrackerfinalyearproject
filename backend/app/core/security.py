import logging
import time
from datetime import timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt

from app.core.config import settings

logger = logging.getLogger("app.security")

def hash_password(password: str) -> str:
    """Hashes a plain password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    """Verifies a plain password against its hashed value."""
    try:
        return bcrypt.checkpw(
            password.encode("utf-8"), hashed_password.encode("utf-8")
        )
    except Exception as e:
        logger.error(f"Password verification failed: {e}")
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Creates a JWT access token containing a payload, type, and expiration time."""
    to_encode = data.copy()
    expire_seconds = (
        expires_delta.total_seconds()
        if expires_delta
        else settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    expire_timestamp = int(time.time() + expire_seconds)

    to_encode.update({"exp": expire_timestamp, "type": "access"})
    return jwt.encode(
        to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Creates a JWT refresh token containing a payload, type, and expiration time."""
    to_encode = data.copy()
    expire_seconds = (
        expires_delta.total_seconds()
        if expires_delta
        else settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
    )
    expire_timestamp = int(time.time() + expire_seconds)

    to_encode.update({"exp": expire_timestamp, "type": "refresh"})
    return jwt.encode(
        to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )


def decode_token(token: str) -> dict:
    """Decodes and validates a JWT token. Raises JWTError if signature or claims are invalid."""
    return jwt.decode(
        token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
    )
