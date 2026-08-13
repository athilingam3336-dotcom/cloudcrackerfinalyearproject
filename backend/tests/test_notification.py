import pytest
from httpx import AsyncClient

from app.models.notification import Notification
from app.models.user import User


@pytest.fixture(autouse=True)
async def clean_notification_db():
    """Wipes notifications collection before each test."""
    await Notification.find_all().delete()
    yield


@pytest.mark.asyncio
async def test_admin_create_notification(
    client: AsyncClient, admin_headers: dict, customer_user: User
):
    """Tests creating a notification for a user as an admin."""
    payload = {
        "user_id": str(customer_user.id),
        "title": "Order Shipped",
        "message": "Your package is on the way!",
        "type": "order",
        "tag": "IN TRANSIT",
    }
    response = await client.post(
        "/api/v1/admin/notifications", json=payload, headers=admin_headers
    )
    assert response.status_code == 201
    res_json = response.json()
    assert res_json["success"] is True
    assert res_json["data"]["title"] == "Order Shipped"
    assert res_json["data"]["user_id"] == str(customer_user.id)
    assert res_json["data"]["is_read"] is False


@pytest.mark.asyncio
async def test_customer_get_notifications(
    client: AsyncClient, admin_headers: dict, customer_headers: dict, customer_user: User
):
    """Tests retrieving user notifications and unread count."""
    # Create 2 notifications for customer
    p1 = {
        "user_id": str(customer_user.id),
        "title": "Notif 1",
        "message": "Msg 1",
        "type": "system",
    }
    p2 = {
        "user_id": str(customer_user.id),
        "title": "Notif 2",
        "message": "Msg 2",
        "type": "promo",
    }
    await client.post("/api/v1/admin/notifications", json=p1, headers=admin_headers)
    await client.post("/api/v1/admin/notifications", json=p2, headers=admin_headers)

    # Get notifications
    response = await client.get("/api/v1/notifications", headers=customer_headers)
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["success"] is True
    assert res_json["data"]["total_count"] == 2
    assert res_json["data"]["unread_count"] == 2

    # Check unread-count endpoint
    count_res = await client.get(
        "/api/v1/notifications/unread-count", headers=customer_headers
    )
    assert count_res.status_code == 200
    assert count_res.json()["data"]["unread_count"] == 2


@pytest.mark.asyncio
async def test_mark_notification_as_read(
    client: AsyncClient, admin_headers: dict, customer_headers: dict, customer_user: User
):
    """Tests marking single and all notifications as read."""
    # Create notification
    p = {
        "user_id": str(customer_user.id),
        "title": "Notif Single",
        "message": "Msg Single",
        "type": "price",
    }
    create_res = await client.post(
        "/api/v1/admin/notifications", json=p, headers=admin_headers
    )
    notif_id = create_res.json()["data"]["id"]

    # Mark single as read
    read_res = await client.put(
        f"/api/v1/notifications/{notif_id}/read", headers=customer_headers
    )
    assert read_res.status_code == 200
    assert read_res.json()["data"]["is_read"] is True

    # Mark all as read
    all_res = await client.put(
        "/api/v1/notifications/read-all", headers=customer_headers
    )
    assert all_res.status_code == 200


@pytest.mark.asyncio
async def test_delete_notification(
    client: AsyncClient, admin_headers: dict, customer_headers: dict, customer_user: User
):
    """Tests deleting a notification."""
    p = {
        "user_id": str(customer_user.id),
        "title": "To Delete",
        "message": "Msg Delete",
        "type": "system",
    }
    create_res = await client.post(
        "/api/v1/admin/notifications", json=p, headers=admin_headers
    )
    notif_id = create_res.json()["data"]["id"]

    del_res = await client.delete(
        f"/api/v1/notifications/{notif_id}", headers=customer_headers
    )
    assert del_res.status_code == 200

    # Retrieve list -> count should be 0
    list_res = await client.get("/api/v1/notifications", headers=customer_headers)
    assert list_res.json()["data"]["total_count"] == 0
