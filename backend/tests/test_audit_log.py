import pytest
from httpx import AsyncClient

from app.models.audit_log import AuditLog
from app.models.user import User


@pytest.fixture(autouse=True)
async def clean_audit_log_db():
    """Wipes audit logs collection before each test."""
    await AuditLog.find_all().delete()
    yield


@pytest.mark.asyncio
async def test_admin_create_and_list_audit_log(
    client: AsyncClient, admin_headers: dict, customer_user: User
):
    """Tests creating and fetching audit log entries as admin."""
    payload = {
        "user_id": str(customer_user.id),
        "action": "USER_UPDATE",
        "resource": "Users",
        "resource_id": str(customer_user.id),
        "details": {"changed_field": "phone"},
    }
    create_res = await client.post(
        "/api/v1/admin/audit-logs", json=payload, headers=admin_headers
    )
    assert create_res.status_code == 201
    log_id = create_res.json()["data"]["id"]

    # List logs
    list_res = await client.get("/api/v1/admin/audit-logs", headers=admin_headers)
    assert list_res.status_code == 200
    assert list_res.json()["data"]["total_count"] == 1

    # Get single log details
    get_res = await client.get(
        f"/api/v1/admin/audit-logs/{log_id}", headers=admin_headers
    )
    assert get_res.status_code == 200
    assert get_res.json()["data"]["action"] == "USER_UPDATE"


@pytest.mark.asyncio
async def test_customer_cannot_access_audit_logs(
    client: AsyncClient, customer_headers: dict
):
    """Tests that customer cannot access audit log endpoints."""
    res = await client.get("/api/v1/admin/audit-logs", headers=customer_headers)
    assert res.status_code == 403
