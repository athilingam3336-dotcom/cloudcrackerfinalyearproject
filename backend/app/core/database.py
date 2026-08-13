import asyncio
import logging
import subprocess
from pathlib import Path
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

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
        logger.info(f"Connecting to MongoDB at: {settings.MONGODB_URL}")
        is_local = "localhost" in settings.MONGODB_URL or "127.0.0.1" in settings.MONGODB_URL

        for attempt in range(2):
            try:
                self.client = AsyncIOMotorClient(
                    settings.MONGODB_URL,
                    serverSelectionTimeoutMS=3000 if (attempt == 0 and is_local) else 20000,
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
                    allow_index_dropping=True,
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
                logger.info("Connected to MongoDB & Beanie initialized.")
                return
            except Exception as e:
                # Auto-start local MongoDB only in development mode
                if attempt == 0 and is_local and not settings.is_production and not settings.is_test:
                    logger.warning(f"Initial MongoDB connection failed: {e}. Attempting to auto-start MongoDB in development mode...")
                    if self.client:
                        self.client.close()
                    started = _try_start_local_mongodb()
                    if started:
                        await asyncio.sleep(2)
                        continue
                logger.error(f"Failed to connect to MongoDB: {e}")
                raise e

    async def disconnect(self) -> None:
        """Closes the MongoDB connection."""
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed.")


db_manager = DatabaseManager()


