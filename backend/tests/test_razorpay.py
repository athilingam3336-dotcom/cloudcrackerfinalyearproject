from datetime import datetime, timedelta
import hashlib
import hmac
import json
from unittest.mock import MagicMock, patch
import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.models.cart import Cart
from app.models.category import Category
from app.models.coupon import Coupon
from app.models.order import Order
from app.models.payment import Payment
from app.models.product import Product
from app.models.user import User
from app.services.razorpay_service import RazorpayService


@pytest.fixture(autouse=True)
async def clean_razorpay_db():
    """Wipes relevant collections before each test for isolation."""
    await Payment.find_all().delete()
    await Order.find_all().delete()
    await Cart.find_all().delete()
    await Product.find_all().delete()
    await Category.find_all().delete()
    await Coupon.find_all().delete()
    yield


@pytest.fixture
async def second_customer_headers(admin_headers: dict) -> dict:
    """Fixture that creates a second customer user and returns authorization headers."""
    from app.core.security import create_access_token, hash_password

    user = await User.find_one(User.email == "customer2@example.com")
    if not user:
        user = User(
            full_name="Second Customer",
            email="customer2@example.com",
            phone="+17777777777",
            password_hash=hash_password("Password123!"),
            role="CUSTOMER",
            is_verified=True,
            is_active=True,
            status="active",
        )
        await user.insert()
    payload = {"sub": str(user.id), "role": user.role}
    token = create_access_token(payload)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def sample_cart_and_product(client: AsyncClient, customer_headers: dict, admin_headers: dict) -> dict:
    """Sets up a category, product with stock, adds to cart, and returns details."""
    cat_payload = {
        "name": "Sky Rockets",
        "description": "Premium multi-shot aerial pyrotechnics",
        "image_url": "http://example.com/rockets.jpg",
    }
    cat_res = await client.post("/api/v1/categories", json=cat_payload, headers=admin_headers)
    cat_id = cat_res.json()["data"]["id"]

    prod_payload = {
        "name": "Supernova 500s",
        "description": "500-gram heavy display cake",
        "price": 100.0,
        "discount_price": 80.0,
        "category_id": cat_id,
        "stock": 10,
        "images": ["http://example.com/supernova.png"],
    }
    prod_res = await client.post("/api/v1/products", json=prod_payload, headers=admin_headers)
    prod_data = prod_res.json()["data"]
    prod_id = prod_data["id"]

    # Add 2 items to customer cart
    cart_res = await client.post(
        "/api/v1/cart/add",
        json={"product_id": prod_id, "quantity": 2},
        headers=customer_headers,
    )
    assert cart_res.status_code in [200, 201]

    return {
        "category_id": cat_id,
        "product_id": prod_id,
        "product": prod_data,
    }


def generate_valid_razorpay_signature(order_id: str, payment_id: str, secret: str) -> str:
    """Helper to generate a valid HMAC-SHA256 signature for Razorpay."""
    msg = f"{order_id}|{payment_id}".encode("utf-8")
    return hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()


# 1. Configuration tests
def test_razorpay_configuration_loads():
    """Verifies that Razorpay settings are loaded in the environment."""
    assert hasattr(settings, "RAZORPAY_KEY_ID")
    assert hasattr(settings, "RAZORPAY_KEY_SECRET")
    assert settings.RAZORPAY_KEY_ID is not None


def test_razorpay_missing_credentials_fails_safely():
    """Verifies missing credentials raise appropriate exception without leaking or crashing."""
    service = RazorpayService()
    service.key_id = None
    service.key_secret = None
    with pytest.raises(Exception) as exc_info:
        service._get_client()
    assert "credentials are not configured" in str(exc_info.value)


# 2. Order creation tests
@pytest.mark.asyncio
async def test_customer_create_razorpay_order_from_cart(
    client: AsyncClient, customer_headers: dict, sample_cart_and_product: dict
):
    """
    Tests creating a Razorpay test order from active cart:
    - Calculates amount server-side (2 * 80 = 160 subtotal, shipping 99, 5% tax = 12.95, total = 271.95)
    - Returns razorpay_order_id, razorpay_key_id
    - Inventory is NOT deducted yet
    - Cart is NOT cleared yet
    """
    payload = {
        "shipping_address": "42 Marina Beach Road, Chennai 600004",
        "delivery_method": "standard",
    }
    with patch.object(
        RazorpayService,
        "create_razorpay_order",
        return_value={"id": "order_mock_rzp_12345", "amount": 27195, "currency": "INR"},
    ):
        response = await client.post(
            "/api/v1/payment/create-order", json=payload, headers=customer_headers
        )
        assert response.status_code == 201
        data = response.json()["data"]

        assert data["razorpay_order_id"] == "order_mock_rzp_12345"
        assert data["currency"] == "INR"
        assert data["amount"] > 0
        assert data["order_id"] is not None

        # Verify inventory is NOT deducted yet
        prod = await Product.get(sample_cart_and_product["product_id"])
        assert prod.stock == 10

        # Verify cart is NOT cleared yet
        cart_res = await client.get("/api/v1/cart", headers=customer_headers)
        assert len(cart_res.json()["data"]) > 0


