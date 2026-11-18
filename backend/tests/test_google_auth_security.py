"""
test_google_auth_security.py

Comprehensive security tests for the Google OAuth ID token verification fix.

Tests verify:
1. A valid Google ID token is accepted (mocked).
2. A missing ID token is rejected (schema validation).
3. A forged / invalid token is rejected (401).
4. An expired token is rejected (401).
5. A token with the wrong audience is rejected (401).
6. An unverified email is rejected (401).
7. A client-supplied email cannot impersonate another user.
8. Existing blocked/inactive account checks still work.
9. Admin-only routes are not bypassed.
10. Clerk JWT verification path (mocked).
11. Production mode with no verification config blocks the endpoint.
"""

import base64
import json
import time
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient

from app.models.user import User


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_jwt_payload_b64(payload: dict) -> str:
    """Return a base64url-encoded JWT payload string (middle segment only)."""
    raw = json.dumps(payload).encode()
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def _fake_jwt(payload: dict) -> str:
    """Construct a fake three-part JWT with the given payload (signature is bogus)."""
    header = base64.urlsafe_b64encode(json.dumps({"alg": "RS256"}).encode()).rstrip(b"=").decode()
    body = _make_jwt_payload_b64(payload)
    return f"{header}.{body}.fakesig"


def _valid_google_idinfo(email: str = "valid@example.com", sub: str = "google_sub_123") -> dict:
    """Return a minimal verified Google ID token payload."""
    return {
        "iss": "https://accounts.google.com",
        "aud": "test-client-id.apps.googleusercontent.com",
        "sub": sub,
        "email": email,
        "email_verified": True,
        "name": "Valid User",
        "picture": "https://lh3.googleusercontent.com/photo.jpg",
        "exp": int(time.time()) + 3600,
        "iat": int(time.time()),
    }


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
async def clean_db():
    """Wipes the Users collection before each test for isolation."""
    await User.find_all().delete()
    yield


@pytest.fixture()
def google_client_id():
    return "test-client-id.apps.googleusercontent.com"


@pytest.fixture()
def valid_google_idinfo(google_client_id):
    return _valid_google_idinfo()


@pytest.fixture()
def valid_google_token(valid_google_idinfo):
    """A fake JWT whose payload decodes to a valid Google idinfo."""
    return _fake_jwt(valid_google_idinfo)


# ---------------------------------------------------------------------------
# 1. Valid Google ID token is accepted
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_valid_google_id_token_accepted(client: AsyncClient, valid_google_token, valid_google_idinfo, google_client_id):
    """A properly-verified Google ID token should create a user and return JWT tokens."""
    with patch("app.core.config.settings.GOOGLE_CLIENT_ID", google_client_id), \
         patch("app.core.config.settings.CLERK_PUBLISHABLE_KEY", None), \
         patch("app.core.config.settings.CLERK_JWKS_URL", None), \
         patch("app.core.config.settings.ENVIRONMENT", "production"), \
         patch("app.services.auth_service.HAS_GOOGLE_AUTH", True), \
         patch("app.services.auth_service.google_id_token") as mock_git:

        mock_git.verify_oauth2_token.return_value = valid_google_idinfo

        payload = {"id_token": valid_google_token}
        response = await client.post("/api/v1/auth/google", json=payload)

    assert response.status_code == 200, response.text
    res_json = response.json()
    assert res_json["success"] is True
    assert res_json["message"] == "Google Login Successful"
    assert "access_token" in res_json["data"]
    assert "refresh_token" in res_json["data"]
    assert res_json["data"]["user"]["email"] == "valid@example.com"


# ---------------------------------------------------------------------------
# 2. Missing ID token is rejected at schema level
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_missing_id_token_rejected(client: AsyncClient):
    """Omitting id_token should fail Pydantic validation (422)."""
    response = await client.post("/api/v1/auth/google", json={})
    assert response.status_code == 422
    res_json = response.json()
    assert res_json["success"] is False


@pytest.mark.asyncio
async def test_empty_id_token_rejected(client: AsyncClient):
    """An empty string id_token should fail Pydantic validation (422)."""
    response = await client.post("/api/v1/auth/google", json={"id_token": ""})
    assert response.status_code == 422
    res_json = response.json()
    assert res_json["success"] is False


