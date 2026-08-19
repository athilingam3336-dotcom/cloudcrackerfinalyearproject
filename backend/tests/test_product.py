import pytest
from httpx import AsyncClient

from app.models.category import Category
from app.models.product import Product


@pytest.fixture(autouse=True)
async def clean_product_db():
    """Wipes Categories and Products collections before each test for test isolation."""
    await Product.find_all().delete()
    await Category.find_all().delete()
    yield


@pytest.fixture
async def sample_category(admin_headers: dict, client: AsyncClient) -> dict:
    """Fixture that inserts a sample category and returns its serialized representation."""
    payload = {
        "name": "Electronics",
        "description": "Category for electronics",
        "image_url": "http://example.com/electronics.jpg",
    }
    res = await client.post("/api/v1/categories", json=payload, headers=admin_headers)
    return res.json()["data"]


@pytest.mark.asyncio
async def test_create_product_success(
    client: AsyncClient, admin_headers: dict, sample_category: dict
):
    """Tests successful product creation by an admin."""
    payload = {
        "name": "Smartphone X",
        "description": "A high-end smartphone",
        "price": 999.99,
        "discount_price": 899.99,
        "category_id": sample_category["id"],
        "stock": 50,
        "images": ["http://example.com/phone1.jpg", "http://example.com/phone2.jpg"],
        "is_featured": True,
        "is_bestseller": False,
    }
    response = await client.post("/api/v1/products", json=payload, headers=admin_headers)
    assert response.status_code == 201
    res_json = response.json()
    assert res_json["success"] is True
    assert res_json["data"]["name"] == "Smartphone X"
    assert res_json["data"]["category_id"] == sample_category["id"]


@pytest.mark.asyncio
async def test_create_product_invalid_category(client: AsyncClient, admin_headers: dict):
    """Tests that creating a product under a non-existent category raises a validation error (422)."""
    # 24-char hex string representing an invalid ID
    non_existent_cat_id = "60c72b2f9b1d8e1f0c2e3d4a"
    payload = {
        "name": "Dummy Product",
        "description": "A dummy product",
        "price": 10.0,
        "category_id": non_existent_cat_id,
        "stock": 10,
    }
    response = await client.post("/api/v1/products", json=payload, headers=admin_headers)
    assert response.status_code == 422
    res_json = response.json()
    assert res_json["success"] is False
    assert "does not exist" in res_json["message"]


@pytest.mark.asyncio
async def test_create_product_price_discount_violation(
    client: AsyncClient, admin_headers: dict, sample_category: dict
):
    """Tests that discount price >= original price is blocked (422)."""
    payload = {
        "name": "Invalid Price Product",
        "description": "A product with bad pricing",
        "price": 100.0,
        "discount_price": 120.0,  # Invalid: discount greater than price
        "category_id": sample_category["id"],
        "stock": 5,
    }
    response = await client.post("/api/v1/products", json=payload, headers=admin_headers)
    assert response.status_code == 422
    res_json = response.json()
    assert res_json["success"] is False
    assert "Discount price must be strictly less" in res_json["message"]


@pytest.mark.asyncio
async def test_product_update_admin(
    client: AsyncClient, admin_headers: dict, sample_category: dict
):
    """Tests that products can be updated by an administrator."""
    # 1. Create product
    payload = {
        "name": "Initial Product",
        "description": "Initial description",
        "price": 50.0,
        "category_id": sample_category["id"],
        "stock": 10,
    }
    create_res = await client.post("/api/v1/products", json=payload, headers=admin_headers)
    prod_id = create_res.json()["data"]["id"]

    # 2. Update product
    update_payload = {
        "name": "Updated Product Name",
        "price": 45.0,
        "discount_price": 39.99,
        "stock": 8,
    }
    response = await client.put(
        f"/api/v1/products/{prod_id}", json=update_payload, headers=admin_headers
    )
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["success"] is True
    assert res_json["data"]["name"] == "Updated Product Name"
    assert res_json["data"]["discount_price"] == 39.99


