import pytest
from httpx import AsyncClient
from app.models.user import User
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
async def test_admin_promote_multi_stage_flow(
    client: AsyncClient, admin_headers: dict, second_admin: User
):
    # 1. Check status
    res = await client.get("/api/v1/admin/promote-admin/status", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["can_promote"] is True
    assert data["admin_count"] >= 2

    # 2. Cannot promote existing active admin
    dup_res = await client.post(
        "/api/v1/admin/promote-admin/request-promotion",
        json={"candidate_email": second_admin.email},
        headers=admin_headers,
    )
    assert dup_res.status_code == 400
    assert "already an active administrator" in dup_res.json()["message"]

    # Clean up candidate if exists from prior runs
    import uuid
    candidate_email = f"candidate_{uuid.uuid4().hex[:6]}@example.com"
    await User.find({"email": candidate_email}).delete()

    # 3. Request promotion for new candidate
    req_res = await client.post(
        "/api/v1/admin/promote-admin/request-promotion",
        json={"candidate_email": candidate_email, "full_name": "New Candidate"},
        headers=admin_headers,
    )
    assert req_res.status_code == 200
    req_data = req_res.json()["data"]
    session_id = req_data["session_id"]
    assert req_data["candidate_email"] == candidate_email
    assert req_data["admin1_email"]
    assert req_data["admin2_email"]

    # 4. Check internal session OTPs
    from app.api.v1.admin.admin_promote import _PROMOTION_SESSIONS
    session = _PROMOTION_SESSIONS[session_id]
    valid_otp1 = session["admin1_otp"]
    valid_otp2 = session["admin2_otp"]
    valid_candidate_otp = session["candidate_otp"]

    # 5. Wrong Dual OTPs
    wrong_dual = await client.post(
        "/api/v1/admin/promote-admin/verify-dual-otp",
        json={"session_id": session_id, "admin1_otp": "000000", "admin2_otp": "000000"},
        headers=admin_headers,
    )
    assert wrong_dual.status_code == 400
    assert "invalid" in wrong_dual.json()["message"].lower()

    # Half wrong Dual OTPs
    half_wrong = await client.post(
        "/api/v1/admin/promote-admin/verify-dual-otp",
        json={"session_id": session_id, "admin1_otp": valid_otp1, "admin2_otp": "000000"},
        headers=admin_headers,
    )
    assert half_wrong.status_code == 400
    assert "Administrator 2" in half_wrong.json()["message"]

    # 6. Correct Dual OTPs -> transitions to candidate verification
    correct_dual = await client.post(
        "/api/v1/admin/promote-admin/verify-dual-otp",
        json={"session_id": session_id, "admin1_otp": valid_otp1, "admin2_otp": valid_otp2},
        headers=admin_headers,
    )
    assert correct_dual.status_code == 200
    assert correct_dual.json()["data"]["dual_approved"] is True

    # 7. Wrong Candidate OTP
    wrong_cand = await client.post(
        "/api/v1/admin/promote-admin/verify-candidate-and-promote",
        json={"session_id": session_id, "candidate_otp": "000000"},
        headers=admin_headers,
    )
    assert wrong_cand.status_code == 400
    assert "Candidate OTP is invalid" in wrong_cand.json()["message"]

    # 8. Correct Candidate OTP -> Promoted!
    success_res = await client.post(
        "/api/v1/admin/promote-admin/verify-candidate-and-promote",
        json={"session_id": session_id, "candidate_otp": valid_candidate_otp},
        headers=admin_headers,
    )
    assert success_res.status_code == 200
    assert success_res.json()["data"]["role"] == "ADMIN"

    # Verify user in database is now ADMIN
    promoted_user = await User.find_one(User.email == candidate_email)
    assert promoted_user is not None
    assert promoted_user.role == "ADMIN"
    assert promoted_user.status == "active"

    # Verify session is cleaned up
    assert session_id not in _PROMOTION_SESSIONS


@pytest.mark.asyncio
async def test_admin_demote_dual_approval_flow(
    client: AsyncClient, admin_headers: dict, second_admin: User
):
    # Ensure third active admin exists so total admins >= 3
    admin3 = await User.find_one(User.email == "admin3_to_demote@example.com")
    if not admin3:
        admin3 = User(
            full_name="Admin Three To Demote",
            email="admin3_to_demote@example.com",
            phone="+19999999997",
            password_hash=hash_password("Admin3Password123!"),
            role="ADMIN",
            is_verified=True,
            is_active=True,
            status="active",
        )
        await admin3.insert()
    else:
        admin3.role = "ADMIN"
        admin3.status = "active"
        admin3.is_active = True
        await admin3.save()

    # 1. Check admins list
    list_res = await client.get("/api/v1/admin/promote-admin/admins-list", headers=admin_headers)
    assert list_res.status_code == 200
    list_data = list_res.json()["data"]
    assert list_data["admin_count"] >= 3
    assert list_data["can_demote"] is True

    # 2. Request demotion for admin3
    demote_req = await client.post(
        "/api/v1/admin/promote-admin/request-demotion",
        json={"target_admin_email": admin3.email},
        headers=admin_headers,
    )
    assert demote_req.status_code == 200
    req_data = demote_req.json()["data"]
    session_id = req_data["session_id"]
    assert req_data["target_admin_email"] == admin3.email
    # CRITICAL: Target admin MUST NOT be in the approval pair!
    assert req_data["admin1_email"] != admin3.email
    assert req_data["admin2_email"] != admin3.email

    from app.api.v1.admin.admin_promote import _DEMOTION_SESSIONS
    session = _DEMOTION_SESSIONS[session_id]
    valid_otp1 = session["admin1_otp"]
    valid_otp2 = session["admin2_otp"]

    # 3. Wrong OTPs fail
    wrong_res = await client.post(
        "/api/v1/admin/promote-admin/verify-demotion",
        json={"session_id": session_id, "admin1_otp": "111111", "admin2_otp": "222222"},
        headers=admin_headers,
    )
    assert wrong_res.status_code == 400

    # 4. Correct OTPs succeed
    correct_res = await client.post(
        "/api/v1/admin/promote-admin/verify-demotion",
        json={"session_id": session_id, "admin1_otp": valid_otp1, "admin2_otp": valid_otp2},
        headers=admin_headers,
    )
    assert correct_res.status_code == 200
    assert correct_res.json()["data"]["role"] == "USER"

    # 5. Verify database role is now USER
    demoted_user = await User.find_one(User.email == admin3.email)
    assert demoted_user is not None
    assert demoted_user.role == "USER"
    assert session_id not in _DEMOTION_SESSIONS