@pytest.mark.asyncio
async def test_customer_cannot_create_payment_for_other_user_order(
    client: AsyncClient, customer_headers: dict, second_customer_headers: dict, sample_cart_and_product: dict
):
    """Tests that a customer cannot initiate payment on an order belonging to another customer."""
    # Customer 1 creates order
    with patch.object(
        RazorpayService,
        "create_razorpay_order",
        return_value={"id": "order_mock_rzp_owner", "amount": 27195, "currency": "INR"},
    ):
        res1 = await client.post(
            "/api/v1/payment/create-order",
            json={"shipping_address": "123 Street Ave"},
            headers=customer_headers,
        )
        order_id = res1.json()["data"]["order_id"]

    # Customer 2 tries to initiate payment on customer 1's order
    res2 = await client.post(
        "/api/v1/payment/create-order",
        json={"order_id": order_id},
        headers=second_customer_headers,
    )
    assert res2.status_code == 403


@pytest.mark.asyncio
async def test_server_side_amount_calculation_and_coupon_application(
    client: AsyncClient, customer_headers: dict, admin_headers: dict, sample_cart_and_product: dict
):
    """
    Tests that the backend calculates prices server-side and accurately applies coupons.
    Frontend cannot manipulate amounts.
    """
    future_expiry = (datetime.utcnow() + timedelta(days=10)).isoformat()
    coupon_payload = {
        "coupon_code": "FIREWORKS20",
        "description": "Flat 20 OFF discount",
        "discount_type": "fixed",
        "fixed_amount": 20.0,
        "minimum_order": 50.0,
        "expiry_date": future_expiry,
        "usage_limit": 10,
        "is_active": True,
    }
    c_res = await client.post("/api/v1/coupons", json=coupon_payload, headers=admin_headers)
    assert c_res.status_code == 201

    with patch.object(
        RazorpayService,
        "create_razorpay_order",
        return_value={"id": "order_mock_rzp_coupon", "amount": 25095, "currency": "INR"},
    ):
        res = await client.post(
            "/api/v1/payment/create-order",
            json={
                "shipping_address": "42 Marina Beach Road, Chennai 600004",
                "coupon_code": "FIREWORKS20",
            },
            headers=customer_headers,
        )
        assert res.status_code == 201
        data = res.json()["data"]
        assert data["coupon_discount"] == 20.0


# 3. Verification tests (Valid, Invalid, Idempotency)
@pytest.mark.asyncio
async def test_verify_razorpay_payment_invalid_signature_rejected(
    client: AsyncClient, customer_headers: dict, sample_cart_and_product: dict
):
    """Tests that an invalid Razorpay signature is rejected (422/400) and leaves stock/cart intact."""
    with patch.object(
        RazorpayService,
        "create_razorpay_order",
        return_value={"id": "order_mock_rzp_invalid", "amount": 27195, "currency": "INR"},
    ):
        create_res = await client.post(
            "/api/v1/payment/create-order",
            json={"shipping_address": "42 Marina Beach Road"},
            headers=customer_headers,
        )
        rzp_order_id = create_res.json()["data"]["razorpay_order_id"]

    verify_payload = {
        "razorpay_order_id": rzp_order_id,
        "razorpay_payment_id": "pay_mock_9999",
        "razorpay_signature": "invalid_forged_signature_12345",
    }
    verify_res = await client.post(
        "/api/v1/payment/verify-razorpay", json=verify_payload, headers=customer_headers
    )
    assert verify_res.status_code in [400, 422]
    assert "signature" in verify_res.json()["message"].lower()

    # Verify inventory was NOT decremented
    prod = await Product.get(sample_cart_and_product["product_id"])
    assert prod.stock == 10

    # Verify cart was NOT cleared
    cart_res = await client.get("/api/v1/cart", headers=customer_headers)
    assert len(cart_res.json()["data"]) > 0


