import asyncio
import logging
import re
import subprocess
import sys
from pathlib import Path
from typing import Dict, Any
from urllib.parse import urlparse

import beanie
from beanie import init_beanie
import certifi
import dns.version
import motor
from motor.motor_asyncio import AsyncIOMotorClient
import pymongo

from app.core.config import settings

# Monkeypatch AsyncIOMotorClient to resolve Beanie 2.1.0 / Motor 3.7+ compatibility issue
if not hasattr(AsyncIOMotorClient, "append_metadata"):
    def append_metadata_patch(self, *args, **kwargs):
        if hasattr(self.delegate, "append_metadata"):
            try:
                self.delegate.append_metadata(*args, **kwargs)
            except Exception:
                pass
    AsyncIOMotorClient.append_metadata = append_metadata_patch

logger = logging.getLogger("app.database")


def safe_mongodb_host(url: str) -> str:
    """Extract host/domain from MongoDB connection URI without printing credentials."""
    if not url:
        return "Not configured"
    # Mask credentials if present (mongodb://user:pass@host... or mongodb+srv://user:pass@host...)
    sanitized = re.sub(r"mongodb(\+srv)?://[^@]+@", r"mongodb\1://***:***@", url)
    try:
        parsed = urlparse(sanitized)
        return parsed.hostname or parsed.netloc or sanitized
    except Exception:
        return "Parse error"


def get_safe_db_diagnostics() -> Dict[str, Any]:
    """Returns safe diagnostic information about Python runtime and MongoDB dependencies."""
    return {
        "python_version": sys.version.split()[0],
        "pymongo_version": pymongo.__version__,
        "motor_version": getattr(motor, "version", getattr(motor, "__version__", "unknown")),
        "beanie_version": getattr(beanie, "__version__", "unknown"),
        "dnspython_version": getattr(dns.version, "version", getattr(dns, "__version__", "unknown")),
        "mongodb_uri_configured": bool(settings.MONGODB_URI),
        "mongodb_host": safe_mongodb_host(settings.MONGODB_URL),
        "ca_cert_bundle": certifi.where(),
    }


def _try_start_local_mongodb() -> bool:
    """Attempt to start local MongoDB if running on localhost."""
    try:
        # Try systemd user service first
        res = subprocess.run(["systemctl", "--user", "start", "mongodb-cloudcrackers.service"], capture_output=True, timeout=5)
        if res.returncode == 0:
            logger.info("Started MongoDB via systemd user service.")
            return True
    except Exception:
        pass

    # Try local binary
    base_dir = Path(__file__).resolve().parent.parent.parent
    mongod_bin = base_dir / "mongodb_bin" / "bin" / "mongod"
    db_path = base_dir / "mongodb_data"
    log_path = base_dir / "logs" / "mongod.log"

    if mongod_bin.exists():
        db_path.mkdir(parents=True, exist_ok=True)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        cmd = [
            str(mongod_bin),
            "--dbpath", str(db_path),
            "--logpath", str(log_path),
            "--fork",
            "--bind_ip", "127.0.0.1,localhost",
            "--port", "27017",
        ]
        try:
            logger.info(f"Starting local mongod binary: {cmd}")
            subprocess.run(cmd, check=True, capture_output=True, timeout=10)
            logger.info("Local mongod binary started successfully.")
            return True
        except Exception as ex:
            logger.warning(f"Failed to start local mongod binary: {ex}")
    return False


class DatabaseManager:
    client: AsyncIOMotorClient = None
    db = None

    async def connect(self) -> None:
        """Initializes client and sets up Beanie ODM connection with auto-retry."""
        diagnostics = get_safe_db_diagnostics()
        logger.info(f"MongoDB Diagnostics: {diagnostics}")

        is_local = "localhost" in settings.MONGODB_URL or "127.0.0.1" in settings.MONGODB_URL

        # List of connection candidates: primary URL, then local fallback if primary is remote
        urls_to_try = [settings.MONGODB_URL]
        if not is_local:
            urls_to_try.append("mongodb://localhost:27017")

        for url_idx, target_url in enumerate(urls_to_try):
            is_curr_local = "localhost" in target_url or "127.0.0.1" in target_url
            timeout_ms = 4000 if not is_curr_local else 3000

            for attempt in range(2):
                try:
                    client_kwargs: Dict[str, Any] = {
                        "serverSelectionTimeoutMS": timeout_ms,
                        "connectTimeoutMS": 5000,
                        "maxPoolSize": 50,
                        "minPoolSize": 5,
                        "maxIdleTimeMS": 45000,
                    }

                    if not is_curr_local:
                        client_kwargs["tlsCAFile"] = certifi.where()
                        client_kwargs["retryWrites"] = True
                        client_kwargs["w"] = "majority"

                    self.client = AsyncIOMotorClient(
                        target_url,
                        **client_kwargs,
                    )
                    self.db = self.client[settings.DB_NAME]

                    # Initialize Beanie with the registered models
                    from app.models.category import Category
                    from app.models.product import Product
                    from app.models.user import User
                    from app.models.cart import Cart
                    from app.models.wishlist import Wishlist
                    from app.models.order import Order
                    from app.models.order_item import OrderItem
                    from app.models.payment import Payment
                    from app.models.address import Address
                    from app.models.coupon import Coupon
                    from app.models.inventory import Inventory
                    from app.models.review import Review
                    from app.models.image import Image
                    from app.models.notification import Notification
                    from app.models.audit_log import AuditLog
                    from app.models.refresh_token import RefreshToken
                    from app.models.about import About

                    await init_beanie(
                        database=self.db,
                        allow_index_dropping=False,
                        document_models=[
                            User,
                            Category,
                            Product,
                            Cart,
                            Wishlist,
                            Order,
                            OrderItem,
                            Payment,
                            Address,
                            Coupon,
                            Inventory,
                            Review,
                            Image,
                            Notification,
                            AuditLog,
                            RefreshToken,
                            About,
                        ],
                    )
                    logger.info(f"Connected to MongoDB ({safe_mongodb_host(target_url)}) & Beanie initialized successfully.")
                    return
                except Exception as e:
                    if is_curr_local and attempt == 0 and not settings.is_production and not settings.is_test:
                        logger.warning(f"Local MongoDB connection failed: {e}. Auto-starting local MongoDB...")
                        if self.client:
                            self.client.close()
                        started = _try_start_local_mongodb()
                        if started:
                            await asyncio.sleep(2)
                            continue
                    if self.client:
                        self.client.close()
                    logger.warning(f"Connection attempt to {safe_mongodb_host(target_url)} failed: {e}")
                    break

        raise RuntimeError("Failed to connect to any MongoDB server (both remote Atlas and local fallback failed).")

    async def disconnect(self) -> None:
        """Closes the MongoDB connection."""
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed.")


db_manager = DatabaseManager()
