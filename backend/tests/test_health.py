import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_root_endpoint(client: AsyncClient):
    """Tests the root endpoint returns correct success structure."""
    response = await client.get("/")
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["success"] is True
    assert "Welcome" in res_json["message"]


@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient):
    """Tests the health check endpoint returns structural keys."""
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    res_json = response.json()
    assert "success" in res_json
    assert "message" in res_json
    assert "data" in res_json
    assert "status" in res_json["data"]
    assert "database" in res_json["data"]
