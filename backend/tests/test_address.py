import pytest
from httpx import AsyncClient

from app.models.address import Address


@pytest.fixture(autouse=True)
async def clean_address_db():
    """Wipes addresses collection before each test."""
    await Address.find_all().delete()
    yield


@pytest.mark.asyncio
async def test_add_address_success(client: AsyncClient, customer_headers: dict):
    """Tests adding a new address for a customer."""
    payload = {
        "full_name": "John Doe",
        "phone": "+15551234567",
        "address_line1": "123 Main St",
        "address_line2": "Apt 4B",
        "city": "Boston",
        "state": "MA",
        "country": "USA",
        "postal_code": "02111",
        "address_type": "Home",
        "is_default": True,
    }
    response = await client.post("/api/v1/address", json=payload, headers=customer_headers)
    assert response.status_code == 201
    res_json = response.json()
    assert res_json["success"] is True
    assert res_json["data"]["full_name"] == "John Doe"
    assert res_json["data"]["is_default"] is True


@pytest.mark.asyncio
async def test_only_one_default_address(client: AsyncClient, customer_headers: dict):
    """Tests that setting a new default address clears default flags on previous addresses."""
    # 1. Create first address as default
    a1 = {
        "full_name": "First Address",
        "phone": "+15551234567",
        "address_line1": "123 St",
        "city": "Boston",
        "state": "MA",
        "country": "USA",
        "postal_code": "02111",
        "is_default": True,
    }
    await client.post("/api/v1/address", json=a1, headers=customer_headers)

    # 2. Create second address as default
    a2 = {
        "full_name": "Second Address",
        "phone": "+15551234567",
        "address_line1": "456 St",
        "city": "Boston",
        "state": "MA",
        "country": "USA",
        "postal_code": "02111",
        "is_default": True,
    }
    create2 = await client.post("/api/v1/address", json=a2, headers=customer_headers)
    id2 = create2.json()["data"]["id"]

    # 3. Retrieve list and verify second is default, first is no longer default
    list_res = await client.get("/api/v1/address", headers=customer_headers)
    items = list_res.json()["data"]
    assert len(items) == 2

    for item in items:
        if item["id"] == id2:
            assert item["is_default"] is True
        else:
            assert item["is_default"] is False


@pytest.mark.asyncio
async def test_update_and_delete_address(client: AsyncClient, customer_headers: dict):
    """Tests updating address fields and soft deleting them."""
    # 1. Create address
    a = {
        "full_name": "Original Name",
        "phone": "+15551234567",
        "address_line1": "123 St",
        "city": "Boston",
        "state": "MA",
        "country": "USA",
        "postal_code": "02111",
        "is_default": False,
    }
    create_res = await client.post("/api/v1/address", json=a, headers=customer_headers)
    address_id = create_res.json()["data"]["id"]

    # 2. Update address
    update_payload = {"full_name": "Updated Name", "is_default": True}
    update_res = await client.put(
        f"/api/v1/address/{address_id}", json=update_payload, headers=customer_headers
    )
    assert update_res.status_code == 200
    assert update_res.json()["data"]["full_name"] == "Updated Name"

    # 3. Delete address
    del_res = await client.delete(f"/api/v1/address/{address_id}", headers=customer_headers)
    assert del_res.status_code == 200

    # 4. View history list -> should be empty
    list_res = await client.get("/api/v1/address", headers=customer_headers)
    assert len(list_res.json()["data"]) == 0
