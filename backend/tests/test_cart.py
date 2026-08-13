import pytest
from httpx import AsyncClient

from app.models.category import Category
from app.models.product import Product
from app.models.cart import Cart


@pytest.fixture(autouse=True)
async def clean_cart_db():
    """Wipes collections before each test for isolation."""
    await Cart.find_all().delete()
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
        "name": "Super Laptop",
        "description": "Powerful laptop",
        "price": 1000.0,
        "discount_price": 900.0,
        "category_id": cat_id,
        "stock": 5,
        "images": ["http://example.com/laptop.png"],
    }
    prod_res = await client.post("/api/v1/products", json=prod_payload, headers=admin_headers)
    return prod_res.json()["data"]


@pytest.mark.asyncio
async def test_add_to_cart_success(
    client: AsyncClient, customer_headers: dict, sample_product: dict
):
    """Tests successful product addition to the cart."""
    payload = {"product_id": sample_product["id"], "quantity": 2}
    response = await client.post("/api/v1/cart/add", json=payload, headers=customer_headers)
    assert response.status_code == 201
    res_json = response.json()
    assert res_json["success"] is True
    assert res_json["data"]["quantity"] == 2
    assert res_json["data"]["unit_price"] == 900.0
    assert res_json["data"]["total_price"] == 1800.0


@pytest.mark.asyncio
async def test_add_to_cart_stock_exceeded(
    client: AsyncClient, customer_headers: dict, sample_product: dict
):
    """Tests that adding quantity greater than product stock is blocked (422)."""
    payload = {"product_id": sample_product["id"], "quantity": 10}  # Stock is only 5
    response = await client.post("/api/v1/cart/add", json=payload, headers=customer_headers)
    assert response.status_code == 422
    assert response.json()["success"] is False
    assert "exceeds available stock" in response.json()["message"]


@pytest.mark.asyncio
async def test_view_cart_and_summary(
    client: AsyncClient, customer_headers: dict, sample_product: dict
):
    """Tests cart retrieval and financial summaries."""
    # 1. Add to cart
    payload = {"product_id": sample_product["id"], "quantity": 2}
    await client.post("/api/v1/cart/add", json=payload, headers=customer_headers)

    # 2. View cart
    view_res = await client.get("/api/v1/cart", headers=customer_headers)
    assert view_res.status_code == 200
    view_json = view_res.json()
    assert view_json["success"] is True
    assert len(view_json["data"]) == 1
    assert view_json["data"][0]["product"]["name"] == "Super Laptop"

    # 3. View summary
    summary_res = await client.get("/api/v1/cart/summary", headers=customer_headers)
    assert summary_res.status_code == 200
    summary_json = summary_res.json()
    assert summary_json["success"] is True
    assert summary_json["data"]["total_items"] == 2
    assert summary_json["data"]["subtotal"] == 2000.0  # 2 * 1000.0 original price
    assert summary_json["data"]["total_discount"] == 200.0  # 2 * (1000.0 - 900.0)
    assert summary_json["data"]["grand_total"] == 1800.0  # 2 * 900.0


@pytest.mark.asyncio
async def test_update_cart_quantity(
    client: AsyncClient, customer_headers: dict, sample_product: dict
):
    """Tests updating cart items quantity."""
    # 1. Add item
    payload = {"product_id": sample_product["id"], "quantity": 1}
    create_res = await client.post("/api/v1/cart/add", json=payload, headers=customer_headers)
    cart_id = create_res.json()["data"]["id"]

    # 2. Update quantity
    update_payload = {"quantity": 3}
    update_res = await client.put(
        f"/api/v1/cart/{cart_id}", json=update_payload, headers=customer_headers
    )
    assert update_res.status_code == 200
    update_json = update_res.json()
    assert update_json["success"] is True
    assert update_json["data"]["quantity"] == 3
    assert update_json["data"]["total_price"] == 2700.0


@pytest.mark.asyncio
async def test_clear_cart_flow(
    client: AsyncClient, customer_headers: dict, sample_product: dict
):
    """Tests clearing the shopping cart."""
    # Add to cart
    payload = {"product_id": sample_product["id"], "quantity": 1}
    await client.post("/api/v1/cart/add", json=payload, headers=customer_headers)

    # Clear cart
    clear_res = await client.delete("/api/v1/cart/clear", headers=customer_headers)
    assert clear_res.status_code == 200

    # View cart -> should be empty
    view_res = await client.get("/api/v1/cart", headers=customer_headers)
    assert len(view_res.json()["data"]) == 0


@pytest.mark.asyncio
async def test_cart_unauthorized_access(client: AsyncClient, sample_product: dict):
    """Tests that unauthenticated requests to cart endpoints are blocked."""
    response = await client.get("/api/v1/cart")
    assert response.status_code == 401
