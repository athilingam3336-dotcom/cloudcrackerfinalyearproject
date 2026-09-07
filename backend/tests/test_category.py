import pytest
from httpx import AsyncClient

from app.models.category import Category


@pytest.fixture(autouse=True)
async def clean_category_db():
    """Wipes the Categories collection in MongoDB before each test to ensure test isolation."""
    await Category.find_all().delete()
    yield


@pytest.mark.asyncio
async def test_create_category_success(client: AsyncClient, admin_headers: dict):
    """Tests successful category creation by an admin."""
    payload = {
        "name": "Electronics",
        "description": "Electronic gadgets and devices",
        "image_url": "http://example.com/electronics.jpg",
    }
    response = await client.post("/api/v1/categories", json=payload, headers=admin_headers)
    assert response.status_code == 201
    res_json = response.json()
    assert res_json["success"] is True
    assert res_json["data"]["name"] == "Electronics"


@pytest.mark.asyncio
async def test_create_category_duplicate_name(client: AsyncClient, admin_headers: dict):
    """Tests that duplicate category names are blocked (422)."""
    payload = {
        "name": "Books",
        "description": "Reading books",
        "image_url": "http://example.com/books.jpg",
    }
    # Create first category
    await client.post("/api/v1/categories", json=payload, headers=admin_headers)

    # Try to create duplicate
    response = await client.post("/api/v1/categories", json=payload, headers=admin_headers)
    assert response.status_code == 422
    res_json = response.json()
    assert res_json["success"] is False
    assert "already exists" in res_json["message"]


@pytest.mark.asyncio
async def test_create_category_unauthorized(client: AsyncClient, customer_headers: dict):
    """Tests that non-admin (Customer) users are forbidden from creating categories (403)."""
    payload = {
        "name": "Fashion",
        "description": "Apparels and fashion",
        "image_url": "http://example.com/fashion.jpg",
    }
    # Try as customer
    response = await client.post("/api/v1/categories", json=payload, headers=customer_headers)
    assert response.status_code == 403

    # Try unauthenticated
    response = await client.post("/api/v1/categories", json=payload)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_category_public(client: AsyncClient, admin_headers: dict):
    """Tests that category details can be fetched publicly without authentication."""
    # Create category first
    payload = {
        "name": "Home Decor",
        "description": "Furniture and home decor",
        "image_url": "http://example.com/home.jpg",
    }
    create_res = await client.post("/api/v1/categories", json=payload, headers=admin_headers)
    cat_id = create_res.json()["data"]["id"]

    # Public get
    response = await client.get(f"/api/v1/categories/{cat_id}")
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["success"] is True
    assert res_json["data"]["name"] == "Home Decor"


@pytest.mark.asyncio
async def test_update_category_admin(client: AsyncClient, admin_headers: dict):
    """Tests that categories can be updated by administrators."""
    payload = {
        "name": "Groceries",
        "description": "Daily grocery items",
        "image_url": "http://example.com/groceries.jpg",
    }
    create_res = await client.post("/api/v1/categories", json=payload, headers=admin_headers)
    cat_id = create_res.json()["data"]["id"]

    # Update category
    update_payload = {"description": "Updated groceries and fresh fruits", "is_active": False}
    response = await client.put(
        f"/api/v1/categories/{cat_id}", json=update_payload, headers=admin_headers
    )
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["success"] is True
    assert res_json["data"]["description"] == "Updated groceries and fresh fruits"
    assert res_json["data"]["is_active"] is False


@pytest.mark.asyncio
async def test_soft_delete_category_admin(client: AsyncClient, admin_headers: dict):
    """Tests that categories are soft-deleted (status set to deleted) rather than fully purged."""
    payload = {
        "name": "Sports",
        "description": "Sports gear",
        "image_url": "http://example.com/sports.jpg",
    }
    create_res = await client.post("/api/v1/categories", json=payload, headers=admin_headers)
    cat_id = create_res.json()["data"]["id"]

    # Soft delete
    del_response = await client.delete(f"/api/v1/categories/{cat_id}", headers=admin_headers)
    assert del_response.status_code == 200

    # Fetch deleted category detail -> should return 404 since repo ignores status == deleted
    get_response = await client.get(f"/api/v1/categories/{cat_id}")
    assert get_response.status_code == 404

    # List categories -> should not list the deleted category
    list_response = await client.get("/api/v1/categories")
    res_json = list_response.json()
    assert all(item["id"] != cat_id for item in res_json["data"])


