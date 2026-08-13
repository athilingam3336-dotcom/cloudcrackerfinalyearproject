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
    """Initializes the database connection before running tests and re-seeds catalog after."""
    await db_manager.connect()
    yield
    try:
        from scripts.seed_catalog import seed_database
        await seed_database()
        from app.models.user import User
        from app.core.security import hash_password
        athi = await User.find_one(User.email == "athi@gmail.com")
        if not athi:
            athi = User(
                full_name="Athi Lingam",
                email="athi@gmail.com",
                phone="+91 9876543210",
                password_hash=hash_password("Password123!"),
                role="CUSTOMER",
                is_verified=True,
                is_active=True,
                status="active",
            )
            await athi.insert()
        else:
            athi.password_hash = hash_password("Password123!")
            athi.is_active = True
            athi.is_verified = True
            await athi.save()
    except Exception as e:
        print(f"Note: Post-test catalog reseed: {e}")
    await db_manager.disconnect()


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