@pytest.mark.asyncio
async def test_product_search_and_filters(
    client: AsyncClient, admin_headers: dict, sample_category: dict
):
    """Tests product listing filters: text search, price thresholds, flag states, and stocks."""
    # 1. Create 3 products
    p1 = {
        "name": "Alpha Phone",
        "description": "First phone",
        "price": 200.0,
        "category_id": sample_category["id"],
        "stock": 10,
        "is_featured": True,
    }
    p2 = {
        "name": "Beta Laptop",
        "description": "Second machine",
        "price": 800.0,
        "category_id": sample_category["id"],
        "stock": 5,
        "is_bestseller": True,
    }
    p3 = {
        "name": "Alpha Charger",
        "description": "Accessory",
        "price": 20.0,
        "category_id": sample_category["id"],
        "stock": 0,  # Out of stock
    }

    await client.post("/api/v1/products", json=p1, headers=admin_headers)
    await client.post("/api/v1/products", json=p2, headers=admin_headers)
    await client.post("/api/v1/products", json=p3, headers=admin_headers)

    # 2. Test search by name query
    res = await client.get("/api/v1/products?search=alpha")
    assert res.status_code == 200
    data = res.json()["data"]
    assert len(data["products"]) == 2
    assert all("Alpha" in prod["name"] for prod in data["products"])

    # 3. Test price range filters
    res = await client.get("/api/v1/products?min_price=100&max_price=300")
    data = res.json()["data"]
    assert len(data["products"]) == 1
    assert data["products"][0]["name"] == "Alpha Phone"

    # 4. Test is_featured filter
    res = await client.get("/api/v1/products?is_featured=true")
    data = res.json()["data"]
    assert len(data["products"]) == 1
    assert data["products"][0]["name"] == "Alpha Phone"

    # 5. Test stock availability filter
    res = await client.get("/api/v1/products?in_stock=true")
    data = res.json()["data"]
    assert len(data["products"]) == 2
    assert all(prod["stock"] > 0 for prod in data["products"])


@pytest.mark.asyncio
async def test_product_sorting_and_pagination(
    client: AsyncClient, admin_headers: dict, sample_category: dict
):
    """Tests product listing pagination steps and sorting rules."""
    # Create 3 products with different prices and timestamps
    prices = [30.0, 10.0, 50.0]
    for idx, price in enumerate(prices):
        payload = {
            "name": f"Product {idx}",
            "description": "Description",
            "price": price,
            "category_id": sample_category["id"],
            "stock": 10,
        }
        await client.post("/api/v1/products", json=payload, headers=admin_headers)

    # 1. Sort by price ascending
    res = await client.get("/api/v1/products?sort_by=price_asc&limit=10")
    prods = res.json()["data"]["products"]
    prices_out = [p["price"] for p in prods]
    assert prices_out == [10.0, 30.0, 50.0]

    # 2. Sort by price descending
    res = await client.get("/api/v1/products?sort_by=price_desc&limit=10")
    prods = res.json()["data"]["products"]
    prices_out = [p["price"] for p in prods]
    assert prices_out == [50.0, 30.0, 10.0]

    # 3. Test pagination steps
    res = await client.get("/api/v1/products?page=1&limit=2")
    data = res.json()["data"]
    assert len(data["products"]) == 2
    assert data["pagination"]["total"] == 3
    assert data["pagination"]["pages"] == 2
    assert data["pagination"]["page"] == 1


