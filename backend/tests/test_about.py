import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_about_unauthenticated(client: AsyncClient):
    """Verify that unauthenticated users can view About details."""
    response = await client.get("/api/v1/about")
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["success"] is True
    assert "data" in res_json
    assert "version" in res_json["data"]
    assert "sections" in res_json["data"]
    assert len(res_json["data"]["sections"]) > 0


@pytest.mark.asyncio
async def test_update_about_unauthenticated(client: AsyncClient):
    """Verify that unauthenticated users cannot update About details."""
    payload = {
        "version": "v3.0.0",
        "description": "Updated Test Description",
        "sections": [{"title": "Test Title", "content": "Test Content"}]
    }
    response = await client.put("/api/v1/about", json=payload)
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_update_about_customer(client: AsyncClient, customer_headers: dict):
    """Verify that normal customer users cannot update About details."""
    payload = {
        "version": "v3.0.0",
        "description": "Updated Test Description",
        "sections": [{"title": "Test Title", "content": "Test Content"}]
    }
    response = await client.put("/api/v1/about", json=payload, headers=customer_headers)
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_update_about_admin(client: AsyncClient, admin_headers: dict):
    """Verify that admins can update About details, and changes persist."""
    payload = {
        "version": "v2.5.9-test",
        "description": "Updated Admin Test Description",
        "sections": [
            {"title": "🚀 New Sivakasi Tech", "content": "Completely new test payload section."}
        ]
    }
    response = await client.put("/api/v1/about", json=payload, headers=admin_headers)
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["success"] is True
    assert res_json["data"]["version"] == "v2.5.9-test"
    assert res_json["data"]["description"] == "Updated Admin Test Description"
    assert len(res_json["data"]["sections"]) == 1
    assert res_json["data"]["sections"][0]["title"] == "🚀 New Sivakasi Tech"

    # Confirm via GET
    get_res = await client.get("/api/v1/about")
    assert get_res.status_code == 200
    get_json = get_res.json()
    assert get_json["data"]["version"] == "v2.5.9-test"
    assert get_json["data"]["sections"][0]["content"] == "Completely new test payload section."