@pytest.mark.asyncio
async def test_verify_razorpay_payment_valid_signature_success(
    client: AsyncClient, customer_headers: dict, sample_cart_and_product: dict
):
    """
    Tests successful verification of valid Razorpay payment:
    1. Signature is verified with HMAC SHA256
    2. Order status updated to Paid & Confirmed
    3. Payment status updated to Success
    4. Inventory is decremented (10 - 2 = 8)
    5. Cart is cleared
    """
    test_secret = settings.RAZORPAY_KEY_SECRET or "placeholder_secret"

    with patch.object(
        RazorpayService,
        "create_razorpay_order",
        return_value={"id": "order_mock_rzp_valid", "amount": 27195, "currency": "INR"},
    ):
        create_res = await client.post(
            "/api/v1/payment/create-order",
            json={"shipping_address": "42 Marina Beach Road"},
            headers=customer_headers,
        )
        order_data = create_res.json()["data"]
        rzp_order_id = order_data["razorpay_order_id"]

    rzp_payment_id = "pay_mock_valid_12345"
    valid_signature = generate_valid_razorpay_signature(
        rzp_order_id, rzp_payment_id, test_secret
    )

    verify_payload = {
        "razorpay_order_id": rzp_order_id,
        "razorpay_payment_id": rzp_payment_id,
        "razorpay_signature": valid_signature,
    }

    verify_res = await client.post(
        "/api/v1/payment/verify-razorpay", json=verify_payload, headers=customer_headers
    )
    assert verify_res.status_code == 200
    res_data = verify_res.json()["data"]
    assert res_data["order"]["payment_status"] == "Paid"
    assert res_data["order"]["order_status"] == "Confirmed"
    assert res_data["payment"]["payment_status"] == "Success"

    # Verify inventory was decremented
    prod = await Product.get(sample_cart_and_product["product_id"])
    assert prod.stock == 8

    # Verify cart was cleared
    cart_res = await client.get("/api/v1/cart", headers=customer_headers)
    assert len(cart_res.json()["data"]) == 0


@pytest.mark.asyncio
async def test_verify_razorpay_payment_idempotency(
    client: AsyncClient, customer_headers: dict, sample_cart_and_product: dict
):
    """Tests that duplicate verification calls are idempotent and do not double-decrement stock."""
    test_secret = settings.RAZORPAY_KEY_SECRET or "placeholder_secret"

    with patch.object(
        RazorpayService,
        "create_razorpay_order",
        return_value={"id": "order_mock_rzp_idempotent", "amount": 27195, "currency": "INR"},
    ):
        create_res = await client.post(
            "/api/v1/payment/create-order",
            json={"shipping_address": "42 Marina Beach Road"},
            headers=customer_headers,
        )
        rzp_order_id = create_res.json()["data"]["razorpay_order_id"]

    rzp_payment_id = "pay_mock_idempotent_1"
    valid_signature = generate_valid_razorpay_signature(
        rzp_order_id, rzp_payment_id, test_secret
    )

    verify_payload = {
        "razorpay_order_id": rzp_order_id,
        "razorpay_payment_id": rzp_payment_id,
        "razorpay_signature": valid_signature,
    }

    # First verify call
    res1 = await client.post(
        "/api/v1/payment/verify-razorpay", json=verify_payload, headers=customer_headers
    )
    assert res1.status_code == 200
    assert res1.json()["data"]["order"]["payment_status"] == "Paid"

    # Stock should be 8
    prod1 = await Product.get(sample_cart_and_product["product_id"])
    assert prod1.stock == 8

    # Second verify call (duplicate retry)
    res2 = await client.post(
        "/api/v1/payment/verify-razorpay", json=verify_payload, headers=customer_headers
    )
    assert res2.status_code == 200
    assert res2.json()["data"]["already_processed"] is True

    # Stock must still be 8 (no double deduction)
    prod2 = await Product.get(sample_cart_and_product["product_id"])
    assert prod2.stock == 8


