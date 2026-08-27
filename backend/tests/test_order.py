import pytest
from httpx import AsyncClient

from app.models.category import Category
from app.models.product import Product
from app.models.cart import Cart
from app.models.order import Order
from app.models.order_item import OrderItem


@pytest.fixture(autouse=True)
async def clean_order_db():
    """Wipes collections before each test for isolation."""
    await OrderItem.find_all().delete()
    await Order.find_all().delete()
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
        "name": "Smartphone Elite",
        "description": "Premium phone",
        "price": 800.0,
        "discount_price": 750.0,
        "category_id": cat_id,
        "stock": 10,
        "images": ["http://example.com/phone.png"],
    }
    prod_res = await client.post("/api/v1/products", json=prod_payload, headers=admin_headers)
    return prod_res.json()["data"]


@pytest.mark.asyncio
async def test_checkout_success(
    client: AsyncClient, customer_headers: dict, sample_product: dict
):
    """Tests checkout flow: stock verification, decriments, cart clearing, order logs."""
    # 1. Add to cart
    cart_payload = {"product_id": sample_product["id"], "quantity": 2}
    await client.post("/api/v1/cart/add", json=cart_payload, headers=customer_headers)

    # 2. Checkout
    checkout_payload = {
        "payment_method": "COD",
        "shipping_address": "123 Main St, New York, NY",
    }
    response = await client.post(
        "/api/v1/orders/checkout", json=checkout_payload, headers=customer_headers
    )
    assert response.status_code == 201
    res_json = response.json()
    assert res_json["success"] is True
    assert res_json["data"]["order_number"].startswith("ORD-")
    assert res_json["data"]["total"] == 1575.0
    assert len(res_json["data"]["items"]) == 1
    assert res_json["data"]["items"][0]["quantity"] == 2

    # 3. Verify stock was decremented from 10 to 8
    prod = await Product.get(sample_product["id"])
    assert prod.stock == 8

    # 4. Verify cart was cleared
    cart_items = await Cart.find_all().to_list()
    assert len(cart_items) == 0


@pytest.mark.asyncio
async def test_order_history_and_details(
    client: AsyncClient, customer_headers: dict, sample_product: dict
):
    """Tests fetching order listing, history alias, and detail records."""
    # 1. Place order
    cart_payload = {"product_id": sample_product["id"], "quantity": 1}
    await client.post("/api/v1/cart/add", json=cart_payload, headers=customer_headers)
    checkout_payload = {
        "payment_method": "Stripe",
        "shipping_address": "456 Side St, California",
    }
    create_res = await client.post(
        "/api/v1/orders/checkout", json=checkout_payload, headers=customer_headers
    )
    order_id = create_res.json()["data"]["id"]

    # 2. Get history
    history_res = await client.get("/api/v1/orders/history", headers=customer_headers)
    assert history_res.status_code == 200
    assert len(history_res.json()["data"]) == 1

    # 3. Get details
    details_res = await client.get(f"/api/v1/orders/{order_id}", headers=customer_headers)
    assert details_res.status_code == 200
    detail_data = details_res.json()["data"]
    assert detail_data["order_number"].startswith("ORD-")
    assert len(detail_data["items"]) == 1
    assert detail_data["shipping_address"] == "456 Side St, California"
    assert detail_data["customer_name"] is not None
    assert detail_data["customer_email"] is not None



