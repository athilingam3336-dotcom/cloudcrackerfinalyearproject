from typing import Any, Optional


class BaseAppException(Exception):
    """Base exception for all application errors."""

    def __init__(
        self,
        status_code: int = 500,
        message: str = "An unexpected error occurred",
        data: Optional[Any] = None,
    ):
        super().__init__(message)
        self.status_code = status_code
        self.message = message
        self.data = data or {}


class NotFoundException(BaseAppException):
    """Raised when a requested resource is not found (404)."""

    def __init__(self, message: str = "Resource not found", data: Optional[Any] = None):
        super().__init__(status_code=404, message=message, data=data)


class UnauthorizedException(BaseAppException):
    """Raised when authentication credentials are missing or invalid (401)."""

    def __init__(self, message: str = "Unauthorized access", data: Optional[Any] = None):
        super().__init__(status_code=401, message=message, data=data)


class ForbiddenException(BaseAppException):
    """Raised when user lacks the required permission/role (403)."""

    def __init__(self, message: str = "Permission denied", data: Optional[Any] = None):
        super().__init__(status_code=403, message=message, data=data)


class BadRequestException(BaseAppException):
    """Raised when request arguments/parameters are incorrect (400)."""

    def __init__(self, message: str = "Bad request", data: Optional[Any] = None):
        super().__init__(status_code=400, message=message, data=data)


class ValidationException(BaseAppException):
    """Raised when request data fails Pydantic or custom validation rules (422)."""

    def __init__(self, message: str = "Validation error", data: Optional[Any] = None):
        super().__init__(status_code=422, message=message, data=data)
