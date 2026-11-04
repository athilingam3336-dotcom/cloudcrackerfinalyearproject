import pytest
from httpx import AsyncClient
from app.models.user import User
from app.models.order import Order
from app.models.payment import Payment
from app.core.security import hash_password


@pytest.fixture
async def second_admin() -> User:
    """Ensure a secondary active admin exists for dual authorization tests."""
    admin2 = await User.find_one(User.email == "admin2@example.com")
    if not admin2:
        admin2 = User(
            full_name="Secondary Admin",
            email="admin2@example.com",
            phone="+19999999998",
            password_hash=hash_password("Admin2Password123!"),
            role="ADMIN",
            is_verified=True,
            is_active=True,
            status="active",
        )
        await admin2.insert()
    else:
        admin2.status = "active"
        admin2.is_active = True
        admin2.role = "ADMIN"
        await admin2.save()
    return admin2


@pytest.mark.asyncio
async def test_store_reset_dual_authorization_flow(
    client: AsyncClient, admin_headers: dict, second_admin: User
):
    # 1. Check status
    res = await client.get("/api/v1/admin/store-reset/status", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["can_reset"] is True
    assert data["admin_count"] >= 2
    assert len(data["registered_admins_masked"]) >= 2

    # 2. Request OTP
    req_res = await client.post("/api/v1/admin/store-reset/request-otp", headers=admin_headers)
    assert req_res.status_code == 200
    req_data = req_res.json()["data"]
    session_id = req_data["session_id"]
    assert "admin1_masked" in req_data
    assert "admin2_masked" in req_data
    assert "@" in req_data["admin1_masked"]
    assert "@" in req_data["admin2_masked"]

    # 3. Test verification with wrong OTPs
    wrong_res = await client.post(
        "/api/v1/admin/store-reset/verify-and-reset",
        json={"session_id": session_id, "otp1": "000000", "otp2": "000000"},
        headers=admin_headers,
    )
    assert wrong_res.status_code == 400
    assert "invalid" in wrong_res.json()["message"].lower()

    # 4. Get active session internal OTPs to test successful dual authorization
    from app.api.v1.admin.store_reset import _RESET_SESSIONS
    session = _RESET_SESSIONS[session_id]
    valid_otp1 = session["otp1"]
    valid_otp2 = session["otp2"]

    # Test single wrong OTP (OTP1 right, OTP2 wrong)
    half_wrong = await client.post(
        "/api/v1/admin/store-reset/verify-and-reset",
        json={"session_id": session_id, "otp1": valid_otp1, "otp2": "999999"},
        headers=admin_headers,
    )
    assert half_wrong.status_code == 400
    assert "Administrator 2" in half_wrong.json()["message"]

    # Test successful dual OTP verification
    success_res = await client.post(
        "/api/v1/admin/store-reset/verify-and-reset",
        json={"session_id": session_id, "otp1": valid_otp1, "otp2": valid_otp2},
        headers=admin_headers,
    )
    assert success_res.status_code == 200
    assert success_res.json()["success"] is True
    assert "purged" in success_res.json()["message"].lower()

    # Verify session is cleaned up
    assert session_id not in _RESET_SESSIONS

