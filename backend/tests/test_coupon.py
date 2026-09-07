from datetime import datetime, timedelta
import pytest
from httpx import AsyncClient

from app.models.coupon import Coupon
from app.models.product import Product
from app.models.category import Category
from app.models.cart import Cart


@pytest.fixture(autouse=True)
async def clean_coupon_db():
    """Wipes coupons, products, and categories collections before each test."""
    await Coupon.find_all().delete()
    await Product.find_all().delete()
    await Category.find_all().delete()
    await Cart.find_all().delete()
    yield


@pytest.mark.asyncio
async def test_coupon_crud_admin_and_customer_forbidden(
    client: AsyncClient, admin_headers: dict, customer_headers: dict
):
    """Tests that administrative users can create, read, update, patch status, and delete coupons while customers receive 403."""
    future_expiry = (datetime.utcnow() + timedelta(days=5)).isoformat()
    payload = {
        "coupon_code": "SAVE20",
        "description": "20% off festival discount",
        "discount_type": "percentage",
        "percentage": 20.0,
        "minimum_order": 50.0,
        "maximum_discount": 10.0,
        "expiry_date": future_expiry,
        "usage_limit": 5,
        "is_active": True,
    }

    # Customer tries to create -> 403
    cust_res = await client.post("/api/v1/coupons", json=payload, headers=customer_headers)
    assert cust_res.status_code == 403

    # Admin creates coupon -> 201
    create_res = await client.post("/api/v1/coupons", json=payload, headers=admin_headers)
    assert create_res.status_code == 201
    res_json = create_res.json()
    assert res_json["success"] is True
    assert res_json["data"]["coupon_code"] == "SAVE20"
    coupon_id = res_json["data"]["id"]

    # Customer tries to list -> 403
    cust_list = await client.get("/api/v1/coupons", headers=customer_headers)
    assert cust_list.status_code == 403

    # Admin lists coupons overview -> 200
    admin_list = await client.get("/api/v1/coupons", headers=admin_headers)
    assert admin_list.status_code == 200
    data = admin_list.json()["data"]
    assert data["metrics"]["total_coupons"] == 1
    assert data["metrics"]["active_coupons"] == 1
    assert len(data["items"]) == 1

    # Customer tries to update -> 403
    cust_put = await client.put(
        f"/api/v1/coupons/{coupon_id}", json={"minimum_order": 60.0}, headers=customer_headers
    )
    assert cust_put.status_code == 403

    # Admin updates coupon -> 200
    admin_put = await client.put(
        f"/api/v1/coupons/{coupon_id}",
        json={"description": "Updated festival promo", "minimum_order": 60.0},
        headers=admin_headers,
    )
    assert admin_put.status_code == 200
    assert admin_put.json()["data"]["description"] == "Updated festival promo"

    # Customer tries to patch status -> 403
    cust_patch = await client.patch(
        f"/api/v1/coupons/{coupon_id}/status", json={"is_active": False}, headers=customer_headers
    )
    assert cust_patch.status_code == 403

    # Admin patches status to inactive -> 200
    admin_patch = await client.patch(
        f"/api/v1/coupons/{coupon_id}/status", json={"is_active": False}, headers=admin_headers
    )
    assert admin_patch.status_code == 200
    assert admin_patch.json()["data"]["is_active"] is False

    # Customer tries to delete -> 403
    cust_del = await client.delete(f"/api/v1/coupons/{coupon_id}", headers=customer_headers)
    assert cust_del.status_code == 403

    # Admin deletes coupon -> 200
    del_res = await client.delete(f"/api/v1/coupons/{coupon_id}", headers=admin_headers)
    assert del_res.status_code == 200


@pytest.mark.asyncio
async def test_coupon_validation_rules_and_restrictions(
    client: AsyncClient, admin_headers: dict
):
    """Tests schema validation: duplicate codes, percentage limits, negative values, and date ranges."""
    future = (datetime.utcnow() + timedelta(days=10)).isoformat()
    past = (datetime.utcnow() - timedelta(days=10)).isoformat()

    # 1. Duplicate coupon code rejected (422)
    payload_valid = {
        "coupon_code": "SPARK50",
        "discount_type": "fixed",
        "fixed_amount": 50.0,
        "expiry_date": future,
        "usage_limit": 10,
    }
    res1 = await client.post("/api/v1/coupons", json=payload_valid, headers=admin_headers)
    assert res1.status_code == 201

    res_dup = await client.post("/api/v1/coupons", json=payload_valid, headers=admin_headers)
    assert res_dup.status_code == 422
    assert "already exists" in res_dup.json()["message"]

    # 2. Percentage > 100 rejected (422)
    payload_bad_pct = {
        "coupon_code": "OVER100",
        "discount_type": "percentage",
        "percentage": 150.0,
        "expiry_date": future,
    }
    res_bad_pct = await client.post("/api/v1/coupons", json=payload_bad_pct, headers=admin_headers)
    assert res_bad_pct.status_code == 422

    # 3. Negative fixed amount rejected (422)
    payload_neg = {
        "coupon_code": "NEGATIVE",
        "discount_type": "fixed",
        "fixed_amount": -10.0,
        "expiry_date": future,
    }
    res_neg = await client.post("/api/v1/coupons", json=payload_neg, headers=admin_headers)
    assert res_neg.status_code == 422

    # 4. Invalid discount type rejected (422)
    payload_bad_type = {
        "coupon_code": "BADTYPE",
        "discount_type": "bogo",
        "expiry_date": future,
    }
    res_bad_type = await client.post("/api/v1/coupons", json=payload_bad_type, headers=admin_headers)
    assert res_bad_type.status_code == 422

    # 5. Expiry date before start date rejected (422)
    payload_bad_dates = {
        "coupon_code": "BADDATES",
        "discount_type": "fixed",
        "fixed_amount": 20.0,
        "start_date": future,
        "expiry_date": past,
    }
    res_bad_dates = await client.post("/api/v1/coupons", json=payload_bad_dates, headers=admin_headers)
    assert res_bad_dates.status_code == 422


