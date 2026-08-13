import pytest
from httpx import AsyncClient

from app.core.security import hash_password
from app.models.category import Category
from app.models.order import Order
from app.models.product import Product
from app.models.user import User


@pytest.fixture(autouse=True)
async def clean_test_collections():
    """Wipes ephemeral products, categories, orders, and ephemeral test users while preserving standard admin/customer users."""
    await Product.find_all().delete()
    await Category.find_all().delete()
    await Order.find_all().delete()
    await User.find(
        {"email": {"$nin": ["admin@example.com", "customer@example.com"]}}
    ).delete()
    yield


@pytest.mark.asyncio
async def test_admin_list_users_and_customer_forbidden(
    client: AsyncClient, admin_headers: dict, customer_headers: dict, customer_user: User
):
    """Tests that admin can list users with live summary metrics while customer receives 403."""
    # Customer gets 403
    cust_res = await client.get("/api/v1/admin/users", headers=customer_headers)
    assert cust_res.status_code == 403

    # Admin gets 200
    admin_res = await client.get("/api/v1/admin/users", headers=admin_headers)
    assert admin_res.status_code == 200
    data = admin_res.json()["data"]
    assert data["total"] >= 2
    assert "metrics" in data
    assert data["metrics"]["total_users"] >= 2
    assert data["metrics"]["admin_count"] >= 1
    assert data["metrics"]["customer_count"] >= 1


@pytest.mark.asyncio
async def test_admin_search_and_filter_users(
    client: AsyncClient, admin_headers: dict
):
    """Tests search across name, email, phone and role/status filtering."""
    # Create test customers
    u1 = User(
        full_name="Rajesh Sparkler",
        email="rajesh.sparkler@example.com",
        phone="+919876543210",
        password_hash=hash_password("Pass1234!"),
        role="CUSTOMER",
        is_active=True,
        status="active",
    )
    u2 = User(
        full_name="Anita Firework",
        email="anita.firework@example.com",
        phone="+919876543211",
        password_hash=hash_password("Pass1234!"),
        role="CUSTOMER",
        is_active=False,
        status="inactive",
    )
    u3 = User(
        full_name="Suresh Blocked",
        email="suresh.blocked@example.com",
        phone="+919876543212",
        password_hash=hash_password("Pass1234!"),
        role="CUSTOMER",
        is_active=False,
        status="blocked",
    )
    await u1.insert()
    await u2.insert()
    await u3.insert()

    # Search by name
    res_search = await client.get("/api/v1/admin/users?search=Rajesh", headers=admin_headers)
    assert res_search.status_code == 200
    search_data = res_search.json()["data"]
    assert len(search_data["users"]) == 1
    assert search_data["users"][0]["full_name"] == "Rajesh Sparkler"

    # Search by phone
    res_phone = await client.get("/api/v1/admin/users?search=9876543211", headers=admin_headers)
    assert res_phone.status_code == 200
    assert len(res_phone.json()["data"]["users"]) == 1

    # Filter by role CUSTOMER
    res_cust = await client.get("/api/v1/admin/users?role=CUSTOMER", headers=admin_headers)
    assert res_cust.status_code == 200
    for u in res_cust.json()["data"]["users"]:
        assert u["role"] == "CUSTOMER"

    # Filter by status blocked
    res_blocked = await client.get("/api/v1/admin/users?account_status=blocked", headers=admin_headers)
    assert res_blocked.status_code == 200
    assert any(u["status"] == "blocked" for u in res_blocked.json()["data"]["users"])

    # Pagination
    res_page = await client.get("/api/v1/admin/users?page=1&limit=2", headers=admin_headers)
    assert res_page.status_code == 200
    page_data = res_page.json()["data"]
    assert len(page_data["users"]) == 2
    assert page_data["total_pages"] >= 2


@pytest.mark.asyncio
async def test_admin_user_details_and_id_validations(
    client: AsyncClient, admin_headers: dict, customer_headers: dict, customer_user: User
):
    """Tests retrieving user details, invalid ID format 422, non-existent 404, and customer 403."""
    user_id = str(customer_user.id)

    # Customer gets 403
    cust_res = await client.get(f"/api/v1/admin/users/{user_id}", headers=customer_headers)
    assert cust_res.status_code == 403

    # Admin gets 200
    admin_res = await client.get(f"/api/v1/admin/users/{user_id}", headers=admin_headers)
    assert admin_res.status_code == 200
    data = admin_res.json()["data"]
    assert data["id"] == user_id
    assert data["email"] == customer_user.email
    assert "order_summary" in data

    # Invalid ID -> 422
    bad_id_res = await client.get("/api/v1/admin/users/invalid-id-hex", headers=admin_headers)
    assert bad_id_res.status_code == 422

    # Non-existent ID -> 404
    non_existent_hex = "507f1f77bcf86cd799439011"
    not_found_res = await client.get(f"/api/v1/admin/users/{non_existent_hex}", headers=admin_headers)
    assert not_found_res.status_code == 404