@pytest.mark.asyncio
async def test_product_unauthorized_access(client: AsyncClient, customer_headers: dict):
    """Tests that mutative endpoints are blocked from customer or anonymous requests."""
    payload = {
        "name": "Secret Product",
        "description": "Requires admin privileges",
        "price": 100.0,
        "category_id": "60c72b2f9b1d8e1f0c2e3d4a",
        "stock": 1,
    }
    # Customer request -> 403
    res = await client.post("/api/v1/products", json=payload, headers=customer_headers)
    assert res.status_code == 403

    # Anonymous request -> 401
    res = await client.post("/api/v1/products", json=payload)
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_product_soft_delete_admin(
    client: AsyncClient, admin_headers: dict, sample_category: dict
):
    """Tests that deleting a product soft-deletes it and updates its status to inactive."""
    payload = {
        "name": "Product to Delete",
        "description": "Will be soft-deleted",
        "price": 59.99,
        "category_id": sample_category["id"],
        "stock": 12,
    }
    create_res = await client.post("/api/v1/products", json=payload, headers=admin_headers)
    prod_id = create_res.json()["data"]["id"]

    # Delete product as admin
    del_res = await client.delete(f"/api/v1/products/{prod_id}", headers=admin_headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # Verify product is marked inactive in database
    db_prod = await Product.get(prod_id)
    assert db_prod.is_active is False
    assert db_prod.status == "deleted"


@pytest.mark.asyncio
async def test_customer_cannot_update_or_delete_product(
    client: AsyncClient, admin_headers: dict, customer_headers: dict, sample_category: dict
):
    """Tests that customers receive 403 Forbidden when attempting to update or delete products."""
    payload = {
        "name": "Protected Cracker",
        "description": "Only admin can modify",
        "price": 49.99,
        "category_id": sample_category["id"],
        "stock": 20,
    }
    create_res = await client.post("/api/v1/products", json=payload, headers=admin_headers)
    prod_id = create_res.json()["data"]["id"]

    # Customer tries to update
    put_res = await client.put(
        f"/api/v1/products/{prod_id}",
        json={"name": "Hacked Title", "price": 1.0},
        headers={**customer_headers},
    )
    assert put_res.status_code == 403

    # Customer tries to delete
    del_res = await client.delete(
        f"/api/v1/products/{prod_id}",
        headers={**customer_headers},
    )
    assert del_res.status_code == 403


@pytest.mark.asyncio
async def test_product_category_filtering(
    client: AsyncClient, admin_headers: dict, sample_category: dict
):
    """Tests filtering products by exact category ID."""
    # Create second category
    cat2_res = await client.post(
        "/api/v1/categories",
        json={"name": "Rockets", "description": "Sky rockets", "image_url": "http://img.png"},
        headers=admin_headers,
    )
    cat2_id = cat2_res.json()["data"]["id"]

    # Create product in category 1
    await client.post(
        "/api/v1/products",
        json={"name": "Cat1 Prod", "description": "Desc", "price": 10.0, "category_id": sample_category["id"], "stock": 5},
        headers=admin_headers,
    )
    # Create product in category 2
    await client.post(
        "/api/v1/products",
        json={"name": "Cat2 Prod", "description": "Desc", "price": 20.0, "category_id": cat2_id, "stock": 15},
        headers=admin_headers,
    )

    # Filter by category 1
    res1 = await client.get(f"/api/v1/products?category_id={sample_category['id']}")
    assert res1.status_code == 200
    assert len(res1.json()["data"]["products"]) == 1
    assert res1.json()["data"]["products"][0]["name"] == "Cat1 Prod"

    # Filter by category 2
    res2 = await client.get(f"/api/v1/products?category_id={cat2_id}")
    assert res2.status_code == 200
    assert len(res2.json()["data"]["products"]) == 1
    assert res2.json()["data"]["products"][0]["name"] == "Cat2 Prod"


@pytest.mark.asyncio
async def test_create_product_with_image_upload_multipart(
    client: AsyncClient, admin_headers: dict, sample_category: dict
):
    """Tests creating a product with multipart form-data and an uploaded image file."""
    image_content = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00"
    files = {"image": ("golden_pot.jpg", image_content, "image/jpeg")}
    data = {
        "name": "Golden Flower Pot 500",
        "description": "High performance glittering fountain pot.",
        "price": "250.0",
        "discount_price": "220.0",
        "category_id": sample_category["id"],
        "stock": "50",
        "is_featured": "true",
        "is_bestseller": "false",
        "is_flash_sale": "true",
        "is_recommended": "true",
    }

    # Post multipart form data (remove Content-Type from headers so httpx sets boundary automatically)
    headers = {k: v for k, v in admin_headers.items() if k.lower() != "content-type"}
    response = await client.post(
        "/api/v1/products",
        data=data,
        files=files,
        headers=headers,
    )
    assert response.status_code == 201
    res_json = response.json()
    assert res_json["success"] is True
    assert res_json["data"]["name"] == "Golden Flower Pot 500"
    assert res_json["data"]["image_url"] is not None
    assert "res.cloudinary.com" in res_json["data"]["image_url"]
    assert res_json["data"]["image_url"] in res_json["data"]["images"]


@pytest.mark.asyncio
async def test_update_product_with_new_image_upload_multipart(
    client: AsyncClient, admin_headers: dict, sample_category: dict
):
    """Tests updating a product with a replacement image uploaded via multipart form-data."""
    # First create product
    create_payload = {
        "name": "Rocket Barrage",
        "description": "Sky rockets",
        "price": 100.0,
        "category_id": sample_category["id"],
        "stock": 20,
    }
    create_res = await client.post("/api/v1/products", json=create_payload, headers=admin_headers)
    prod_id = create_res.json()["data"]["id"]

    # Update with new image
    image_content = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    files = {"image": ("replacement_rocket.png", image_content, "image/png")}
    update_data = {
        "name": "Updated Rocket Barrage Pro",
        "price": "120.0",
    }
    headers = {k: v for k, v in admin_headers.items() if k.lower() != "content-type"}
    update_res = await client.put(
        f"/api/v1/products/{prod_id}",
        data=update_data,
        files=files,
        headers=headers,
    )
    assert update_res.status_code == 200
    res_json = update_res.json()
    assert res_json["success"] is True
    assert res_json["data"]["name"] == "Updated Rocket Barrage Pro"
    assert res_json["data"]["image_url"] is not None
    assert "res.cloudinary.com" in res_json["data"]["image_url"]