@pytest.mark.asyncio
async def test_cancel_order_stock_recovery(
    client: AsyncClient, customer_headers: dict, sample_product: dict
):
    """Tests order cancellation and subsequent stock restoration."""
    # 1. Place order (stock goes from 10 to 9)
    cart_payload = {"product_id": sample_product["id"], "quantity": 1}
    await client.post("/api/v1/cart/add", json=cart_payload, headers=customer_headers)
    checkout_payload = {
        "payment_method": "COD",
        "shipping_address": "789 Third Ave, Chicago",
    }
    create_res = await client.post(
        "/api/v1/orders/checkout", json=checkout_payload, headers=customer_headers
    )
    order_id = create_res.json()["data"]["id"]

    prod_after_checkout = await Product.get(sample_product["id"])
    assert prod_after_checkout.stock == 9

    # 2. Cancel order
    cancel_res = await client.put(f"/api/v1/orders/{order_id}/cancel", headers=customer_headers)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["data"]["order_status"] == "Cancelled"

    # 3. Verify stock is restored to 10
    prod_after_cancel = await Product.get(sample_product["id"])
    assert prod_after_cancel.stock == 10


@pytest.mark.asyncio
async def test_admin_list_orders_success(
    client: AsyncClient, customer_headers: dict, admin_headers: dict, sample_product: dict
):
    """1. Admin can list orders."""
    # Place an order as customer
    cart_payload = {"product_id": sample_product["id"], "quantity": 1}
    await client.post("/api/v1/cart/add", json=cart_payload, headers=customer_headers)
    checkout_payload = {
        "payment_method": "COD",
        "shipping_address": "100 Broadway, New York, NY",
    }
    await client.post("/api/v1/orders/checkout", json=checkout_payload, headers=customer_headers)

    # List orders as Admin
    res = await client.get("/api/v1/admin/orders", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert "orders" in data
    assert data["total"] >= 1
    assert len(data["orders"]) >= 1
    first_order = data["orders"][0]
    assert "order_number" in first_order
    assert "total" in first_order
    assert "order_status" in first_order
    assert "payment_status" in first_order


@pytest.mark.asyncio
async def test_customer_cannot_list_admin_orders(
    client: AsyncClient, customer_headers: dict
):
    """2. Customer cannot list admin orders -> 403 Forbidden."""
    res = await client.get("/api/v1/admin/orders", headers=customer_headers)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_admin_search_orders(
    client: AsyncClient, customer_headers: dict, admin_headers: dict, sample_product: dict
):
    """3. Admin search works by order_number or shipping_address."""
    # Place order
    cart_payload = {"product_id": sample_product["id"], "quantity": 1}
    await client.post("/api/v1/cart/add", json=cart_payload, headers=customer_headers)
    checkout_payload = {
        "payment_method": "COD",
        "shipping_address": "UniqueSearchableStreet 999, Chicago",
    }
    checkout_res = await client.post("/api/v1/orders/checkout", json=checkout_payload, headers=customer_headers)
    order_number = checkout_res.json()["data"]["order_number"]

    # Search by unique order number
    res_num = await client.get(f"/api/v1/admin/orders?search={order_number}", headers=admin_headers)
    assert res_num.status_code == 200
    assert len(res_num.json()["data"]["orders"]) == 1
    assert res_num.json()["data"]["orders"][0]["order_number"] == order_number

    # Search by address keyword
    res_addr = await client.get("/api/v1/admin/orders?search=UniqueSearchableStreet", headers=admin_headers)
    assert res_addr.status_code == 200
    assert len(res_addr.json()["data"]["orders"]) == 1

    # Search with no match
    res_none = await client.get("/api/v1/admin/orders?search=NonExistentQueryXYZ", headers=admin_headers)
    assert res_none.status_code == 200
    assert len(res_none.json()["data"]["orders"]) == 0


@pytest.mark.asyncio
async def test_admin_status_filter_orders(
    client: AsyncClient, customer_headers: dict, admin_headers: dict, sample_product: dict
):
    """4. Admin status filter works for order_status and payment_status."""
    # Place order (default Pending status)
    cart_payload = {"product_id": sample_product["id"], "quantity": 1}
    await client.post("/api/v1/cart/add", json=cart_payload, headers=customer_headers)
    checkout_payload = {
        "payment_method": "COD",
        "shipping_address": "Filter Test Address",
    }
    create_res = await client.post("/api/v1/orders/checkout", json=checkout_payload, headers=customer_headers)
    order_id = create_res.json()["data"]["id"]

    # Filter by Pending
    res_pending = await client.get("/api/v1/admin/orders?order_status=Pending", headers=admin_headers)
    assert res_pending.status_code == 200
    assert any(o["id"] == order_id for o in res_pending.json()["data"]["orders"])

    # Filter by Delivered (none yet)
    res_delivered = await client.get("/api/v1/admin/orders?order_status=Delivered", headers=admin_headers)
    assert res_delivered.status_code == 200
    assert not any(o["id"] == order_id for o in res_delivered.json()["data"]["orders"])

    # Filter by payment_status Pending
    res_pay_pending = await client.get("/api/v1/admin/orders?payment_status=Pending", headers=admin_headers)
    assert res_pay_pending.status_code == 200
    assert any(o["id"] == order_id for o in res_pay_pending.json()["data"]["orders"])


@pytest.mark.asyncio
async def test_admin_orders_pagination(
    client: AsyncClient, customer_headers: dict, admin_headers: dict, sample_product: dict
):
    """5. Pagination works: page and limit parameter slice correctly."""
    # Place 3 orders
    for i in range(3):
        cart_payload = {"product_id": sample_product["id"], "quantity": 1}
        await client.post("/api/v1/cart/add", json=cart_payload, headers=customer_headers)
        checkout_payload = {
            "payment_method": "COD",
            "shipping_address": f"Pagination Street {i}",
        }
        await client.post("/api/v1/orders/checkout", json=checkout_payload, headers=customer_headers)

    # Page 1, limit 2
    res_p1 = await client.get("/api/v1/admin/orders?page=1&limit=2", headers=admin_headers)
    assert res_p1.status_code == 200
    data_p1 = res_p1.json()["data"]
    assert len(data_p1["orders"]) == 2
    assert data_p1["total"] == 3
    assert data_p1["total_pages"] == 2

    # Page 2, limit 2
    res_p2 = await client.get("/api/v1/admin/orders?page=2&limit=2", headers=admin_headers)
    assert res_p2.status_code == 200
    data_p2 = res_p2.json()["data"]
    assert len(data_p2["orders"]) == 1


@pytest.mark.asyncio
async def test_admin_update_order_status(
    client: AsyncClient, customer_headers: dict, admin_headers: dict, sample_product: dict
):
    """6. Admin can update order status."""
    # Place order
    cart_payload = {"product_id": sample_product["id"], "quantity": 1}
    await client.post("/api/v1/cart/add", json=cart_payload, headers=customer_headers)
    checkout_payload = {
        "payment_method": "COD",
        "shipping_address": "Update Status Address",
    }
    create_res = await client.post("/api/v1/orders/checkout", json=checkout_payload, headers=customer_headers)
    order_id = create_res.json()["data"]["id"]

    # Update to Confirmed
    update_res = await client.put(
        f"/api/v1/admin/orders/{order_id}/status",
        json={"order_status": "Confirmed"},
        headers=admin_headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["data"]["order_status"] == "Confirmed"

    # Update to Shipped
    ship_res = await client.put(
        f"/api/v1/admin/orders/{order_id}/status",
        json={"order_status": "Shipped"},
        headers=admin_headers,
    )
    assert ship_res.status_code == 200
    assert ship_res.json()["data"]["order_status"] == "Shipped"


@pytest.mark.asyncio
async def test_customer_cannot_update_order_status(
    client: AsyncClient, customer_headers: dict, sample_product: dict
):
    """7. Customer cannot update order status -> 403 Forbidden."""
    cart_payload = {"product_id": sample_product["id"], "quantity": 1}
    await client.post("/api/v1/cart/add", json=cart_payload, headers=customer_headers)
    checkout_payload = {
        "payment_method": "COD",
        "shipping_address": "Customer Forbidden Test",
    }
    create_res = await client.post("/api/v1/orders/checkout", json=checkout_payload, headers=customer_headers)
    order_id = create_res.json()["data"]["id"]

    res = await client.put(
        f"/api/v1/admin/orders/{order_id}/status",
        json={"order_status": "Delivered"},
        headers=customer_headers,
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_invalid_order_id_errors(
    client: AsyncClient, admin_headers: dict
):
    """8. Invalid order ID returns proper error (422 for bad ObjectId, 404 for missing)."""
    # Bad hex string format -> 422
    res_bad_id = await client.put(
        "/api/v1/admin/orders/invalid-id-format/status",
        json={"order_status": "Confirmed"},
        headers=admin_headers,
    )
    assert res_bad_id.status_code == 422

    # Non-existent valid ObjectId -> 404
    fake_id = "507f1f77bcf86cd799439011"
    res_missing = await client.put(
        f"/api/v1/admin/orders/{fake_id}/status",
        json={"order_status": "Confirmed"},
        headers=admin_headers,
    )
    assert res_missing.status_code == 404


@pytest.mark.asyncio
async def test_invalid_order_status_rejected(
    client: AsyncClient, customer_headers: dict, admin_headers: dict, sample_product: dict
):
    """9. Invalid status is rejected with validation error."""
    cart_payload = {"product_id": sample_product["id"], "quantity": 1}
    await client.post("/api/v1/cart/add", json=cart_payload, headers=customer_headers)
    checkout_payload = {
        "payment_method": "COD",
        "shipping_address": "Invalid Status Test",
    }
    create_res = await client.post("/api/v1/orders/checkout", json=checkout_payload, headers=customer_headers)
    order_id = create_res.json()["data"]["id"]

    res = await client.put(
        f"/api/v1/admin/orders/{order_id}/status",
        json={"order_status": "INVALID_STATUS_FOO"},
        headers=admin_headers,
    )
    assert res.status_code in [400, 422]


@pytest.mark.asyncio
async def test_payment_status_update_authorization(
    client: AsyncClient, customer_headers: dict, admin_headers: dict, sample_product: dict
):
    """10. Payment status update authorization works (Admin 200, Customer 403, invalid 422)."""
    cart_payload = {"product_id": sample_product["id"], "quantity": 1}
    await client.post("/api/v1/cart/add", json=cart_payload, headers=customer_headers)
    checkout_payload = {
        "payment_method": "COD",
        "shipping_address": "Payment Auth Address",
    }
    create_res = await client.post("/api/v1/orders/checkout", json=checkout_payload, headers=customer_headers)
    order_id = create_res.json()["data"]["id"]

    # Customer tries to update payment status -> 403
    cust_res = await client.put(
        f"/api/v1/admin/orders/{order_id}/payment-status",
        json={"payment_status": "Paid"},
        headers=customer_headers,
    )
    assert cust_res.status_code == 403

    # Admin updates payment status to Paid -> 200
    admin_res = await client.put(
        f"/api/v1/admin/orders/{order_id}/payment-status",
        json={"payment_status": "Paid"},
        headers=admin_headers,
    )
    assert admin_res.status_code == 200
    assert admin_res.json()["data"]["payment_status"] == "Paid"

    # Admin passes invalid payment status -> 422
    invalid_res = await client.put(
        f"/api/v1/admin/orders/{order_id}/payment-status",
        json={"payment_status": "NotARealStatus"},
        headers=admin_headers,
    )
    assert invalid_res.status_code in [400, 422]


@pytest.mark.asyncio
async def test_admin_delete_order_matrix(
    client: AsyncClient, customer_headers: dict, admin_headers: dict, sample_product: dict
):
    """Admin Delete Order Matrix:
    - Active statuses (Pending, Confirmed, Packed, Shipped) must be rejected (400).
    - Closed statuses (Delivered, Cancelled, Refunded) must succeed (200) and soft delete.
    """
    # 1. Test Active Statuses: Pending, Confirmed, Packed, Shipped
    for active_st in ["Pending", "Confirmed", "Packed", "Shipped"]:
        cart_payload = {"product_id": sample_product["id"], "quantity": 1}
        await client.post("/api/v1/cart/add", json=cart_payload, headers=customer_headers)
        create_res = await client.post(
            "/api/v1/orders/checkout",
            json={"payment_method": "COD", "shipping_address": "Test Active Addr"},
            headers=customer_headers,
        )
        ord_id = create_res.json()["data"]["id"]

        if active_st != "Pending":
            await client.put(
                f"/api/v1/admin/orders/{ord_id}/status",
                json={"order_status": active_st},
                headers=admin_headers,
            )

        # Admin delete attempt on active order -> 400
        del_res = await client.delete(f"/api/v1/orders/{ord_id}", headers=admin_headers)
        assert del_res.status_code == 400, f"Expected 400 when admin deletes {active_st} order"

    # 2. Test Delivered: Delete available (200 OK)
    cart_payload = {"product_id": sample_product["id"], "quantity": 1}
    await client.post("/api/v1/cart/add", json=cart_payload, headers=customer_headers)
    create_res = await client.post(
        "/api/v1/orders/checkout",
        json={"payment_method": "COD", "shipping_address": "Delivered Addr"},
        headers=customer_headers,
    )
    delivered_ord_id = create_res.json()["data"]["id"]
    await client.put(
        f"/api/v1/admin/orders/{delivered_ord_id}/status",
        json={"order_status": "Delivered"},
        headers=admin_headers,
    )

    del_res = await client.delete(f"/api/v1/orders/{delivered_ord_id}", headers=admin_headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # Check that it disappeared from admin orders list
    admin_list = await client.get("/api/v1/admin/orders", headers=admin_headers)
    orders_in_list = [o["id"] for o in admin_list.json()["data"]["orders"]]
    assert delivered_ord_id not in orders_in_list

    # Check that database record still exists (soft delete)
    db_order = await Order.get(delivered_ord_id)
    assert db_order is not None
    assert db_order.admin_deleted_at is not None

    # 3. Test Cancelled + Paid: Delete available (200 OK)
    cart_payload = {"product_id": sample_product["id"], "quantity": 1}
    await client.post("/api/v1/cart/add", json=cart_payload, headers=customer_headers)
    create_res = await client.post(
        "/api/v1/orders/checkout",
        json={"payment_method": "Card", "shipping_address": "Cancelled Paid Addr"},
        headers=customer_headers,
    )
    canc_ord_id = create_res.json()["data"]["id"]
    await client.put(
        f"/api/v1/admin/orders/{canc_ord_id}/payment-status",
        json={"payment_status": "Paid"},
        headers=admin_headers,
    )
    await client.put(
        f"/api/v1/admin/orders/{canc_ord_id}/status",
        json={"order_status": "Cancelled"},
        headers=admin_headers,
    )

    del_canc_res = await client.delete(f"/api/v1/orders/{canc_ord_id}", headers=admin_headers)
    assert del_canc_res.status_code == 200

    # 4. Test Cancelled + Refunded: Delete available (200 OK)
    cart_payload = {"product_id": sample_product["id"], "quantity": 1}
    await client.post("/api/v1/cart/add", json=cart_payload, headers=customer_headers)
    create_res = await client.post(
        "/api/v1/orders/checkout",
        json={"payment_method": "Card", "shipping_address": "Refunded Addr"},
        headers=customer_headers,
    )
    ref_ord_id = create_res.json()["data"]["id"]
    await client.put(
        f"/api/v1/admin/orders/{ref_ord_id}/payment-status",
        json={"payment_status": "Refunded"},
        headers=admin_headers,
    )
    await client.put(
        f"/api/v1/admin/orders/{ref_ord_id}/status",
        json={"order_status": "Cancelled"},
        headers=admin_headers,
    )

    del_ref_res = await client.delete(f"/api/v1/orders/{ref_ord_id}", headers=admin_headers)
    assert del_ref_res.status_code == 200


@pytest.mark.asyncio
async def test_customer_delete_order_matrix(
    client: AsyncClient, customer_headers: dict, admin_headers: dict, sample_product: dict
):
    """Customer Delete Order Matrix:
    - Active statuses (Pending, Confirmed, Packed, Shipped) must be rejected (400).
    - Closed statuses (Delivered, Cancelled, Refunded) must succeed (200) and soft delete.
    """
    # 1. Test Active Statuses: Pending, Confirmed, Packed, Shipped
    for active_st in ["Pending", "Confirmed", "Packed", "Shipped"]:
        cart_payload = {"product_id": sample_product["id"], "quantity": 1}
        await client.post("/api/v1/cart/add", json=cart_payload, headers=customer_headers)
        create_res = await client.post(
            "/api/v1/orders/checkout",
            json={"payment_method": "COD", "shipping_address": "Customer Active Addr"},
            headers=customer_headers,
        )
        ord_id = create_res.json()["data"]["id"]

        if active_st != "Pending":
            await client.put(
                f"/api/v1/admin/orders/{ord_id}/status",
                json={"order_status": active_st},
                headers=admin_headers,
            )

        # Customer delete attempt on active order -> 400
        del_res = await client.delete(f"/api/v1/orders/{ord_id}", headers=customer_headers)
        assert del_res.status_code == 400, f"Expected 400 when customer deletes {active_st} order"

    # 2. Test Delivered: Delete available (200 OK)
    cart_payload = {"product_id": sample_product["id"], "quantity": 1}
    await client.post("/api/v1/cart/add", json=cart_payload, headers=customer_headers)
    create_res = await client.post(
        "/api/v1/orders/checkout",
        json={"payment_method": "COD", "shipping_address": "Customer Delivered Addr"},
        headers=customer_headers,
    )
    delivered_ord_id = create_res.json()["data"]["id"]
    await client.put(
        f"/api/v1/admin/orders/{delivered_ord_id}/status",
        json={"order_status": "Delivered"},
        headers=admin_headers,
    )

    del_res = await client.delete(f"/api/v1/orders/{delivered_ord_id}", headers=customer_headers)
    assert del_res.status_code == 200

    # Check that it disappeared from customer orders list
    cust_list = await client.get("/api/v1/orders", headers=customer_headers)
    orders_in_list = [o["id"] for o in cust_list.json()["data"]]
    assert delivered_ord_id not in orders_in_list

    # Check that database record still exists (soft delete)
    db_order = await Order.get(delivered_ord_id)
    assert db_order is not None
    assert db_order.customer_deleted_at is not None

    # 3. Test Cancelled: Delete available (200 OK)
    cart_payload = {"product_id": sample_product["id"], "quantity": 1}
    await client.post("/api/v1/cart/add", json=cart_payload, headers=customer_headers)
    create_res = await client.post(
        "/api/v1/orders/checkout",
        json={"payment_method": "COD", "shipping_address": "Customer Cancelled Addr"},
        headers=customer_headers,
    )
    canc_ord_id = create_res.json()["data"]["id"]
    await client.put(f"/api/v1/orders/{canc_ord_id}/cancel", headers=customer_headers)

    del_canc_res = await client.delete(f"/api/v1/orders/{canc_ord_id}", headers=customer_headers)
    assert del_canc_res.status_code == 200

    # 4. Test Cancelled + Refunded: Delete available (200 OK)
    cart_payload = {"product_id": sample_product["id"], "quantity": 1}
    await client.post("/api/v1/cart/add", json=cart_payload, headers=customer_headers)
    create_res = await client.post(
        "/api/v1/orders/checkout",
        json={"payment_method": "Card", "shipping_address": "Customer Refunded Addr"},
        headers=customer_headers,
    )
    ref_ord_id = create_res.json()["data"]["id"]
    await client.put(
        f"/api/v1/admin/orders/{ref_ord_id}/payment-status",
        json={"payment_status": "Refunded"},
        headers=admin_headers,
    )
    await client.put(
        f"/api/v1/admin/orders/{ref_ord_id}/status",
        json={"order_status": "Cancelled"},
        headers=admin_headers,
    )

    del_ref_res = await client.delete(f"/api/v1/orders/{ref_ord_id}", headers=customer_headers)
    assert del_ref_res.status_code == 200


@pytest.mark.asyncio
async def test_customer_cannot_delete_other_customer_order(
    client: AsyncClient, customer_headers: dict, admin_headers: dict, sample_product: dict
):
    """Customer cannot delete another customer's order (403 Forbidden)."""
    from app.core.security import create_access_token, hash_password
    from app.models.user import User

    # Create 2nd customer
    customer_2 = await User.find_one(User.email == "other_customer@example.com")
    if not customer_2:
        customer_2 = User(
            full_name="Other Customer",
            email="other_customer@example.com",
            phone="+17777777777",
            password_hash=hash_password("OtherPassword123!"),
            role="CUSTOMER",
            is_verified=True,
            is_active=True,
            status="active",
        )
        await customer_2.insert()
    
    token_2 = create_access_token({"sub": str(customer_2.id), "role": customer_2.role})
    other_customer_headers = {"Authorization": f"Bearer {token_2}"}

    # Customer 1 creates order and it is Delivered
    cart_payload = {"product_id": sample_product["id"], "quantity": 1}
    await client.post("/api/v1/cart/add", json=cart_payload, headers=customer_headers)
    create_res = await client.post(
        "/api/v1/orders/checkout",
        json={"payment_method": "COD", "shipping_address": "Customer 1 Addr"},
        headers=customer_headers,
    )
    cust1_ord_id = create_res.json()["data"]["id"]
    await client.put(
        f"/api/v1/admin/orders/{cust1_ord_id}/status",
        json={"order_status": "Delivered"},
        headers=admin_headers,
    )

    # Customer 2 attempts to delete Customer 1's order -> 403 Forbidden
    del_res = await client.delete(f"/api/v1/orders/{cust1_ord_id}", headers=other_customer_headers)
    assert del_res.status_code == 403
    assert "own orders" in del_res.json()["message"].lower()


@pytest.mark.asyncio
async def test_delete_all_cancelled_orders(
    client: AsyncClient,
    customer_headers: dict,
    admin_headers: dict,
    sample_product: dict,
):
    """Verifies bulk deletion of all cancelled orders for Customer and Admin."""
    # 1. Create order 1 and cancel it
    await client.post("/api/v1/cart/add", json={"product_id": sample_product["id"], "quantity": 1}, headers=customer_headers)
    res1 = await client.post("/api/v1/orders/checkout", json={"payment_method": "COD", "shipping_address": "Addr 1"}, headers=customer_headers)
    ord1_id = res1.json()["data"]["id"]
    await client.put(f"/api/v1/orders/{ord1_id}/cancel", headers=customer_headers)

    # 2. Customer calls DELETE /api/v1/orders/cancelled/all
    del_cust_res = await client.delete("/api/v1/orders/cancelled/all", headers=customer_headers)
    assert del_cust_res.status_code == 200
    assert del_cust_res.json()["data"]["deleted_count"] >= 1

    # 3. Admin calls DELETE /api/v1/admin/orders/cancelled/all
    del_admin_res = await client.delete("/api/v1/admin/orders/cancelled/all", headers=admin_headers)
    assert del_admin_res.status_code == 200
    assert del_admin_res.json()["data"]["deleted_count"] >= 1