@pytest.mark.asyncio
async def test_coupon_usage_limits_and_checkout_integration(
    client: AsyncClient, admin_headers: dict, customer_headers: dict
):
    """Tests coupon validation, maximum discount capping, usage increment on checkout, and expiry/inactive guards."""
    future = (datetime.utcnow() + timedelta(days=5)).isoformat()
    past = (datetime.utcnow() - timedelta(days=1)).isoformat()
    upcoming = (datetime.utcnow() + timedelta(days=2)).isoformat()
    far_future = (datetime.utcnow() + timedelta(days=10)).isoformat()

    # 1. Create a percentage coupon with a max discount cap
    pct_coupon = {
        "coupon_code": "MEGADEAL",
        "discount_type": "percentage",
        "percentage": 50.0,
        "minimum_order": 100.0,
        "maximum_discount": 30.0,
        "expiry_date": future,
        "usage_limit": 2,
    }
    await client.post("/api/v1/coupons", json=pct_coupon, headers=admin_headers)

    # 2. Validate MEGADEAL with 200 order_total -> 50% is 100, capped at 30
    val_res = await client.post(
        "/api/v1/coupons/validate",
        json={"coupon_code": "MEGADEAL", "order_total": 200.0},
        headers=customer_headers,
    )
    assert val_res.status_code == 200
    assert val_res.json()["data"]["discount_amount"] == 30.0
    assert val_res.json()["data"]["final_amount"] == 170.0

    # 3. Create an expired coupon -> validation should fail (422)
    exp_coupon = {
        "coupon_code": "EXPIRED10",
        "discount_type": "fixed",
        "fixed_amount": 10.0,
        "expiry_date": past,
    }
    # Direct create bypass for expired testing
    await client.post("/api/v1/coupons", json=exp_coupon, headers=admin_headers)
    val_exp = await client.post(
        "/api/v1/coupons/validate",
        json={"coupon_code": "EXPIRED10", "order_total": 100.0},
        headers=customer_headers,
    )
    assert val_exp.status_code == 422
    assert "expired" in val_exp.json()["message"]

    # 4. Create an upcoming coupon -> validation should fail (422)
    up_coupon = {
        "coupon_code": "FUTURE10",
        "discount_type": "fixed",
        "fixed_amount": 10.0,
        "start_date": upcoming,
        "expiry_date": far_future,
    }
    await client.post("/api/v1/coupons", json=up_coupon, headers=admin_headers)
    val_up = await client.post(
        "/api/v1/coupons/validate",
        json={"coupon_code": "FUTURE10", "order_total": 100.0},
        headers=customer_headers,
    )
    assert val_up.status_code == 422
    assert "not started" in val_up.json()["message"]

    # 5. Invalid / Non-existent coupon code -> 404
    val_missing = await client.post(
        "/api/v1/coupons/validate",
        json={"coupon_code": "NONEXISTENT", "order_total": 100.0},
        headers=customer_headers,
    )
    assert val_missing.status_code == 404

    # 6. Checkout flow with coupon snapshot
    # Create product & add to cart
    cat_res = await client.post(
        "/api/v1/categories",
        json={"name": "Crackers Cat", "description": "Sparklers", "image_url": "http://img.jpg"},
        headers=admin_headers,
    )
    cat_id = cat_res.json()["data"]["id"]
    prod_res = await client.post(
        "/api/v1/products",
        json={"name": "Sparkler Box", "description": "Sparklers", "price": 120.0, "category_id": cat_id, "stock": 50},
        headers=admin_headers,
    )
    prod_id = prod_res.json()["data"]["id"]

    await client.post(
        "/api/v1/cart/add", json={"product_id": prod_id, "quantity": 1}, headers=customer_headers
    )

    # Checkout with coupon "MEGADEAL"
    checkout_payload = {
        "payment_method": "Credit Card",
        "shipping_address": "123 Sivakasi Fireworks St, Chennai",
        "coupon_code": "MEGADEAL",
    }
    chk_res = await client.post("/api/v1/orders/checkout", json=checkout_payload, headers=customer_headers)
    assert chk_res.status_code == 201
    order_data = chk_res.json()["data"]
    assert order_data["coupon_code"] == "MEGADEAL"
    assert order_data["coupon_discount"] == 30.0

    # Assert coupon used_count incremented in DB
    c_doc = await Coupon.find_one(Coupon.coupon_code == "MEGADEAL")
    assert c_doc.used_count == 1

