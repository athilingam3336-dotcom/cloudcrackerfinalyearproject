import pytest
from httpx import AsyncClient

from app.models.category import Category
from app.models.product import Product
from app.models.cart import Cart
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.payment import Payment


@pytest.fixture(autouse=True)
async def clean_dashboard_db():
    """Wipes collections before each test to ensure test isolation."""
    await Payment.find_all().delete()
    await OrderItem.find_all().delete()
    await Order.find_all().delete()
    await Cart.find_all().delete()
    await Product.find_all().delete()
    await Category.find_all().delete()
    yield


@pytest.mark.asyncio
async def test_admin_dashboard_metrics_success(
    client: AsyncClient, admin_headers: dict, customer_headers: dict
):
    """Tests that admins can retrieve dashboard analytics, populated with data."""
    # 1. Create setup
    cat_payload = {
        "name": "Books",
        "description": "Category for books",
        "image_url": "http://example.com/books.jpg",
    }
    cat_res = await client.post("/api/v1/categories", json=cat_payload, headers=admin_headers)
    cat_id = cat_res.json()["data"]["id"]

    prod_payload = {
        "name": "Aggregation Novel",
        "description": "A book about aggregations",
        "price": 20.0,
        "category_id": cat_id,
        "stock": 50,
        "images": ["http://example.com/book.png"],
    }
    prod_res = await client.post("/api/v1/products", json=prod_payload, headers=admin_headers)
    prod_id = prod_res.json()["data"]["id"]

    # Add to cart
    await client.post(
        "/api/v1/cart/add",
        json={"product_id": prod_id, "quantity": 1},
        headers=customer_headers,
    )

    # Checkout
    checkout_payload = {
        "payment_method": "Card",
        "shipping_address": "123 Street Ave, Boston",
    }
    order_res = await client.post(
        "/api/v1/orders/checkout", json=checkout_payload, headers=customer_headers
    )
    order_id = order_res.json()["data"]["id"]

    # Create payment and verify
    pay_payload = {
        "order_id": order_id,
        "payment_method": "Card",
        "gateway": "Mock",
        "amount": order_res.json()["data"]["total"],
    }
    pay_res = await client.post(
        "/api/v1/payment/create", json=pay_payload, headers=customer_headers
    )
    txn_id = pay_res.json()["data"]["transaction_id"]

    verify_payload = {
        "transaction_id": txn_id,
        "verification_status": "Success",
        "gateway_response": {"status": "SUCCESS"},
    }
    await client.post("/api/v1/payment/verify", json=verify_payload, headers=customer_headers)

    # 2. Get dashboard metrics
    dash_res = await client.get("/api/v1/admin/dashboard", headers=admin_headers)
    assert dash_res.status_code == 200
    res_json = dash_res.json()
    assert res_json["success"] is True

    data = res_json["data"]
    assert "counters" in data
    assert "revenue" in data
    assert "stock_alerts" in data
    assert "top_selling_products" in data
    assert "top_categories" in data
    assert "recent_orders" in data
    assert "monthly_trends" in data

    # Verify numbers
    assert data["counters"]["total_products"] == 1
    assert data["counters"]["total_categories"] == 1
    assert data["counters"]["total_orders"] == 1
    assert data["revenue"]["total_revenue"] > 0
    assert len(data["top_selling_products"]) == 1
    assert data["top_selling_products"][0]["name"] == "Aggregation Novel"


@pytest.mark.asyncio
async def test_admin_dashboard_metrics_unauthorized(client: AsyncClient, customer_headers: dict):
    """Tests that customers are forbidden from loading the admin dashboard (403)."""
    response = await client.get("/api/v1/admin/dashboard", headers=customer_headers)
    assert response.status_code == 403
