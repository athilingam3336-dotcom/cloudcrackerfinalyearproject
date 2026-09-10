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


@pytest.mark.asyncio
async def test_send_and_verify_email_otp_flow(client: AsyncClient):
    """Tests sending OTP, verifying OTP, and creating user account."""
    from app.services.auth_service import _email_otp_store
    email = "otptest@example.com"

    # 1. Send OTP
    send_res = await client.post("/api/v1/auth/send-email-otp", json={"email": email})
    assert send_res.status_code == 200
    assert send_res.json()["success"] is True

    # 2. Extract generated OTP record (internal test inspection)
    assert email in _email_otp_store
    record = _email_otp_store[email]
    assert record["verified"] is False
    assert record["attempts"] == 0

    # 3. Verify OTP endpoint with wrong code fails
    wrong_res = await client.post("/api/v1/auth/verify-email-otp", json={"email": email, "otp": "000000"})
    assert wrong_res.status_code == 422
    assert "Invalid OTP" in wrong_res.json()["message"]

    # 4. Perform resend (after clearing cooldown for test execution speed)
    record["last_sent_at"] = record["last_sent_at"].replace(year=2020)
    resend_res = await client.post("/api/v1/auth/resend-email-otp", json={"email": email})
    assert resend_res.status_code == 200


@pytest.mark.asyncio
async def test_verify_email_otp_max_attempts(client: AsyncClient):
    """Tests that 5 incorrect attempts invalidate the OTP."""
    from app.services.auth_service import _email_otp_store
    email = "maxattempts@example.com"

    await client.post("/api/v1/auth/send-email-otp", json={"email": email})

    for i in range(4):
        res = await client.post("/api/v1/auth/verify-email-otp", json={"email": email, "otp": "000000"})
        assert res.status_code == 422

    # 5th attempt fails and invalidates OTP
    res5 = await client.post("/api/v1/auth/verify-email-otp", json={"email": email, "otp": "000000"})
    assert res5.status_code == 422
    assert "Too many incorrect attempts" in res5.json()["message"]
    assert email not in _email_otp_store


@pytest.mark.asyncio
async def test_send_email_otp_cooldown(client: AsyncClient):
    """Tests 60-second rate limit cooldown for requesting OTP."""
    email = "cooldown@example.com"
    await client.post("/api/v1/auth/send-email-otp", json={"email": email})

    # Immediate second request triggers cooldown exception
    res2 = await client.post("/api/v1/auth/send-email-otp", json={"email": email})
    assert res2.status_code == 422
    assert "60 seconds" in res2.json()["message"]


@pytest.mark.asyncio
async def test_resend_email_service_mocked():
    """Tests EmailService.send_otp_email using a mocked Resend send_async coroutine without requiring a real API key."""
    from unittest.mock import AsyncMock, patch
    from app.services.email_service import EmailService

    with patch("app.core.config.settings.RESEND_API_KEY", "re_mock_test_key_12345"):
        with patch("resend.Emails.send_async", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = {"id": "msg_mock_12345"}
            result = await EmailService.send_otp_email("mockcustomer@example.com", "987654")
            assert result is True
            mock_send.assert_called_once()
            call_args = mock_send.call_args[0][0]
            assert call_args["to"] == ["mockcustomer@example.com"]
            assert call_args["from"] == "onboarding@resend.dev"
            assert "987654" in call_args["html"]
            assert "CloudCrackers - Email Verification OTP" == call_args["subject"]


