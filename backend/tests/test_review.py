import pytest
from httpx import AsyncClient

from app.models.category import Category
from app.models.product import Product
from app.models.cart import Cart
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.payment import Payment
from app.models.review import Review


@pytest.fixture(autouse=True)
async def clean_review_db():
    """Wipes database collections before each test for total test isolation."""
    await Review.find_all().delete()
    await Payment.find_all().delete()
    await OrderItem.find_all().delete()
    await Order.find_all().delete()
    await Cart.find_all().delete()
    await Product.find_all().delete()
    await Category.find_all().delete()
    yield


@pytest.fixture
async def checkout_setup(client: AsyncClient, admin_headers: dict, customer_headers: dict) -> dict:
    """Sets up a category, product, and checked-out order for verified purchase testing."""
    cat_payload = {
        "name": "Home Decor",
        "description": "Decorations for home",
        "image_url": "http://example.com/decor.jpg",
    }
    cat_res = await client.post("/api/v1/categories", json=cat_payload, headers=admin_headers)
    cat_id = cat_res.json()["data"]["id"]

    prod_payload = {
        "name": "Luxury Vase",
        "description": "Elegant ceramic vase",
        "price": 100.0,
        "category_id": cat_id,
        "stock": 10,
        "images": ["http://example.com/vase.png"],
    }
    prod_res = await client.post("/api/v1/products", json=prod_payload, headers=admin_headers)
    prod_data = prod_res.json()["data"]

    # Checkout flow
    await client.post(
        "/api/v1/cart/add",
        json={"product_id": prod_data["id"], "quantity": 1},
        headers=customer_headers,
    )
    checkout_res = await client.post(
        "/api/v1/orders/checkout",
        json={"payment_method": "Card", "shipping_address": "123 Street, MA"},
        headers=customer_headers,
    )
    order_data = checkout_res.json()["data"]

    # Set order as Paid/Confirmed
    pay_payload = {
        "order_id": order_data["id"],
        "payment_method": "Card",
        "gateway": "Mock",
        "amount": order_data["total"],
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

    return {"product_id": prod_data["id"], "order_id": order_data["id"]}


@pytest.mark.asyncio
async def test_create_review_unpurchased_fails(
    client: AsyncClient, admin_headers: dict, customer_headers: dict
):
    """Tests that a customer cannot review a product they have not purchased."""
    cat_payload = {
        "name": "Toys",
        "description": "Toys category",
        "image_url": "http://example.com/toys.jpg",
    }
    cat_res = await client.post("/api/v1/categories", json=cat_payload, headers=admin_headers)
    cat_id = cat_res.json()["data"]["id"]

    prod_payload = {
        "name": "Toy Car",
        "description": "Plastic toy car",
        "price": 10.0,
        "category_id": cat_id,
        "stock": 10,
        "images": [],
    }
    prod_res = await client.post("/api/v1/products", json=prod_payload, headers=admin_headers)
    prod_id = prod_res.json()["data"]["id"]

    review_payload = {
        "product_id": prod_id,
        "rating": 5,
        "title": "Nice Toy",
        "review": "My kid loved it.",
    }
    response = await client.post("/api/v1/reviews", json=review_payload, headers=customer_headers)
    assert response.status_code == 422
    assert "only review products that you have purchased" in response.json()["message"]


@pytest.mark.asyncio
async def test_review_lifecycle_and_calculations(
    client: AsyncClient, customer_headers: dict, checkout_setup: dict, admin_headers: dict
):
    """Tests creating, updating, soft-deleting reviews and checks auto-updated product stats."""
    prod_id = checkout_setup["product_id"]

    # 1. Create Review
    review_payload = {
        "product_id": prod_id,
        "rating": 5,
        "title": "Excellent quality!",
        "review": "Very strong and beautiful ceramic material.",
        "images": ["http://example.com/vase_user.jpg"],
    }
    res_create = await client.post("/api/v1/reviews", json=review_payload, headers=customer_headers)
    assert res_create.status_code == 201
    review_data = res_create.json()["data"]
    assert review_data["rating"] == 5
    assert review_data["is_verified_purchase"] is True
    review_id = review_data["id"]

    # Verify product rating fields have auto-updated
    prod = await Product.get(prod_id)
    assert prod.average_rating == 5.0
    assert prod.total_reviews == 1
    assert prod.rating_breakdown["5"] == 1

    # 2. Duplicate review fails
    res_dup = await client.post("/api/v1/reviews", json=review_payload, headers=customer_headers)
    assert res_dup.status_code == 422
    assert "already submitted a review" in res_dup.json()["message"]

    # 3. Invalid rating validation fails
    bad_payload = {
        "product_id": prod_id,
        "rating": 6,
        "title": "Terrible",
        "review": "Fake review text",
    }
    res_bad = await client.post("/api/v1/reviews", json=bad_payload, headers=customer_headers)
    assert res_bad.status_code == 422

    # 4. Update Review
    update_payload = {"rating": 4, "title": "Good quality", "review": "Actually it was a bit smaller."}
    res_update = await client.put(
        f"/api/v1/reviews/{review_id}", json=update_payload, headers=customer_headers
    )
    assert res_update.status_code == 200
    assert res_update.json()["data"]["rating"] == 4

    # Verify stats updated
    prod = await Product.get(prod_id)
    assert prod.average_rating == 4.0
    assert prod.rating_breakdown["5"] == 0
    assert prod.rating_breakdown["4"] == 1

    # 5. Delete Review (Customer)
    res_del = await client.delete(f"/api/v1/reviews/{review_id}", headers=customer_headers)
    assert res_del.status_code == 200

    # Verify stats cleared back to default on deletion
    prod = await Product.get(prod_id)
    assert prod.average_rating == 0.0
    assert prod.total_reviews == 0
    assert prod.rating_breakdown["4"] == 0


@pytest.mark.asyncio
async def test_admin_hide_restore_delete_flow(
    client: AsyncClient, customer_headers: dict, checkout_setup: dict, admin_headers: dict
):
    """Tests administrative review moderation (hide, restore, delete) and role blocks."""
    prod_id = checkout_setup["product_id"]

    # Submit review
    review_payload = {
        "product_id": prod_id,
        "rating": 4,
        "title": "Good",
        "review": "A decent purchase overall.",
    }
    res = await client.post("/api/v1/reviews", json=review_payload, headers=customer_headers)
    review_id = res.json()["data"]["id"]

    # 1. Customer tries to hide -> forbidden (403)
    res_cust_hide = await client.put(
        f"/api/v1/admin/reviews/{review_id}/hide", headers=customer_headers
    )
    assert res_cust_hide.status_code == 403

    # 2. Admin hides review -> succeeds
    res_admin_hide = await client.put(
        f"/api/v1/admin/reviews/{review_id}/hide", headers=admin_headers
    )
    assert res_admin_hide.status_code == 200
    assert res_admin_hide.json()["data"]["status"] == "HIDDEN"

    # Verify that hidden review does not count in product rating aggregates
    prod = await Product.get(prod_id)
    assert prod.total_reviews == 0
    assert prod.average_rating == 0.0

    # 3. Admin restores review -> succeeds
    res_admin_restore = await client.put(
        f"/api/v1/admin/reviews/{review_id}/restore", headers=admin_headers
    )
    assert res_admin_restore.status_code == 200
    assert res_admin_restore.json()["data"]["status"] == "ACTIVE"

    # Verify aggregates are active again
    prod = await Product.get(prod_id)
    assert prod.total_reviews == 1
    assert prod.average_rating == 4.0

    # 4. Admin deletes review -> succeeds
    res_admin_del = await client.delete(f"/api/v1/admin/reviews/{review_id}", headers=admin_headers)
    assert res_admin_del.status_code == 200

    # Verify aggregates cleared
    prod = await Product.get(prod_id)
    assert prod.total_reviews == 0