@pytest.mark.asyncio
async def test_category_invalid_id_format(client: AsyncClient):
    """Tests that malformed database IDs return a 422 validation error."""
    response = await client.get("/api/v1/categories/invalid-id-format")
    assert response.status_code == 422
    res_json = response.json()
    assert res_json["success"] is False
    assert "Invalid ID format" in res_json["message"]


@pytest.mark.asyncio
async def test_admin_list_categories_include_inactive(client: AsyncClient, admin_headers: dict):
    """Tests that admin can retrieve both active and inactive categories using include_inactive=True."""
    # Create active category
    await client.post(
        "/api/v1/categories",
        json={"name": "Active Cat", "description": "Active", "image_url": "http://img.jpg"},
        headers=admin_headers,
    )
    # Create inactive category
    res2 = await client.post(
        "/api/v1/categories",
        json={"name": "Inactive Cat", "description": "Inactive", "image_url": "http://img.jpg"},
        headers=admin_headers,
    )
    cat2_id = res2.json()["data"]["id"]
    await client.put(f"/api/v1/categories/{cat2_id}", json={"is_active": False}, headers=admin_headers)

    # Customer/Public get -> only active
    pub_res = await client.get("/api/v1/categories")
    assert pub_res.status_code == 200
    pub_cats = pub_res.json()["data"]
    assert len(pub_cats) == 1
    assert pub_cats[0]["name"] == "Active Cat"

    # Admin get with include_inactive=true -> both
    admin_res = await client.get("/api/v1/categories?include_inactive=true", headers=admin_headers)
    assert admin_res.status_code == 200
    admin_cats = admin_res.json()["data"]
    assert len(admin_cats) == 2


@pytest.mark.asyncio
async def test_customer_cannot_update_or_delete_category(
    client: AsyncClient, admin_headers: dict, customer_headers: dict
):
    """Tests that customer users receive 403 Forbidden when attempting to update or delete categories."""
    # Admin creates category
    create_res = await client.post(
        "/api/v1/categories",
        json={"name": "Protected Cat", "description": "Protected", "image_url": "http://img.jpg"},
        headers=admin_headers,
    )
    cat_id = create_res.json()["data"]["id"]

    # Customer tries to update -> 403
    put_res = await client.put(
        f"/api/v1/categories/{cat_id}",
        json={"name": "Hacked Category"},
        headers=customer_headers,
    )
    assert put_res.status_code == 403

    # Customer tries to delete -> 403
    del_res = await client.delete(
        f"/api/v1/categories/{cat_id}",
        headers=customer_headers,
    )
    assert del_res.status_code == 403


@pytest.mark.asyncio
async def test_category_deletion_blocked_when_products_exist(
    client: AsyncClient, admin_headers: dict
):
    """Tests that deleting a category is safely blocked if active products reference it."""
    from app.models.product import Product

    # 1. Create category
    cat_res = await client.post(
        "/api/v1/categories",
        json={"name": "Parent Category", "description": "Has products", "image_url": "http://img.jpg"},
        headers=admin_headers,
    )
    cat_id = cat_res.json()["data"]["id"]

    # 2. Create product under this category
    prod_payload = {
        "name": "Linked Product",
        "description": "Child product",
        "price": 100.0,
        "category_id": cat_id,
        "stock": 10,
    }
    prod_res = await client.post("/api/v1/products", json=prod_payload, headers=admin_headers)
    assert prod_res.status_code == 201
    prod_id = prod_res.json()["data"]["id"]

    # 3. Attempt to delete category -> should be rejected with 422
    del_res = await client.delete(f"/api/v1/categories/{cat_id}", headers=admin_headers)
    assert del_res.status_code == 422
    del_json = del_res.json()
    assert del_json["success"] is False
    assert "Cannot delete category" in del_json["message"]
    assert "referencing it" in del_json["message"]

    # 4. Soft-delete the product first
    await client.delete(f"/api/v1/products/{prod_id}", headers=admin_headers)

    # 5. Now deleting the category should succeed
    del_res_2 = await client.delete(f"/api/v1/categories/{cat_id}", headers=admin_headers)
    assert del_res_2.status_code == 200
    assert del_res_2.json()["success"] is True

