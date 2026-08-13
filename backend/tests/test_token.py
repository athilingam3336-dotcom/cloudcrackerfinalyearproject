from datetime import datetime, timedelta
import pytest
from httpx import AsyncClient

from app.models.refresh_token import RefreshToken
from app.models.user import User


@pytest.fixture(autouse=True)
async def clean_refresh_token_db():
    """Wipes refresh tokens collection before each test."""
    await RefreshToken.find_all().delete()
    yield


@pytest.mark.asyncio
async def test_revoke_token_and_revoke_all(
    client: AsyncClient, admin_headers: dict, customer_headers: dict, customer_user: User
):
    """Tests refresh token creation in DB, individual revocation, and bulk user revocation."""
    exp = datetime.utcnow() + timedelta(days=7)

    # 1. Create a refresh token in DB
    token_doc = RefreshToken(
        user_id=customer_user.id,
        token="dummy_refresh_token_string_123",
        is_revoked=False,
        expires_at=exp,
    )
    await token_doc.insert()

    payload = {
        "user_id": str(customer_user.id),
        "token": "dummy_refresh_token_string_123",
        "expires_at": exp.isoformat(),
    }

    # 2. Customer revokes single token
    revoke_res = await client.post(
        "/api/v1/tokens/revoke", json=payload, headers=customer_headers
    )
    assert revoke_res.status_code == 200
    assert revoke_res.json()["data"]["is_revoked"] is True

    # 3. Create another token in DB for bulk revoke test
    token_doc2 = RefreshToken(
        user_id=customer_user.id,
        token="dummy_refresh_token_string_456",
        is_revoked=False,
        expires_at=exp,
    )
    await token_doc2.insert()

    # 4. Customer revokes all tokens
    all_res = await client.post(
        "/api/v1/tokens/revoke-all", headers=customer_headers
    )
    assert all_res.status_code == 200
    assert all_res.json()["data"]["revoked_count"] == 1

    # 5. Create another token for admin revoke test
    token_doc3 = RefreshToken(
        user_id=customer_user.id,
        token="dummy_refresh_token_string_789",
        is_revoked=False,
        expires_at=exp,
    )
    await token_doc3.insert()

    # 6. Admin revokes user tokens
    admin_res = await client.post(
        f"/api/v1/admin/tokens/revoke-user/{customer_user.id}",
        headers=admin_headers,
    )
    assert admin_res.status_code == 200
    assert admin_res.json()["data"]["revoked_count"] == 1
