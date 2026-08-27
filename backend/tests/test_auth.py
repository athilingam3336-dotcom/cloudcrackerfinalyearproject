import pytest
from httpx import AsyncClient

from app.models.user import User


@pytest.fixture(autouse=True)
async def clean_db():
    """Wipes the Users collection in MongoDB before each test to ensure test isolation."""
    await User.find_all().delete()
    yield


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    """Tests successful user registration and token receipt."""
    payload = {
        "full_name": "Test User",
        "email": "testuser@example.com",
        "phone": "+12345678901",
        "password": "Password123!",
        "confirm_password": "Password123!",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    res_json = response.json()
    assert res_json["success"] is True
    assert res_json["message"] == "Registration Successful"
    assert "access_token" in res_json["data"]
    assert "refresh_token" in res_json["data"]
    assert res_json["data"]["user"]["email"] == "testuser@example.com"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    """Tests duplicate email registration returns a validation error (422)."""
    # 1. Register first user
    user1 = {
        "full_name": "User One",
        "email": "duplicate@example.com",
        "phone": "+12345678902",
        "password": "Password123!",
        "confirm_password": "Password123!",
    }
    await client.post("/api/v1/auth/register", json=user1)

    # 2. Register second user with same email
    user2 = {
        "full_name": "User Two",
        "email": "duplicate@example.com",
        "phone": "+12345678903",
        "password": "Password123!",
        "confirm_password": "Password123!",
    }
    response = await client.post("/api/v1/auth/register", json=user2)
    assert response.status_code == 422
    res_json = response.json()
    assert res_json["success"] is False
    assert "email" in res_json["message"]


@pytest.mark.asyncio
async def test_register_duplicate_phone(client: AsyncClient):
    """Tests duplicate phone number registration returns a validation error (422)."""
    # 1. Register first user
    user1 = {
        "full_name": "User One",
        "email": "user1@example.com",
        "phone": "+12345678904",
        "password": "Password123!",
        "confirm_password": "Password123!",
    }
    await client.post("/api/v1/auth/register", json=user1)

    # 2. Register second user with same phone
    user2 = {
        "full_name": "User Two",
        "email": "user2@example.com",
        "phone": "+12345678904",
        "password": "Password123!",
        "confirm_password": "Password123!",
    }
    response = await client.post("/api/v1/auth/register", json=user2)
    assert response.status_code == 422
    res_json = response.json()
    assert res_json["success"] is False
    assert "phone" in res_json["message"]


@pytest.mark.asyncio
async def test_register_weak_password(client: AsyncClient):
    """Tests password strength checks block registration (422)."""
    payload = {
        "full_name": "Test User",
        "email": "weak@example.com",
        "phone": "+12345678905",
        "password": "weak",
        "confirm_password": "weak",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422
    res_json = response.json()
    assert res_json["success"] is False
    assert "Password must be at least" in res_json["message"]


@pytest.mark.asyncio
async def test_register_passwords_mismatch(client: AsyncClient):
    """Tests password confirmation mismatch checks block registration (422)."""
    payload = {
        "full_name": "Test User",
        "email": "mismatch@example.com",
        "phone": "+12345678906",
        "password": "Password123!",
        "confirm_password": "Password123?Mismatch",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422
    res_json = response.json()
    assert res_json["success"] is False
    assert "Passwords do not match" in res_json["message"]


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    """Tests authentication logic and token issuance."""
    # 1. Register
    payload = {
        "full_name": "Login User",
        "email": "login@example.com",
        "phone": "+12345678907",
        "password": "Password123!",
        "confirm_password": "Password123!",
    }
    await client.post("/api/v1/auth/register", json=payload)

    # 2. Login
    login_payload = {
        "email": "login@example.com",
        "password": "Password123!",
    }
    response = await client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["success"] is True
    assert res_json["message"] == "Login Successful"
    assert "access_token" in res_json["data"]
    assert "refresh_token" in res_json["data"]


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    """Tests authentication failure blocks session creation (401)."""
    # 1. Register
    payload = {
        "full_name": "Login User",
        "email": "loginwrong@example.com",
        "phone": "+12345678908",
        "password": "Password123!",
        "confirm_password": "Password123!",
    }
    await client.post("/api/v1/auth/register", json=payload)

    # 2. Login with wrong password
    login_payload = {
        "email": "loginwrong@example.com",
        "password": "WrongPassword!",
    }
    response = await client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 401
    res_json = response.json()
    assert res_json["success"] is False
    assert "Invalid email or password" in res_json["message"]


@pytest.mark.asyncio
async def test_get_me_protected_route(client: AsyncClient):
    """Tests that access to /me is protected and extracts valid claims (200)."""
    # 1. Check unprotected request throws 401
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401

    # 2. Register & get credentials
    payload = {
        "full_name": "Auth Me User",
        "email": "authme@example.com",
        "phone": "+12345678909",
        "password": "Password123!",
        "confirm_password": "Password123!",
    }
    reg_response = await client.post("/api/v1/auth/register", json=payload)
    reg_json = reg_response.json()
    token = reg_json["data"]["access_token"]

    # 3. Call with valid bearer header
    headers = {"Authorization": f"Bearer {token}"}
    auth_response = await client.get("/api/v1/auth/me", headers=headers)
    assert auth_response.status_code == 200
    me_json = auth_response.json()
    assert me_json["success"] is True
    assert me_json["data"]["email"] == "authme@example.com"


@pytest.mark.asyncio
async def test_refresh_token(client: AsyncClient):
    """Tests refresh token rotation functionality (200)."""
    # 1. Register
    payload = {
        "full_name": "Refresh User",
        "email": "refresh@example.com",
        "phone": "+12345678910",
        "password": "Password123!",
        "confirm_password": "Password123!",
    }
    reg_response = await client.post("/api/v1/auth/register", json=payload)
    reg_json = reg_response.json()
    refresh_token = reg_json["data"]["refresh_token"]

    # 2. Call refresh endpoint
    refresh_payload = {"refresh_token": refresh_token}
    response = await client.post("/api/v1/auth/refresh", json=refresh_payload)
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["success"] is True
    assert "access_token" in res_json["data"]
    assert "refresh_token" in res_json["data"]


@pytest.mark.asyncio
async def test_forgot_password(client: AsyncClient):
    """Tests forgot password validation and 404/200 scenarios."""
    # 1. Test user not found 404
    response = await client.post(
        "/api/v1/auth/forgot-password", json={"email": "nonexistent@example.com"}
    )
    assert response.status_code == 404

    # 2. Register user
    payload = {
        "full_name": "Reset User",
        "email": "reset@example.com",
        "phone": "+12345678911",
        "password": "Password123!",
        "confirm_password": "Password123!",
    }
    await client.post("/api/v1/auth/register", json=payload)

    # 3. Test successful request
    response = await client.post(
        "/api/v1/auth/forgot-password", json={"email": "reset@example.com"}
    )
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["success"] is True


@pytest.mark.asyncio
async def test_reset_password(client: AsyncClient):
    """Tests password reset functionality and immediate login with new credentials."""
    # 1. Register
    payload = {
        "full_name": "Reset Password User",
        "email": "resetuser@example.com",
        "phone": "+12345678912",
        "password": "OldPassword123!",
        "confirm_password": "OldPassword123!",
    }
    await client.post("/api/v1/auth/register", json=payload)

    # 2. Reset password
    reset_payload = {
        "email": "resetuser@example.com",
        "password": "NewPassword123!",
        "confirm_password": "NewPassword123!",
    }
    reset_res = await client.post("/api/v1/auth/reset-password", json=reset_payload)
    assert reset_res.status_code == 200
    reset_json = reset_res.json()
    assert reset_json["success"] is True
    assert "access_token" in reset_json["data"]

    # 3. Login with old password fails
    old_login = await client.post("/api/v1/auth/login", json={
        "email": "resetuser@example.com",
        "password": "OldPassword123!"
    })
    assert old_login.status_code == 401

    # 4. Login with new password succeeds
    new_login = await client.post("/api/v1/auth/login", json={
        "email": "resetuser@example.com",
        "password": "NewPassword123!"
    })
    assert new_login.status_code == 200
    assert new_login.json()["success"] is True


@pytest.mark.asyncio
async def test_google_user_auth_flow(client: AsyncClient):
    """Tests Google OAuth registration, password login guidance, and setting password via register."""
    # 1. Google login creates user without password
    google_payload = {
        "email": "googleuser@example.com",
        "full_name": "Google User",
        "google_id": "google_12345",
    }
    g_res = await client.post("/api/v1/auth/google", json=google_payload)
    assert g_res.status_code == 200

    # 2. Attempt password login gives clear Google guidance
    pw_login = await client.post("/api/v1/auth/login", json={
        "email": "googleuser@example.com",
        "password": "RandomPassword123!"
    })
    assert pw_login.status_code == 401
    assert "Google Sign-In" in pw_login.json()["message"]

    # 3. Setting password via Register endpoint seamlessly upgrades the account
    reg_payload = {
        "full_name": "Google User Upgraded",
        "email": "googleuser@example.com",
        "phone": "+12345678913",
        "password": "SetPassword123!",
        "confirm_password": "SetPassword123!",
    }
    upgrade_res = await client.post("/api/v1/auth/register", json=reg_payload)
    assert upgrade_res.status_code == 200 or upgrade_res.status_code == 201
    assert upgrade_res.json()["success"] is True

    # 4. Login with the newly set password succeeds
    login_res = await client.post("/api/v1/auth/login", json={
        "email": "googleuser@example.com",
        "password": "SetPassword123!"
    })
    assert login_res.status_code == 200
    assert login_res.json()["success"] is True


@pytest.mark.asyncio
async def test_instagram_user_auth_flow(client: AsyncClient):
    """Tests Instagram OAuth registration and authentication."""
    insta_payload = {
        "username": "athi_pyro",
        "full_name": "Athilingam Instagram",
        "instagram_id": "insta_123456",
    }
    res = await client.post("/api/v1/auth/instagram", json=insta_payload)
    assert res.status_code == 200
    res_json = res.json()
    assert res_json["success"] is True
    assert res_json["message"] == "Instagram Login Successful"
    assert "access_token" in res_json["data"]
    assert res_json["data"]["user"]["auth_provider"] == "instagram"