# ---------------------------------------------------------------------------
# 3. Forged / invalid token is rejected
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_forged_token_rejected(client: AsyncClient, google_client_id):
    """A token with an invalid signature must be rejected with 401."""
    with patch("app.core.config.settings.GOOGLE_CLIENT_ID", google_client_id), \
         patch("app.core.config.settings.CLERK_PUBLISHABLE_KEY", None), \
         patch("app.core.config.settings.CLERK_JWKS_URL", None), \
         patch("app.core.config.settings.ENVIRONMENT", "production"), \
         patch("app.services.auth_service.HAS_GOOGLE_AUTH", True), \
         patch("app.services.auth_service.google_id_token") as mock_git:

        mock_git.verify_oauth2_token.side_effect = ValueError("Invalid token signature")

        payload = {"id_token": "forged.invalid.token"}
        response = await client.post("/api/v1/auth/google", json=payload)

    assert response.status_code == 401, response.text
    res_json = response.json()
    assert res_json["success"] is False
    assert "invalid" in res_json["message"].lower() or "expired" in res_json["message"].lower()


# ---------------------------------------------------------------------------
# 4. Expired token is rejected
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_expired_token_rejected(client: AsyncClient, google_client_id):
    """An expired Google ID token must be rejected with 401."""
    with patch("app.core.config.settings.GOOGLE_CLIENT_ID", google_client_id), \
         patch("app.core.config.settings.CLERK_PUBLISHABLE_KEY", None), \
         patch("app.core.config.settings.CLERK_JWKS_URL", None), \
         patch("app.core.config.settings.ENVIRONMENT", "production"), \
         patch("app.services.auth_service.HAS_GOOGLE_AUTH", True), \
         patch("app.services.auth_service.google_id_token") as mock_git:

        mock_git.verify_oauth2_token.side_effect = ValueError("Token expired: exp 1000 < 1700000000")

        expired_token = _fake_jwt({**_valid_google_idinfo(), "exp": 1000})
        payload = {"id_token": expired_token}
        response = await client.post("/api/v1/auth/google", json=payload)

    assert response.status_code == 401, response.text
    res_json = response.json()
    assert res_json["success"] is False


# ---------------------------------------------------------------------------
# 5. Token with wrong audience is rejected
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_wrong_audience_token_rejected(client: AsyncClient, google_client_id):
    """A token issued for a different OAuth client must be rejected with 401."""
    with patch("app.core.config.settings.GOOGLE_CLIENT_ID", google_client_id), \
         patch("app.core.config.settings.CLERK_PUBLISHABLE_KEY", None), \
         patch("app.core.config.settings.CLERK_JWKS_URL", None), \
         patch("app.core.config.settings.ENVIRONMENT", "production"), \
         patch("app.services.auth_service.HAS_GOOGLE_AUTH", True), \
         patch("app.services.auth_service.google_id_token") as mock_git:

        mock_git.verify_oauth2_token.side_effect = ValueError(
            "Token has wrong audience: wrong-client-id.apps.googleusercontent.com"
        )

        wrong_aud_token = _fake_jwt({**_valid_google_idinfo(), "aud": "wrong-client-id.apps.googleusercontent.com"})
        payload = {"id_token": wrong_aud_token}
        response = await client.post("/api/v1/auth/google", json=payload)

    assert response.status_code == 401, response.text
    res_json = response.json()
    assert res_json["success"] is False


# ---------------------------------------------------------------------------
# 6. Unverified email is rejected
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_unverified_email_rejected(client: AsyncClient, google_client_id):
    """A Google token with email_verified=False must be rejected with 401."""
    unverified_idinfo = {**_valid_google_idinfo(), "email_verified": False}

    with patch("app.core.config.settings.GOOGLE_CLIENT_ID", google_client_id), \
         patch("app.core.config.settings.CLERK_PUBLISHABLE_KEY", None), \
         patch("app.core.config.settings.CLERK_JWKS_URL", None), \
         patch("app.core.config.settings.ENVIRONMENT", "production"), \
         patch("app.services.auth_service.HAS_GOOGLE_AUTH", True), \
         patch("app.services.auth_service.google_id_token") as mock_git:

        mock_git.verify_oauth2_token.return_value = unverified_idinfo

        payload = {"id_token": "some.valid.looking.token"}
        response = await client.post("/api/v1/auth/google", json=payload)

    assert response.status_code == 401, response.text
    res_json = response.json()
    assert res_json["success"] is False
    assert "verified" in res_json["message"].lower()


