import pytest
from httpx import AsyncClient

from app.models.image import Image


@pytest.fixture(autouse=True)
async def clean_image_db():
    """Wipes the database images collection before each test."""
    await Image.find_all().delete()
    yield


@pytest.mark.asyncio
async def test_upload_product_image_admin_only(
    client: AsyncClient, admin_headers: dict, customer_headers: dict
):
    """Tests that uploading product images is restricted to admins."""
    # Customer tries -> forbidden (403)
    files = {"file": ("test.png", b"fake image bytes", "image/png")}
    res_cust = await client.post("/api/v1/upload/product", files=files, headers=customer_headers)
    assert res_cust.status_code == 403

    # Admin tries -> succeeds (201)
    res_admin = await client.post("/api/v1/upload/product", files=files, headers=admin_headers)
    assert res_admin.status_code == 201
    assert res_admin.json()["success"] is True
    assert "metadata" in res_admin.json()["data"]
    assert res_admin.json()["data"]["metadata"]["folder"] == "products"


@pytest.mark.asyncio
async def test_upload_profile_and_review_images(client: AsyncClient, customer_headers: dict):
    """Tests that customers can upload profile and review images."""
    files = {"file": ("avatar.jpg", b"fake image avatar", "image/jpeg")}
    res_prof = await client.post("/api/v1/upload/profile", files=files, headers=customer_headers)
    assert res_prof.status_code == 201
    assert res_prof.json()["data"]["metadata"]["folder"] == "profiles"

    files_rev = {"file": ("item.webp", b"fake image review", "image/webp")}
    res_rev = await client.post("/api/v1/upload/review", files=files_rev, headers=customer_headers)
    assert res_rev.status_code == 201
    assert res_rev.json()["data"]["metadata"]["folder"] == "reviews"


@pytest.mark.asyncio
async def test_upload_validation_mime_and_size(client: AsyncClient, customer_headers: dict):
    """Tests validation rules rejecting invalid mime types and oversized files."""
    # 1. Invalid mime type (.txt file) -> fails (422)
    files_txt = {"file": ("notes.txt", b"plain text content", "text/plain")}
    res_txt = await client.post("/api/v1/upload/profile", files=files_txt, headers=customer_headers)
    assert res_txt.status_code == 422
    assert "Only JPG, JPEG, PNG, and WEBP formats are allowed" in res_txt.json()["message"]

    # 2. Oversized image (> 5 MB) -> fails (422)
    large_bytes = b"0" * (6 * 1024 * 1024)  # 6 MB
    files_large = {"file": ("huge.png", large_bytes, "image/png")}
    res_large = await client.post("/api/v1/upload/profile", files=files_large, headers=customer_headers)
    assert res_large.status_code == 422
    assert "exceeds limit of 5 MB" in res_large.json()["message"]


@pytest.mark.asyncio
async def test_delete_and_replace_image(client: AsyncClient, customer_headers: dict, admin_headers: dict):
    """Tests deleting and replacing images with ownership gates."""
    # 1. Upload first image
    files = {"file": ("test.png", b"fake image bytes", "image/png")}
    res = await client.post("/api/v1/upload/profile", files=files, headers=customer_headers)
    img_id = res.json()["data"]["image_id"]

    # 2. Another user tries to delete -> forbidden (403)
    # Using admin headers for authorization check: let's verify if admin bypasses (yes, admin bypasses).
    # To test unauthorized delete, we can register another client or just check that a standard user cannot delete admin's uploads.
    # Let's check: standard user tries to delete image owned by admin (represented by image with user_id = admin)
    img_admin_res = await client.post("/api/v1/upload/product", files=files, headers=admin_headers)
    img_admin_id = img_admin_res.json()["data"]["image_id"]
    
    res_del_fail = await client.delete(f"/api/v1/upload/{img_admin_id}", headers=customer_headers)
    assert res_del_fail.status_code == 403

    # 3. Replace image -> succeeds
    replace_files = {"file": ("new.jpg", b"fake replacement", "image/jpeg")}
    res_replace = await client.put(f"/api/v1/upload/{img_id}", files=replace_files, headers=customer_headers)
    assert res_replace.status_code == 200
    assert res_replace.json()["data"]["metadata"]["format"] == "jpg"

    # 4. Owner deletes image -> succeeds
    res_del_ok = await client.delete(f"/api/v1/upload/{img_id}", headers=customer_headers)
    assert res_del_ok.status_code == 200