@pytest.mark.asyncio
async def test_admin_update_status_and_role_management(
    client: AsyncClient, admin_headers: dict, customer_headers: dict, customer_user: User, admin_user: User
):
    """Tests updating user status, updating role, invalid inputs, customer 403, and admin lockout prevention."""
    # Create an ephemeral customer for mutation tests
    mut_user = User(
        full_name="Mutation Target",
        email="mutation.target@example.com",
        phone="+919999888800",
        password_hash=hash_password("Pass1234!"),
        role="CUSTOMER",
        is_active=True,
        status="active",
    )
    await mut_user.insert()
    user_id = str(mut_user.id)

    # 1. Customer cannot update status -> 403
    cust_status = await client.patch(
        f"/api/v1/admin/users/{user_id}/status", json={"status": "inactive"}, headers=customer_headers
    )
    assert cust_status.status_code == 403

    # 2. Customer cannot update role -> 403
    cust_role = await client.patch(
        f"/api/v1/admin/users/{user_id}/role", json={"role": "ADMIN"}, headers=customer_headers
    )
    assert cust_role.status_code == 403

    # 3. Admin updates status to blocked -> 200
    admin_status = await client.patch(
        f"/api/v1/admin/users/{user_id}/status", json={"status": "blocked"}, headers=admin_headers
    )
    assert admin_status.status_code == 200
    assert admin_status.json()["data"]["status"] == "blocked"
    assert admin_status.json()["data"]["is_active"] is False

    # 4. Invalid status string -> 422
    bad_status = await client.patch(
        f"/api/v1/admin/users/{user_id}/status", json={"status": "unknown_status"}, headers=admin_headers
    )
    assert bad_status.status_code == 422

    # Unblock user to make it an active admin
    await client.patch(
        f"/api/v1/admin/users/{user_id}/status", json={"status": "active"}, headers=admin_headers
    )

    # 5. Admin promotes customer to ADMIN -> 200
    promote_res = await client.patch(
        f"/api/v1/admin/users/{user_id}/role", json={"role": "ADMIN"}, headers=admin_headers
    )
    assert promote_res.status_code == 200
    assert promote_res.json()["data"]["role"] == "ADMIN"

    # 6. Invalid role string -> 422
    bad_role = await client.patch(
        f"/api/v1/admin/users/{user_id}/role", json={"role": "SUPERUSER"}, headers=admin_headers
    )
    assert bad_role.status_code == 422

    # 7. Demote customer back to CUSTOMER -> 200 (since original admin_user is also active)
    demote_res = await client.patch(
        f"/api/v1/admin/users/{user_id}/role", json={"role": "CUSTOMER"}, headers=admin_headers
    )
    assert demote_res.status_code == 200
    assert demote_res.json()["data"]["role"] == "CUSTOMER"

    # 8. Prevent sole admin demotion / lockout
    admin_id = str(admin_user.id)
    lockout_res = await client.patch(
        f"/api/v1/admin/users/{admin_id}/role", json={"role": "CUSTOMER"}, headers=admin_headers
    )
    assert lockout_res.status_code == 422
    assert "only remaining administrator" in lockout_res.json()["message"]

    # 9. Prevent sole admin deactivation / lockout
    deactivate_lockout = await client.patch(
        f"/api/v1/admin/users/{admin_id}/status", json={"status": "inactive"}, headers=admin_headers
    )
    assert deactivate_lockout.status_code == 422
    assert "only remaining administrator" in deactivate_lockout.json()["message"]


@pytest.mark.asyncio
async def test_admin_customer_order_history_and_soft_delete(
    client: AsyncClient, admin_headers: dict, customer_headers: dict, customer_user: User
):
    """Tests admin fetching customer orders, customer access blocked (403), and safe soft deletion preserving orders."""
    user_id = str(customer_user.id)

    # 1. Create a category, product and place an order for the customer
    cat = Category(name="Rockets", description="Aerial", image_url="http://img.jpg")
    await cat.insert()
    prod = Product(name="Sky Bomb", description="Loud", price=250.0, category_id=cat.id, stock=20)
    await prod.insert()

    await client.post("/api/v1/cart/add", json={"product_id": str(prod.id), "quantity": 2}, headers=customer_headers)
    checkout_res = await client.post(
        "/api/v1/orders/checkout",
        json={"payment_method": "Card", "shipping_address": "42 Pyrotechnic Lane, Sivakasi"},
        headers=customer_headers,
    )
    assert checkout_res.status_code == 201
    order_data = checkout_res.json()["data"]

    # 2. Customer gets 403 on admin user orders endpoint
    cust_orders_res = await client.get(f"/api/v1/admin/users/{user_id}/orders", headers=customer_headers)
    assert cust_orders_res.status_code == 403

    # 3. Admin retrieves customer orders -> 200
    admin_orders_res = await client.get(f"/api/v1/admin/users/{user_id}/orders", headers=admin_headers)
    assert admin_orders_res.status_code == 200
    orders_payload = admin_orders_res.json()["data"]
    assert orders_payload["total"] == 1
    assert orders_payload["orders"][0]["order_number"] == order_data["order_number"]
    assert orders_payload["order_summary"]["total_orders"] == 1

    # 4. Soft delete / deactivate user
    del_res = await client.delete(f"/api/v1/admin/users/{user_id}", headers=admin_headers)
    assert del_res.status_code == 200
    assert del_res.json()["data"]["is_active"] is False

    # 5. Assert historical order in MongoDB still exists intact
    saved_order = await Order.find_one(Order.order_number == order_data["order_number"])
    assert saved_order is not None
    assert saved_order.total == order_data["total"]
