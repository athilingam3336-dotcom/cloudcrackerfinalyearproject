import asyncio
from typing import AsyncGenerator, Generator
import pytest
from httpx import AsyncClient

from app.core.database import db_manager
from app.main import app
from app.models.user import User

# Check for ASGITransport compatibility (HTTPX 0.20+)
try:
    from httpx import ASGITransport

    use_transport = True
except ImportError:
    use_transport = False


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Creates a session-scoped event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session", autouse=True)
async def db_lifecycle():
    """Initializes the database connection using isolated local test database."""
    from app.core.config import settings
    settings.DB_NAME = "cloudcrackers_test"
    settings.ENVIRONMENT = "test"
    settings.MONGODB_URL = "mongodb://localhost:27017"
    await db_manager.connect()
    yield
    # Safely disconnect without modifying or deleting live Atlas data
    await db_manager.disconnect()


@pytest.fixture(autouse=True)
def mock_cloudinary_for_tests(monkeypatch):
    """Mocks Cloudinary calls during tests to avoid external network dependencies."""
    import uuid
    from app.core import cloudinary as cloud_core

    async def fake_upload(file_data, folder="cloudcrackers"):
        mock_id = f"test_{uuid.uuid4().hex[:10]}"
        return {
            "public_id": f"{folder}/{mock_id}",
            "url": f"https://res.cloudinary.com/test_cloud/image/upload/{folder}/{mock_id}.jpg",
            "secure_url": f"https://res.cloudinary.com/test_cloud/image/upload/{folder}/{mock_id}.jpg",
            "resource_type": "image",
            "format": "jpg",
            "bytes": 50000,
            "width": 800,
            "height": 600,
            "folder": folder,
        }

    async def fake_delete(public_id):
        return {"result": "ok"}

    async def fake_replace(public_id, file_data, folder="cloudcrackers"):
        return await fake_upload(file_data, folder=folder)

    monkeypatch.setattr(cloud_core, "upload_image", fake_upload)
    monkeypatch.setattr(cloud_core, "delete_image", fake_delete)
    monkeypatch.setattr(cloud_core, "replace_image", fake_replace)


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Generates an async HTTP client for routing tests."""
    if use_transport:
        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as ac:
            yield ac
    else:
        # Fallback for older httpx versions
        async with AsyncClient(app=app, base_url="http://testserver") as ac:
            yield ac


@pytest.fixture
async def admin_user() -> User:
    """Fixture to ensure an admin user is loaded in MongoDB and in active state."""
    admin = await User.find_one(User.email == "admin@example.com")
    if not admin:
        from app.core.security import hash_password
        admin = User(
            full_name="Admin User",
            email="admin@example.com",
            phone="+19999999999",
            password_hash=hash_password("AdminPassword123!"),
            role="ADMIN",
            is_verified=True,
            is_active=True,
            status="active",
        )
        await admin.insert()
    else:
        admin.status = "active"
        admin.is_active = True
        admin.role = "ADMIN"
        await admin.save()
    return admin


@pytest.fixture
async def admin_headers(admin_user: User) -> dict:
    """Fixture that generates authorization headers for the admin user."""
    from app.core.security import create_access_token
    payload = {"sub": str(admin_user.id), "role": admin_user.role}
    token = create_access_token(payload)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def customer_user() -> User:
    """Fixture to ensure a customer user is loaded in MongoDB and in active state."""
    customer = await User.find_one(User.email == "customer@example.com")
    if not customer:
        from app.core.security import hash_password
        customer = User(
            full_name="Customer User",
            email="customer@example.com",
            phone="+18888888888",
            password_hash=hash_password("CustomerPassword123!"),
            role="CUSTOMER",
            is_verified=True,
            is_active=True,
            status="active",
        )
        await customer.insert()
    else:
        customer.status = "active"
        customer.is_active = True
        customer.role = "CUSTOMER"
        await customer.save()
    return customer


@pytest.fixture
async def customer_headers(customer_user: User) -> dict:
    """Fixture that generates authorization headers for the customer user."""
    from app.core.security import create_access_token
    payload = {"sub": str(customer_user.id), "role": customer_user.role}
    token = create_access_token(payload)
    return {"Authorization": f"Bearer {token}"}