# ---------------------------------------------------------------------------
# 7. Client-supplied email cannot impersonate another user
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_client_email_cannot_impersonate(client: AsyncClient, google_client_id):
    """
    The old vulnerability: attacker sends a different email in the body.
    With the fix: the backend ignores the body email and uses the token email.
    The request body no longer even has an email field in GoogleAuthRequest.
    This test verifies the schema rejects any attempt to pass a trusted email.
    """
    # 1. Register a victim user with password
    victim_email = "victim@example.com"
    await client.post("/api/v1/auth/register", json={
        "full_name": "Victim User",
        "email": victim_email,
        "phone": "+12345678901",
        "password": "Password123!",
        "confirm_password": "Password123!",
    })

    # 2. Attacker tries to use their own Google token but supply the victim email
    # The new schema only accepts id_token, not email — so this POST will
    # either be validated against the TOKEN's email (not body email) or fail.
    attacker_idinfo = _valid_google_idinfo(email="attacker@example.com", sub="attacker_sub")

    with patch("app.core.config.settings.GOOGLE_CLIENT_ID", google_client_id), \
         patch("app.core.config.settings.CLERK_PUBLISHABLE_KEY", None), \
         patch("app.core.config.settings.CLERK_JWKS_URL", None), \
         patch("app.core.config.settings.ENVIRONMENT", "production"), \
         patch("app.services.auth_service.HAS_GOOGLE_AUTH", True), \
         patch("app.services.auth_service.google_id_token") as mock_git:

        mock_git.verify_oauth2_token.return_value = attacker_idinfo

        # Even if attacker includes extra fields trying to influence the email,
        # the backend extracts identity only from the verified token.
        payload = {
            "id_token": "attacker.valid.token",
            # full_name and avatar_url are the only optional fields — no email field
            "full_name": victim_email,  # can't set email via full_name
        }
        response = await client.post("/api/v1/auth/google", json=payload)

    # Must succeed but authenticate the ATTACKER (attacker@example.com), not the victim
    assert response.status_code == 200, response.text
    res_json = response.json()
    assert res_json["success"] is True
    # Critical: the authenticated user must be the attacker, NOT the victim
    assert res_json["data"]["user"]["email"] == "attacker@example.com"
    assert res_json["data"]["user"]["email"] != victim_email

    # Verify the victim's account is untouched by logging in with their password
    login_res = await client.post("/api/v1/auth/login", json={
        "email": victim_email,
        "password": "Password123!",
    })
    assert login_res.status_code == 200
    assert login_res.json()["data"]["user"]["email"] == victim_email


# ---------------------------------------------------------------------------
# 8. Blocked/inactive account checks still work after fix
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_inactive_google_account_blocked(client: AsyncClient, google_client_id):
    """A deactivated account must still be blocked even with a valid Google token."""
    from app.core.security import hash_password

    # Create a deactivated Google user directly in DB
    inactive_user = User(
        full_name="Inactive Google",
        email="inactive_google@example.com",
        password_hash=None,
        role="CUSTOMER",
        is_verified=True,
        is_active=False,  # DEACTIVATED
        status="inactive",
        auth_provider="google",
        google_id="deactivated_sub",
    )
    await inactive_user.insert()

    idinfo = _valid_google_idinfo(email="inactive_google@example.com", sub="deactivated_sub")

    with patch("app.core.config.settings.GOOGLE_CLIENT_ID", google_client_id), \
         patch("app.core.config.settings.CLERK_PUBLISHABLE_KEY", None), \
         patch("app.core.config.settings.CLERK_JWKS_URL", None), \
         patch("app.core.config.settings.ENVIRONMENT", "production"), \
         patch("app.services.auth_service.HAS_GOOGLE_AUTH", True), \
         patch("app.services.auth_service.google_id_token") as mock_git:

        mock_git.verify_oauth2_token.return_value = idinfo
        payload = {"id_token": "some.valid.token"}
        response = await client.post("/api/v1/auth/google", json=payload)

    assert response.status_code == 401, response.text
    assert "deactivated" in response.json()["message"].lower()


