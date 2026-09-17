import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_settings_public(client: AsyncClient):
    response = await client.get("/api/v1/settings")
    assert response.status_code == 200
    data = response.json()["data"]
    assert "min_online_delivery_amount" in data
    assert data["min_online_delivery_amount"] == 5000.0


@pytest.mark.asyncio
async def test_admin_update_settings(client: AsyncClient, admin_headers: dict):
    # Update threshold to 3000
    update_res = await client.put(
        "/api/v1/admin/settings",
        json={"min_online_delivery_amount": 3000.0, "store_name": "Meera Crackers"},
        headers=admin_headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["data"]["min_online_delivery_amount"] == 3000.0

    # Verify public settings reflects 3000
    get_res = await client.get("/api/v1/settings")
    assert get_res.status_code == 200
    assert get_res.json()["data"]["min_online_delivery_amount"] == 3000.0

    # Reset back to default 5000.0 for subsequent test isolation
    await client.put(
        "/api/v1/admin/settings",
        json={"min_online_delivery_amount": 5000.0, "store_name": "Meera Crackers"},
        headers=admin_headers,
    )



@pytest.mark.asyncio
async def test_customer_cannot_update_settings(client: AsyncClient, customer_headers: dict):
    response = await client.put(
        "/api/v1/admin/settings",
        json={"min_online_delivery_amount": 1000.0},
        headers=customer_headers,
    )
    assert response.status_code in (401, 403)
