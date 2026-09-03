import json
import os
from typing import List, Union, Optional
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENV_FILE_PATH = os.path.join(BASE_DIR, ".env")


class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "Meera Crackers API"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = True

    # Server Settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Database Settings
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_URI: Optional[str] = None  # Atlas URI for production
    TEST_MONGODB_URI: Optional[str] = None  # Dedicated URI for test environment
    DB_NAME: str = "cloudcrackers"

    @model_validator(mode="after")
    def resolve_mongodb_url(self) -> "Settings":
        """Resolve MongoDB connection based on ENVIRONMENT:
        - Prioritizes remote MONGODB_URI if provided.
        - production: STRICTLY requires remote MongoDB Atlas MONGODB_URI.
        - test: uses isolated local test URI (mongodb://localhost:27017 with cloudcrackers_test).
        - development: defaults to local MongoDB if MONGODB_URI is not set.
        """
        env = self.ENVIRONMENT.lower()
        if self.MONGODB_URI and "localhost" not in self.MONGODB_URI and "127.0.0.1" not in self.MONGODB_URI:
            self.MONGODB_URL = self.MONGODB_URI
        elif env == "production":
            if not self.MONGODB_URI:
                raise ValueError("MONGODB_URI must be set in production environment.")
            if "localhost" in self.MONGODB_URI.lower() or "127.0.0.1" in self.MONGODB_URI:
                raise ValueError(
                    "Localhost MongoDB cannot be used in production environment. A valid MongoDB Atlas/remote URI is required."
                )
            self.MONGODB_URL = self.MONGODB_URI
        elif env == "test":
            self.MONGODB_URL = self.TEST_MONGODB_URI or "mongodb://localhost:27017"
            self.DB_NAME = "cloudcrackers_test"
        else:
            if not self.MONGODB_URL:
                self.MONGODB_URL = "mongodb://localhost:27017"
        return self

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def is_test(self) -> bool:
        return self.ENVIRONMENT.lower() == "test"

    # JWT Settings
    JWT_SECRET_KEY: str = "your_super_secret_jwt_signing_key_change_me_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Cloudinary Settings
    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None

    # Razorpay Settings (Test Mode)
    RAZORPAY_KEY_ID: Optional[str] = None
    RAZORPAY_KEY_SECRET: Optional[str] = None
    RAZORPAY_WEBHOOK_SECRET: Optional[str] = None

    # Instagram Auth Settings
    INSTAGRAM_CLIENT_ID: Optional[str] = "2262885951230627"
    INSTAGRAM_CLIENT_SECRET: Optional[str] = None
    INSTAGRAM_REDIRECT_URI: Optional[str] = "https://cloudcrackerfinalyearproject-1.onrender.com"

    # SMTP Email Settings
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: Optional[str] = os.getenv("SMTP_USER", None)
    SMTP_PASSWORD: Optional[str] = os.getenv("SMTP_PASSWORD", None)
    SMTP_FROM: Optional[str] = os.getenv("SMTP_FROM", None)

    # CORS Settings
    ALLOWED_ORIGINS: List[str] = [
        "https://cloudcrackerfinalyearproject.onrender.com",
        "https://cloudcrackerfinalyearproject-1.onrender.com",
        "http://localhost:3000",
        "http://localhost:8081",
        "http://localhost:19006",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8081",
        "http://127.0.0.1:5173",
    ]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                pass
            return [x.strip() for x in v.split(",") if x.strip()]
        return v

    model_config = SettingsConfigDict(
        env_file=ENV_FILE_PATH if os.path.exists(ENV_FILE_PATH) else ".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()

