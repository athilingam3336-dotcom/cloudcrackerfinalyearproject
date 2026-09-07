import pytest
from httpx import AsyncClient

from app.models.category import Category
from app.models.product import Product
from app.models.inventory import Inventory


@pytest.fixture(autouse=True)
async def clean_inventory_db():
    """Wipes collections before each test."""
    await Inventory.find_all().delete()
    await Product.find_all().delete()
    await Category.find_all().delete()
    yield


@pytest.fixture
async def sample_product(client: AsyncClient, admin_headers: dict) -> dict:
    """Creates a sample category and product, returning the product details."""
    cat_payload = {
        "name": "Electronics",
        "description": "Category for electronics",
        "image_url": "http://example.com/electronics.jpg",
    }
    cat_res = await client.post("/api/v1/categories", json=cat_payload, headers=admin_headers)
    cat_id = cat_res.json()["data"]["id"]

    prod_payload = {
        "name": "Inventory Headphones",
        "description": "Noise cancelling headphones",
        "price": 200.0,
        "category_id": cat_id,
        "stock": 10,
        "images": ["http://example.com/headphones.png"],
    }
    prod_res = await client.post("/api/v1/products", json=prod_payload, headers=admin_headers)
    return prod_res.json()["data"]


@pytest.mark.asyncio
async def test_adjust_inventory_in_out(
    client: AsyncClient, admin_headers: dict, sample_product: dict
):
    """Tests stock IN/OUT transactions and product synchronization."""
    prod_id = sample_product["id"]

    # 1. Stock IN transaction (+5)
    payload_in = {
        "product_id": prod_id,
        "transaction_type": "IN",
        "quantity": 5,
        "remarks": "Received shipment",
    }
    res_in = await client.post("/api/v1/inventory/adjust", json=payload_in, headers=admin_headers)
    assert res_in.status_code == 200
    assert res_in.json()["data"]["current_stock"] == 15

    # Verify synced to Product stock
    prod = await Product.get(prod_id)
    assert prod.stock == 15

    # 2. Stock OUT transaction (-3)
    payload_out = {
        "product_id": prod_id,
        "transaction_type": "OUT",
        "quantity": 3,
        "remarks": "Fulfillment",
    }
    res_out = await client.post("/api/v1/inventory/adjust", json=payload_out, headers=admin_headers)
    assert res_out.status_code == 200
    assert res_out.json()["data"]["current_stock"] == 12

    # Verify synced to Product stock
    prod = await Product.get(prod_id)
    assert prod.stock == 12


@pytest.mark.asyncio
async def test_inventory_stock_alerts_and_history(
    client: AsyncClient, admin_headers: dict, sample_product: dict
):
    """Tests low-stock and out-of-stock listings alongside history logs."""
    prod_id = sample_product["id"]

    # Adjust stock to 3 (which is <= minimum_stock=5)
    payload_adjust = {
        "product_id": prod_id,
        "transaction_type": "ADJUST",
        "quantity": 3,
        "remarks": "Correction",
    }
    await client.post("/api/v1/inventory/adjust", json=payload_adjust, headers=admin_headers)

    # 1. Fetch low stock list
    low_res = await client.get("/api/v1/inventory/low-stock", headers=admin_headers)
    assert low_res.status_code == 200
    assert len(low_res.json()["data"]) == 1
    assert low_res.json()["data"][0]["product_id"] == prod_id

    # Adjust stock to 0 (out of stock)
    payload_out = {
        "product_id": prod_id,
        "transaction_type": "ADJUST",
        "quantity": 0,
        "remarks": "Purge",
    }
    await client.post("/api/v1/inventory/adjust", json=payload_out, headers=admin_headers)

    # 2. Fetch out of stock list
    out_res = await client.get("/api/v1/inventory/out-of-stock", headers=admin_headers)
    assert out_res.status_code == 200
    assert len(out_res.json()["data"]) == 1

@pytest.mark.asyncio
async def test_admin_get_inventory_details(
    client: AsyncClient, admin_headers: dict, sample_product: dict
):
    """Tests that admin can fetch inventory details for a product."""
    prod_id = sample_product["id"]
    res = await client.get(f"/api/v1/inventory/{prod_id}", headers=admin_headers)
    assert res.status_code == 200
    res_json = res.json()
    assert res_json["success"] is True
    assert res_json["data"]["product_id"] == prod_id
    assert res_json["data"]["current_stock"] == 10
    assert res_json["data"]["minimum_stock"] == 5


