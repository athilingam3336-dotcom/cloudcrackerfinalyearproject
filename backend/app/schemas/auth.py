import re
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: str
    password: str
    confirm_password: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        cleaned = re.sub(r"\D", "", v)
        if len(cleaned) < 10 or len(cleaned) > 15:
            raise ValueError("Phone number must contain between 10 and 15 digits")
        return v

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[@$!%*#?&]", v):
            raise ValueError("Password must contain at least one special character (@$!%*#?&)")
        return v

    @model_validator(mode="after")
    def passwords_match(self) -> "RegisterRequest":
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    password: str
    confirm_password: str

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[@$!%*#?&]", v):
            raise ValueError("Password must contain at least one special character (@$!%*#?&)")
        return v

    @model_validator(mode="after")
    def passwords_match(self) -> "ResetPasswordRequest":
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = None
    avatar_base64: Optional[str] = None
    avatar_url: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def map_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "name" in data and "full_name" not in data:
                data["full_name"] = data["name"]
            if "avatarUrl" in data and "avatar_url" not in data and "avatar_base64" not in data:
                data["avatar_url"] = data["avatarUrl"]
            if "avatar_url" in data and not data.get("avatar_base64"):
                data["avatar_base64"] = data["avatar_url"]
        return data

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return v
        cleaned = re.sub(r"\D", "", v)
        if len(cleaned) < 10 or len(cleaned) > 15:
            raise ValueError("Phone number must contain between 10 and 15 digits")
        return v


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class GoogleAuthRequest(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    google_id: Optional[str] = None
    id_token: Optional[str] = None


class InstagramAuthRequest(BaseModel):
    code: Optional[str] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    instagram_id: Optional[str] = None
    redirect_uri: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    phone: Optional[str] = ""
    role: str
    is_verified: bool
    is_active: bool
    auth_provider: Optional[str] = "local"
    created_at: datetime
    updated_at: datetime
    status: str
    avatar_url: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def convert_id(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "_id" in data:
                data["id"] = str(data["_id"])
            elif "id" in data:
                data["id"] = str(data["id"])
            if data.get("phone") is None:
                data["phone"] = ""
        elif hasattr(data, "id"):
            # Beanie document
            data_dict = data.model_dump()
            data_dict["id"] = str(data.id)
            if data_dict.get("phone") is None:
                data_dict["phone"] = ""
            return data_dict
        return data


class AuthResponseData(BaseModel):
    user: UserResponse
    access_token: str
    refresh_token: str