@pytest.mark.asyncio
async def test_coupon_usage_incremented_on_successful_payment(
    client: AsyncClient, customer_headers: dict, admin_headers: dict, sample_cart_and_product: dict
):
    """Tests that coupon used_count increments on verified payment."""
    test_secret = settings.RAZORPAY_KEY_SECRET or "placeholder_secret"
    future_expiry = (datetime.utcnow() + timedelta(days=10)).isoformat()

    # Create coupon
    await client.post(
        "/api/v1/coupons",
        json={
            "coupon_code": "SPARKLE10",
            "description": "10% off",
            "discount_type": "percentage",
            "percentage": 10.0,
            "minimum_order": 50.0,
            "expiry_date": future_expiry,
            "usage_limit": 5,
            "is_active": True,
        },
        headers=admin_headers,
    )

    with patch.object(
        RazorpayService,
        "create_razorpay_order",
        return_value={"id": "order_mock_rzp_coupon_use", "amount": 25000, "currency": "INR"},
    ):
        create_res = await client.post(
            "/api/v1/payment/create-order",
            json={
                "shipping_address": "42 Marina Beach Road",
                "coupon_code": "SPARKLE10",
            },
            headers=customer_headers,
        )
        rzp_order_id = create_res.json()["data"]["razorpay_order_id"]

    # Coupon used_count before verification should be 0
    coupon = await Coupon.find_one(Coupon.coupon_code == "SPARKLE10")
    assert coupon.used_count == 0

    rzp_payment_id = "pay_mock_coupon_success"
    sig = generate_valid_razorpay_signature(rzp_order_id, rzp_payment_id, test_secret)

    await client.post(
        "/api/v1/payment/verify-razorpay",
        json={
            "razorpay_order_id": rzp_order_id,
            "razorpay_payment_id": rzp_payment_id,
            "razorpay_signature": sig,
        },
        headers=customer_headers,
    )

    # Coupon used_count after verification should be 1
    updated_coupon = await Coupon.find_one(Coupon.coupon_code == "SPARKLE10")
    assert updated_coupon.used_count == 1


# 4. Webhook tests
@pytest.mark.asyncio
async def test_razorpay_webhook_payment_captured_success(
    client: AsyncClient, customer_headers: dict, sample_cart_and_product: dict
):
    """Tests webhook processing of payment.captured event."""
    webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET or settings.RAZORPAY_KEY_SECRET or "placeholder_webhook_secret"

    with patch.object(
        RazorpayService,
        "create_razorpay_order",
        return_value={"id": "order_mock_rzp_webhook", "amount": 27195, "currency": "INR"},
    ):
        create_res = await client.post(
            "/api/v1/payment/create-order",
            json={"shipping_address": "42 Marina Beach Road"},
            headers=customer_headers,
        )
        rzp_order_id = create_res.json()["data"]["razorpay_order_id"]

    webhook_body = json.dumps(
        {
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_mock_webhook_123",
                        "order_id": rzp_order_id,
                        "amount": 27195,
                        "status": "captured",
                    }
                }
            },
        }
    ).encode("utf-8")

    # Generate webhook signature
    sig = hmac.new(webhook_secret.encode("utf-8"), webhook_body, hashlib.sha256).hexdigest()

    response = await client.post(
        "/api/v1/payments/webhook",
        content=webhook_body,
        headers={"X-Razorpay-Signature": sig, "Content-Type": "application/json"},
    )
    assert response.status_code == 200
    assert response.json()["data"]["status"] == "processed"

    # Order should be marked Paid
    order = await Order.find_one(Order.razorpay_order_id == rzp_order_id)
    assert order.payment_status == "Paid"


@pytest.mark.asyncio
async def test_razorpay_webhook_invalid_signature_rejected(client: AsyncClient):
    """Tests that a webhook with an invalid signature is rejected."""
    webhook_body = json.dumps({"event": "payment.captured"}).encode("utf-8")
    response = await client.post(
        "/api/v1/payments/webhook",
        content=webhook_body,
        headers={"X-Razorpay-Signature": "invalid_sig", "Content-Type": "application/json"},
    )
    assert response.status_code in [400, 422]


# 5. Dual prefix routing test
@pytest.mark.asyncio
async def test_both_payment_and_payments_prefixes_work(
    client: AsyncClient, customer_headers: dict, sample_cart_and_product: dict
):
    """Verifies that both /api/v1/payment and /api/v1/payments route prefixes work."""
    with patch.object(
        RazorpayService,
        "create_razorpay_order",
        side_effect=[
            {"id": "order_mock_prefix_1", "amount": 27195, "currency": "INR"},
            {"id": "order_mock_prefix_2", "amount": 27195, "currency": "INR"},
        ],
    ):
        res1 = await client.post(
            "/api/v1/payment/create-order",
            json={"shipping_address": "42 Marina Beach Road"},
            headers=customer_headers,
        )
        assert res1.status_code == 201

        res2 = await client.post(
            "/api/v1/payments/create-order",
            json={"shipping_address": "42 Marina Beach Road"},
            headers=customer_headers,
        )
        assert res2.status_code == 201