@pytest.mark.asyncio
async def test_customer_cannot_access_or_adjust_inventory(
    client: AsyncClient, customer_headers: dict, sample_product: dict
):
    """Tests that customer users receive 403 Forbidden on all inventory endpoints."""
    prod_id = sample_product["id"]

    # 1. Customer GET inventory details -> 403
    res1 = await client.get(f"/api/v1/inventory/{prod_id}", headers=customer_headers)
    assert res1.status_code == 403

    # 2. Customer POST adjust stock -> 403
    payload = {"product_id": prod_id, "transaction_type": "IN", "quantity": 10}
    res2 = await client.post("/api/v1/inventory/adjust", json=payload, headers=customer_headers)
    assert res2.status_code == 403

    # 3. Customer GET low stock -> 403
    res3 = await client.get("/api/v1/inventory/low-stock", headers=customer_headers)
    assert res3.status_code == 403

    # 4. Customer GET out of stock -> 403
    res4 = await client.get("/api/v1/inventory/out-of-stock", headers=customer_headers)
    assert res4.status_code == 403

    # 5. Customer GET overview -> 403
    res5 = await client.get("/api/v1/inventory/overview", headers=customer_headers)
    assert res5.status_code == 403


@pytest.mark.asyncio
async def test_invalid_adjustment_quantity_and_type_rejected(
    client: AsyncClient, admin_headers: dict, sample_product: dict
):
    """Tests that invalid quantity (<= 0 for IN/OUT) and invalid transaction type are rejected with 422."""
    prod_id = sample_product["id"]

    # Zero quantity for IN -> 422
    res_zero = await client.post(
        "/api/v1/inventory/adjust",
        json={"product_id": prod_id, "transaction_type": "IN", "quantity": 0},
        headers=admin_headers,
    )
    assert res_zero.status_code == 422

    # Negative quantity for OUT -> 422
    res_neg = await client.post(
        "/api/v1/inventory/adjust",
        json={"product_id": prod_id, "transaction_type": "OUT", "quantity": -5},
        headers=admin_headers,
    )
    assert res_neg.status_code == 422

    # Invalid transaction type -> 422
    res_bad_type = await client.post(
        "/api/v1/inventory/adjust",
        json={"product_id": prod_id, "transaction_type": "INVALID_TYPE", "quantity": 5},
        headers=admin_headers,
    )
    assert res_bad_type.status_code == 422


@pytest.mark.asyncio
async def test_insufficient_stock_out_rejected(
    client: AsyncClient, admin_headers: dict, sample_product: dict
):
    """Tests that deducting more units than available is rejected with 422."""
    prod_id = sample_product["id"]  # stock is 10

    res = await client.post(
        "/api/v1/inventory/adjust",
        json={"product_id": prod_id, "transaction_type": "OUT", "quantity": 50},
        headers=admin_headers,
    )
    assert res.status_code == 422
    assert "Insufficient stock" in res.json()["message"]


@pytest.mark.asyncio
async def test_invalid_and_nonexistent_product_id(
    client: AsyncClient, admin_headers: dict
):
    """Tests that malformed hex returns 422 and non-existent ObjectId returns 404."""
    # Malformed ID format -> 422
    res_invalid = await client.get("/api/v1/inventory/invalid-hex-id", headers=admin_headers)
    assert res_invalid.status_code == 422

    # Non-existent valid ObjectId -> 404
    non_existent = "60c72b2f9b1d8e1f0c2e3d4a"
    res_missing = await client.get(f"/api/v1/inventory/{non_existent}", headers=admin_headers)
    assert res_missing.status_code == 404


@pytest.mark.asyncio
async def test_admin_inventory_overview_endpoint(
    client: AsyncClient, admin_headers: dict, sample_product: dict
):
    """Tests GET /api/v1/inventory/overview with summary metrics, pagination, and search."""
    prod_id = sample_product["id"]

    # 1. Fetch overview
    res = await client.get("/api/v1/inventory/overview", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()["data"]

    # Assert metrics
    assert "metrics" in data
    assert data["metrics"]["total_products"] == 1
    assert data["metrics"]["total_stock_units"] == 10
    assert data["metrics"]["low_stock_count"] == 0
    assert data["metrics"]["out_of_stock_count"] == 0

    # Assert items list
    assert len(data["items"]) == 1
    assert data["items"][0]["product_id"] == prod_id
    assert data["items"][0]["name"] == "Inventory Headphones"
    assert data["items"][0]["stock"] == 10
    assert data["items"][0]["stock_status"] == "IN_STOCK"

    # 2. Search query test
    res_search = await client.get("/api/v1/inventory/overview?search=Headphones", headers=admin_headers)
    assert len(res_search.json()["data"]["items"]) == 1

    res_search_empty = await client.get("/api/v1/inventory/overview?search=NonExistent", headers=admin_headers)
    assert len(res_search_empty.json()["data"]["items"]) == 0