# ---------------------------------------------------------------------------
# 9. Admin-only routes are not bypassed by Google login
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_google_user_cannot_access_admin_routes(client: AsyncClient, google_client_id):
    """A Google-authenticated CUSTOMER user must not access admin-only routes."""
    idinfo = _valid_google_idinfo(email="google_cust@example.com", sub="google_cust_sub")

    with patch("app.core.config.settings.GOOGLE_CLIENT_ID", google_client_id), \
         patch("app.core.config.settings.CLERK_PUBLISHABLE_KEY", None), \
         patch("app.core.config.settings.CLERK_JWKS_URL", None), \
         patch("app.core.config.settings.ENVIRONMENT", "production"), \
         patch("app.services.auth_service.HAS_GOOGLE_AUTH", True), \
         patch("app.services.auth_service.google_id_token") as mock_git:

        mock_git.verify_oauth2_token.return_value = idinfo
        payload = {"id_token": "some.valid.token"}
        response = await client.post("/api/v1/auth/google", json=payload)

    assert response.status_code == 200
    access_token = response.json()["data"]["access_token"]
    assert response.json()["data"]["user"]["role"] == "CUSTOMER"

    # Try accessing an admin dashboard endpoint
    admin_response = await client.get(
        "/api/v1/admin/dashboard",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    # Must be 403 Forbidden, not 200
    assert admin_response.status_code in (403, 401), admin_response.text


# ---------------------------------------------------------------------------
# 10. Clerk JWT verification path (mocked)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_clerk_jwt_verified_and_accepted(client: AsyncClient):
    """A valid Clerk session JWT should be verified via JWKS and accepted."""
    clerk_claims = {
        "iss": "https://my-app.clerk.accounts.dev",
        "sub": "user_clerk_abc123",
        "email": "clerkuser@example.com",
        "email_verified": True,
        "name": "Clerk User",
        "picture": "https://clerk.dev/avatar.jpg",
        "exp": int(time.time()) + 3600,
        "iat": int(time.time()),
    }
    clerk_token = _fake_jwt(clerk_claims)

    # Mock _verify_clerk_jwt to return the claims directly
    with patch("app.core.config.settings.CLERK_PUBLISHABLE_KEY", "pk_test_dGVzdC5jbGVyay5hY2NvdW50cy5kZXYk"), \
         patch("app.core.config.settings.GOOGLE_CLIENT_ID", None), \
         patch("app.core.config.settings.ENVIRONMENT", "production"), \
         patch.object(
             __import__("app.services.auth_service", fromlist=["AuthService"]).AuthService,
             "_verify_clerk_jwt",
             new_callable=AsyncMock,
             return_value=clerk_claims,
         ):

        payload = {"id_token": clerk_token}
        response = await client.post("/api/v1/auth/google", json=payload)

    assert response.status_code == 200, response.text
    res_json = response.json()
    assert res_json["success"] is True
    assert res_json["data"]["user"]["email"] == "clerkuser@example.com"


# ---------------------------------------------------------------------------
# 11. Production mode with no config blocks the endpoint
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_production_no_config_blocks_google_login(client: AsyncClient):
    """In production, if neither GOOGLE_CLIENT_ID nor CLERK config is set, reject with 401."""
    with patch("app.core.config.settings.GOOGLE_CLIENT_ID", None), \
         patch("app.core.config.settings.CLERK_PUBLISHABLE_KEY", None), \
         patch("app.core.config.settings.CLERK_JWKS_URL", None), \
         patch("app.core.config.settings.ENVIRONMENT", "production"):

        payload = {"id_token": "any.token.here"}
        response = await client.post("/api/v1/auth/google", json=payload)

    assert response.status_code == 401, response.text
    res_json = response.json()
    assert res_json["success"] is False


# ---------------------------------------------------------------------------
# 12. Development mode without config decodes without verification (warns)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_dev_mode_no_config_allows_with_warning(client: AsyncClient):
    """In development without any config, the endpoint decodes without verification (with a warning)."""
    dev_idinfo = _valid_google_idinfo(email="devonly@example.com")
    dev_token = _fake_jwt(dev_idinfo)

    with patch("app.core.config.settings.GOOGLE_CLIENT_ID", None), \
         patch("app.core.config.settings.CLERK_PUBLISHABLE_KEY", None), \
         patch("app.core.config.settings.CLERK_JWKS_URL", None), \
         patch("app.core.config.settings.ENVIRONMENT", "development"), \
         patch("app.core.config.settings.DEBUG", True):

        payload = {"id_token": dev_token}
        response = await client.post("/api/v1/auth/google", json=payload)

    # In dev mode this should still work (for developer convenience)
    assert response.status_code == 200, response.text
    res_json = response.json()
    assert res_json["success"] is True
    assert res_json["data"]["user"]["email"] == "devonly@example.com"


# ---------------------------------------------------------------------------
# 13. google-auth library missing raises clear error
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_missing_google_auth_library_raises_error(client: AsyncClient, google_client_id):
    """If google-auth is not installed, the endpoint must return 401 with a clear message."""
    with patch("app.core.config.settings.GOOGLE_CLIENT_ID", google_client_id), \
         patch("app.core.config.settings.CLERK_PUBLISHABLE_KEY", None), \
         patch("app.core.config.settings.CLERK_JWKS_URL", None), \
         patch("app.core.config.settings.ENVIRONMENT", "production"), \
         patch("app.services.auth_service.HAS_GOOGLE_AUTH", False):

        payload = {"id_token": "some.token.here"}
        response = await client.post("/api/v1/auth/google", json=payload)

    assert response.status_code == 401, response.text
    assert "google-auth" in response.json()["message"].lower() or "unavailable" in response.json()["message"].lower()
