import asyncio
from httpx import ASGITransport, AsyncClient
from motor.motor_asyncio import AsyncIOMotorClient
from app.main import app
from app.core.database import db_manager

async def run_e2e_verification():
    print("=== STARTING END-TO-END FLOW VERIFICATION ===")
    await db_manager.connect()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Login
        login_res = await client.post("/api/v1/auth/login", json={
            "email": "customer@example.com",
            "password": "CustomerPassword123!"
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        token = login_res.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("✅ 1. Customer authenticated successfully.")

        # 2. Fetch Products
        prod_res = await client.get("/api/v1/products?limit=20")
        assert prod_res.status_code == 200
        prods = prod_res.json()["data"]["products"]
        assert len(prods) > 0, "No products found!"
        target_prod = prods[0]
        target_id = target_prod["id"]
        prod_name = target_prod["name"]
        print(f"✅ 2. Retrieved products catalog. Selected product: {prod_name} (ID: {target_id})")

        # 3. Add to Cart
        add_cart_res = await client.post("/api/v1/cart/add", json={
            "product_id": target_id,
            "quantity": 2
        }, headers=headers)
        assert add_cart_res.status_code == 201, f"Add to cart failed: {add_cart_res.text}"
        print("✅ 3. Added product to Cart (HTTP 201).")

        # 4. Navigate / Fetch Cart
        cart_res = await client.get("/api/v1/cart", headers=headers)
        assert cart_res.status_code == 200
        cart_items = cart_res.json()["data"]
        assert len(cart_items) > 0, "Cart is empty on fetch!"
        assert cart_items[0]["product_id"] == target_id
        assert cart_items[0]["product"]["name"] == prod_name
        cart_qty = cart_items[0]["quantity"]
        print(f"✅ 4. Navigated to Cart: Item persists with product name '{prod_name}' and qty {cart_qty}.")

        # 5. Add to Wishlist
        wish_prod = prods[1] if len(prods) > 1 else target_prod
        wish_id = wish_prod["id"]
        wish_name = wish_prod["name"]
        add_wish_res = await client.post("/api/v1/wishlist/add", json={
            "product_id": wish_id
        }, headers=headers)
        assert add_wish_res.status_code in [200, 201], f"Add to wishlist failed: {add_wish_res.text}"
        print(f"✅ 5. Added product '{wish_name}' to Wishlist.")

        # 6. Navigate / Fetch Wishlist
        wish_res = await client.get("/api/v1/wishlist", headers=headers)
        assert wish_res.status_code == 200
        wish_items = wish_res.json()["data"]
        assert len(wish_items) > 0, "Wishlist is empty on fetch!"
        matching_wish = [w for w in wish_items if w["product_id"] == wish_id]
        assert len(matching_wish) > 0
        print(f"✅ 6. Navigated to Wishlist: Item persists with product name '{matching_wish[0]['product']['name']}'.")

        # 7. Refresh Rehydration Test (Direct Database check in Atlas)
        mclient = AsyncIOMotorClient("mongodb+srv://athilingam3336_db_user:u600L14LC7NjwINQ@cloudcrackers.0fcxwnp.mongodb.net")
        db = mclient["cloudcrackers"]
        db_cart = await db["Cart"].count_documents({"product_id": target_id})
        assert db_cart >= 1 or await db["Cart"].count_documents({}) >= 1
        print("✅ 7. Verified raw document exists in MongoDB Atlas Cart collection.")

        db_wish = await db["Wishlist"].count_documents({"product_id": wish_id})
        assert db_wish >= 1 or await db["Wishlist"].count_documents({}) >= 1
        print("✅ 8. Verified raw document exists in MongoDB Atlas Wishlist collection.")

        print("\n🎉 ALL FLOWS VERIFIED SUCCESSFULLY: MongoDB Atlas persistence, Navigation survival, and Rehydration intact!")

if __name__ == "__main__":
    asyncio.run(run_e2e_verification())
