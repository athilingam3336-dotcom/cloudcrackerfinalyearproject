import pytest
from httpx import AsyncClient

from app.models.category import Category
from app.models.product import Product
from app.models.wishlist import Wishlist
from app.models.cart import Cart


@pytest.fixture(autouse=True)
async def clean_wishlist_db():
    """Wipes collections before each test for isolation."""
    await Wishlist.find_all().delete()
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
        "name": "Super Phone",
        "description": "Powerful phone",
        "price": 500.0,
        "discount_price": 450.0,
        "category_id": cat_id,
        "stock": 3,
        "images": ["http://example.com/phone.png"],
    }
    prod_res = await client.post("/api/v1/products", json=prod_payload, headers=admin_headers)
    return prod_res.json()["data"]


@pytest.mark.asyncio
async def test_add_to_wishlist_success(
    client: AsyncClient, customer_headers: dict, sample_product: dict
):
    """Tests successful product addition to the wishlist."""
    payload = {"product_id": sample_product["id"]}
    response = await client.post("/api/v1/wishlist/add", json=payload, headers=customer_headers)
    assert response.status_code == 201
    res_json = response.json()
    assert res_json["success"] is True
    assert res_json["data"]["product_id"] == sample_product["id"]


@pytest.mark.asyncio
async def test_add_to_wishlist_duplicate_idempotency(
    client: AsyncClient, customer_headers: dict, sample_product: dict
):
    """Tests that duplicate wishlist additions are handled idempotently without creating duplicate records."""
    payload = {"product_id": sample_product["id"]}
    # First addition
    res1 = await client.post("/api/v1/wishlist/add", json=payload, headers=customer_headers)
    assert res1.status_code == 201
    id1 = res1.json()["data"]["id"]

    # Second addition
    res2 = await client.post("/api/v1/wishlist/add", json=payload, headers=customer_headers)
    assert res2.status_code == 201 or res2.status_code == 200
    id2 = res2.json()["data"]["id"]

    # Ensure IDs match and only one document exists in DB
    assert id1 == id2
    wishlist_count = await Wishlist.find_all().count()
    assert wishlist_count == 1


@pytest.mark.asyncio
async def test_view_and_delete_wishlist(
    client: AsyncClient, customer_headers: dict, sample_product: dict
):
    """Tests wishlist list display and removal processes."""
    # 1. Add item
    payload = {"product_id": sample_product["id"]}
    create_res = await client.post("/api/v1/wishlist/add", json=payload, headers=customer_headers)
    wishlist_id = create_res.json()["data"]["id"]

    # 2. View wishlist
    view_res = await client.get("/api/v1/wishlist", headers=customer_headers)
    assert view_res.status_code == 200
    assert len(view_res.json()["data"]) == 1
    assert view_res.json()["data"][0]["product"]["name"] == "Super Phone"

    # 3. Delete wishlist item
    del_res = await client.delete(f"/api/v1/wishlist/{wishlist_id}", headers=customer_headers)
    assert del_res.status_code == 200

    # 4. View wishlist again -> should be empty
    view_res = await client.get("/api/v1/wishlist", headers=customer_headers)
    assert len(view_res.json()["data"]) == 0


@pytest.mark.asyncio
async def test_move_wishlist_to_cart_success(
    client: AsyncClient, customer_headers: dict, sample_product: dict
):
    """Tests successful movement of a product from the wishlist to the shopping cart."""
    # 1. Add item to wishlist
    payload = {"product_id": sample_product["id"]}
    create_res = await client.post("/api/v1/wishlist/add", json=payload, headers=customer_headers)
    wishlist_id = create_res.json()["data"]["id"]

    # 2. Move to cart
    move_res = await client.post(
        f"/api/v1/wishlist/{wishlist_id}/move-to-cart", headers=customer_headers
    )
    assert move_res.status_code == 200
    move_json = move_res.json()
    assert move_json["success"] is True

    # 3. Verify wishlist is empty
    wish_res = await client.get("/api/v1/wishlist", headers=customer_headers)
    assert len(wish_res.json()["data"]) == 0

    # 4. Verify cart contains the product with quantity 1
    cart_res = await client.get("/api/v1/cart", headers=customer_headers)
    assert len(cart_res.json()["data"]) == 1
    assert cart_res.json()["data"][0]["quantity"] == 1
    assert cart_res.json()["data"][0]["product_id"] == sample_product["id"]


@pytest.mark.asyncio
async def test_move_to_cart_out_of_stock(
    client: AsyncClient, customer_headers: dict, sample_product: dict, admin_headers: dict
):
    """Tests that moving an item to the cart fails if the product goes out of stock."""
    # 1. Add item to wishlist
    payload = {"product_id": sample_product["id"]}
    create_res = await client.post("/api/v1/wishlist/add", json=payload, headers=customer_headers)
    wishlist_id = create_res.json()["data"]["id"]

    # 2. Force product stock to 0
    await client.put(
        f"/api/v1/products/{sample_product['id']}", json={"stock": 0}, headers=admin_headers
    )

    # 3. Attempt move to cart -> should fail stock validation (422/400)
    move_res = await client.post(
        f"/api/v1/wishlist/{wishlist_id}/move-to-cart", headers=customer_headers
    )
    assert move_res.status_code == 422
    assert "out of stock" in move_res.json()["message"]
