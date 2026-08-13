import pytest
from httpx import AsyncClient

from app.models.category import Category
from app.models.product import Product
from app.models.cart import Cart
from app.models.order import Order
from app.models.payment import Payment


@pytest.fixture(autouse=True)
async def clean_payment_db():
    """Wipes collections before each test for test isolation."""
    await Payment.find_all().delete()
    await Order.find_all().delete()
    await Cart.find_all().delete()
    await Product.find_all().delete()
    await Category.find_all().delete()
    yield


@pytest.fixture
async def sample_order(client: AsyncClient, customer_headers: dict, admin_headers: dict) -> dict:
    """Sets up category, product, cart, and executes checkout to return the order details."""
    cat_payload = {
        "name": "Electronics",
        "description": "Category for electronics",
        "image_url": "http://example.com/electronics.jpg",
    }
    cat_res = await client.post("/api/v1/categories", json=cat_payload, headers=admin_headers)
    cat_id = cat_res.json()["data"]["id"]

    prod_payload = {
        "name": "Headphones",
        "description": "Noise cancelling headphones",
        "price": 200.0,
        "category_id": cat_id,
        "stock": 5,
        "images": ["http://example.com/headphones.png"],
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
    return order_res.json()["data"]


@pytest.mark.asyncio
async def test_create_payment_success(
    client: AsyncClient, customer_headers: dict, sample_order: dict
):
    """Tests initiating a pending payment transaction record successfully."""
    payload = {
        "order_id": sample_order["id"],
        "payment_method": "Card",
        "gateway": "Mock",
        "amount": sample_order["total"],
        "currency": "USD",
    }
    response = await client.post("/api/v1/payment/create", json=payload, headers=customer_headers)
    assert response.status_code == 201
    res_json = response.json()
    assert res_json["success"] is True
    assert res_json["data"]["payment_status"] == "Pending"
    assert res_json["data"]["transaction_id"].startswith("TXN-")


@pytest.mark.asyncio
async def test_create_payment_invalid_amount(
    client: AsyncClient, customer_headers: dict, sample_order: dict
):
    """Tests that initiating payment with incorrect amount is blocked (422)."""
    payload = {
        "order_id": sample_order["id"],
        "payment_method": "Card",
        "gateway": "Mock",
        "amount": sample_order["total"] + 5.0,  # Invalid amount
        "currency": "USD",
    }
    response = await client.post("/api/v1/payment/create", json=payload, headers=customer_headers)
    assert response.status_code == 422
    assert response.json()["success"] is False
    assert "does not match order total" in response.json()["message"]


@pytest.mark.asyncio
async def test_verify_payment_success(
    client: AsyncClient, customer_headers: dict, sample_order: dict
):
    """Tests that confirming transaction success updates payment and order status values."""
    # 1. Create payment
    create_payload = {
        "order_id": sample_order["id"],
        "payment_method": "UPI",
        "gateway": "Mock",
        "amount": sample_order["total"],
    }
    create_res = await client.post(
        "/api/v1/payment/create", json=create_payload, headers=customer_headers
    )
    txn_id = create_res.json()["data"]["transaction_id"]

    # 2. Verify payment as success
    verify_payload = {
        "transaction_id": txn_id,
        "verification_status": "Success",
        "gateway_response": {"gateway_status": "PAID_CONFIRMED"},
    }
    verify_res = await client.post(
        "/api/v1/payment/verify", json=verify_payload, headers=customer_headers
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["data"]["payment_status"] == "Success"

    # 3. Check Order payment and order statuses are synced to Paid & Confirmed
    order_res = await client.get(f"/api/v1/orders/{sample_order['id']}", headers=customer_headers)
    assert order_res.json()["data"]["payment_status"] == "Paid"
    assert order_res.json()["data"]["order_status"] == "Confirmed"


@pytest.mark.asyncio
async def test_verify_payment_failure(
    client: AsyncClient, customer_headers: dict, sample_order: dict
):
    """Tests verifying payment as failed updates payment and order status values to Failed."""
    # 1. Create payment
    create_payload = {
        "order_id": sample_order["id"],
        "payment_method": "Card",
        "gateway": "Mock",
        "amount": sample_order["total"],
    }
    create_res = await client.post(
        "/api/v1/payment/create", json=create_payload, headers=customer_headers
    )
    txn_id = create_res.json()["data"]["transaction_id"]

    # 2. Verify payment as Failed
    verify_payload = {
        "transaction_id": txn_id,
        "verification_status": "Failed",
        "failure_reason": "Insufficient funds in card",
    }
    verify_res = await client.post(
        "/api/v1/payment/verify", json=verify_payload, headers=customer_headers
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["data"]["payment_status"] == "Failed"
    assert verify_res.json()["data"]["failure_reason"] == "Insufficient funds in card"

    # 3. Check Order payment status is Failed
    order_res = await client.get(f"/api/v1/orders/{sample_order['id']}", headers=customer_headers)
    assert order_res.json()["data"]["payment_status"] == "Failed"


@pytest.mark.asyncio
async def test_payment_duplicate_prevention(
    client: AsyncClient, customer_headers: dict, sample_order: dict
):
    """Tests duplicate payment prevention on the same order."""
    payload = {
        "order_id": sample_order["id"],
        "payment_method": "Card",
        "gateway": "Mock",
        "amount": sample_order["total"],
    }
    # 1. First creation (Pending)
    await client.post("/api/v1/payment/create", json=payload, headers=customer_headers)

    # 2. Second creation attempt -> should fail
    response = await client.post("/api/v1/payment/create", json=payload, headers=customer_headers)
    assert response.status_code == 422
    assert "pending payment record already exists" in response.json()["message"]


@pytest.mark.asyncio
async def test_payment_history_and_details_authorization(
    client: AsyncClient, customer_headers: dict, admin_headers: dict, sample_order: dict
):
    """Tests payment history logs retrieval and ownership checks across customer and admin roles."""
    # 1. Create payment
    payload = {
        "order_id": sample_order["id"],
        "payment_method": "Card",
        "gateway": "Mock",
        "amount": sample_order["total"],
    }
    create_res = await client.post(
        "/api/v1/payment/create", json=payload, headers=customer_headers
    )
    payment_id = create_res.json()["data"]["id"]

    # 2. Customer history
    cust_hist = await client.get("/api/v1/payment/history", headers=customer_headers)
    assert cust_hist.status_code == 200
    assert len(cust_hist.json()["data"]) == 1

    # 3. Admin history
    admin_hist = await client.get("/api/v1/payment/history", headers=admin_headers)
    assert admin_hist.status_code == 200
    assert len(admin_hist.json()["data"]) == 1

    # 4. Get by ID (Customer)
    cust_details = await client.get(f"/api/v1/payment/{payment_id}", headers=customer_headers)
    assert cust_details.status_code == 200
    assert cust_details.json()["data"]["id"] == payment_id

    # 5. Get by ID (Admin)
    admin_details = await client.get(f"/api/v1/payment/{payment_id}", headers=admin_headers)
    assert admin_details.status_code == 200
