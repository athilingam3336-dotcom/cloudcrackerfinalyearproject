from unittest.mock import AsyncMock
import pytest
from httpx import AsyncClient

from app.core.database import db_manager


@pytest.mark.asyncio
async def test_root_endpoint(client: AsyncClient):
    """Tests the root endpoint returns correct success structure."""
    response = await client.get("/")
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["success"] is True
    assert "Welcome" in res_json["message"]


@pytest.mark.asyncio
async def test_health_endpoint_healthy(client: AsyncClient):
    """Tests GET /health returns 200 with ok status and connected database when MongoDB is reachable."""
    response = await client.get("/health")
    assert response.status_code == 200
    res_json = response.json()
    assert res_json == {
        "status": "ok",
        "service": "cloudcrackers-backend",
        "database": "connected",
    }


@pytest.mark.asyncio
async def test_health_endpoint_db_disconnected(client: AsyncClient, monkeypatch: pytest.MonkeyPatch):
    """Tests GET /health returns 503 with disconnected database when db client is None."""
    monkeypatch.setattr(db_manager, "client", None)
    response = await client.get("/health")
    assert response.status_code == 503
    res_json = response.json()
    assert res_json == {
        "status": "unhealthy",
        "service": "cloudcrackers-backend",
        "database": "disconnected",
    }


@pytest.mark.asyncio
async def test_health_endpoint_db_ping_failure(client: AsyncClient, monkeypatch: pytest.MonkeyPatch):
    """Tests GET /health returns 503 when MongoDB ping command raises an exception."""
    mock_db = AsyncMock()
    mock_db.command.side_effect = Exception("MongoDB Atlas connection timeout")
    monkeypatch.setattr(db_manager, "db", mock_db)
    response = await client.get("/health")
    assert response.status_code == 503
    res_json = response.json()
    assert res_json == {
        "status": "unhealthy",
        "service": "cloudcrackers-backend",
        "database": "disconnected",
    }


@pytest.mark.asyncio
async def test_api_v1_health_endpoint(client: AsyncClient):
    """Tests the legacy /api/v1/health endpoint remains functional."""
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    res_json = response.json()
    assert "success" in res_json
    assert "message" in res_json
    assert "data" in res_json
    assert "status" in res_json["data"]
    assert "database" in res_json["data"]


def test_production_environment_rejects_localhost_mongodb(monkeypatch: pytest.MonkeyPatch):
    """Verifies that Settings raises ValueError when production environment is configured with localhost or missing URI."""
    from app.core.config import Settings

    # Case 1: production with localhost URI must be rejected
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("MONGODB_URI", "mongodb://localhost:27017/cloudcrackers")
    with pytest.raises(ValueError, match="Localhost MongoDB cannot be used in production"):
        Settings(_env_file=None)

    # Case 2: production with 127.0.0.1 URI must be rejected
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("MONGODB_URI", "mongodb://127.0.0.1:27017/cloudcrackers")
    with pytest.raises(ValueError, match="Localhost MongoDB cannot be used in production"):
        Settings(_env_file=None)

    # Case 3: production without MONGODB_URI must be rejected
    monkeypatch.delenv("MONGODB_URI", raising=False)
    with pytest.raises(ValueError, match="MONGODB_URI must be set in production"):
        Settings(_env_file=None, MONGODB_URI=None)

    # Case 4: production with valid remote Atlas URI succeeds validation
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("MONGODB_URI", "mongodb+srv://admin:secret@cluster0.abcde.mongodb.net/cloudcrackers?retryWrites=true&w=majority")
    prod_settings = Settings(_env_file=None)
    assert prod_settings.is_production is True
    assert prod_settings.MONGODB_URL.startswith("mongodb+srv://")



