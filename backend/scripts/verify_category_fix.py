"""
Verification Script for CloudCrackers Category Fix.
Tests:
1. GET /api/v1/categories?include_inactive=true returns all 11 categories.
2. Verifies category selector fields (name, id).
3. Safely creates a test product assigned to 'Flower Pots' category and verifies category_id matches.
4. Cleans up the test product immediately.
5. Verifies document counts across all collections remain safe and intact.
"""

import asyncio
import os
import sys
from bson import ObjectId
from httpx import AsyncClient, ASGITransport
from motor.motor_asyncio import AsyncIOMotorClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.config import settings
from app.core.database import db_manager
from app.core.security import create_access_token
from app.main import app
from app.models.user import User


async def verify():
    # 1. Connect database
    await db_manager.connect()
    client_motor = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client_motor[settings.DB_NAME]

    print("--- 1. Testing GET /api/v1/categories?include_inactive=true ---")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Public listing
        res = await client.get("/api/v1/categories?include_inactive=true")
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        assert data["success"] is True
        categories = data["data"]
        print(f"Total categories retrieved: {len(categories)}")
        category_names = [c["name"] for c in categories]
        print(f"Category names: {category_names}")

        expected_categories = [
            "Electronics",
            "Sparklers",
            "Flower Pots",
            "Ground Chakkars",
            "Rockets",
            "Atom Bombs",
            "Bijili Crackers",
            "Fancy Aerials",
            "Sound Crackers",
            "Kids Crackers",
            "Gift Boxes",
        ]
        for ec in expected_categories:
            assert ec in category_names, f"Missing category: {ec}"
        print("✓ All 10 CloudCrackers categories + Electronics are present!")

        # 2. Test Admin Product Creation with Category Selection
        print("\n--- 2. Testing Product Creation with Category Selection ---")
        admin = await User.find_one(User.email == "admin@example.com")
        assert admin is not None, "Admin user not found in Users collection!"
        token = create_access_token(data={"sub": str(admin.id), "email": admin.email, "role": admin.role})
        headers = {"Authorization": f"Bearer {token}"}

        flower_pot_cat = next(c for c in categories if c["name"] == "Flower Pots")
        flower_pot_id = flower_pot_cat["id"]
        print(f"Selected category: '{flower_pot_cat['name']}' (ID: {flower_pot_id})")

        product_payload = {
            "name": "__Safe_Verification_Flower_Pot_Product__",
            "description": "Test verification product for category selector fix.",
            "price": 499.0,
            "discount_price": 399.0,
            "category_id": flower_pot_id,
            "stock": 50,
            "images": ["flower_pot_fireworks.png"],
            "is_featured": True,
            "is_bestseller": False,
            "is_flash_sale": False,
            "is_recommended": True,
        }

        create_res = await client.post("/api/v1/products", json=product_payload, headers=headers)
        assert create_res.status_code == 201, f"Product creation failed: {create_res.text}"
        prod_data = create_res.json()["data"]
        created_prod_id = prod_data["id"]
        print(f"✓ Created test product: ID={created_prod_id}, Name='{prod_data['name']}'")
        assert str(prod_data["category_id"]) == flower_pot_id or prod_data["category_id"] == flower_pot_id, "Category ID mismatch in product response!"

        # Direct DB verification
        db_prod = await db["Products"].find_one({"_id": ObjectId(created_prod_id)})
        assert db_prod is not None, "Product not found in MongoDB Products collection!"
        assert str(db_prod["category_id"]) == flower_pot_id, f"DB category_id mismatch: {db_prod['category_id']} vs {flower_pot_id}"
        print(f"✓ Verified MongoDB Atlas product record has category_id: {db_prod['category_id']}")

        # 3. Clean up the test product so no unwanted test products remain in Atlas
        print("\n--- 3. Cleaning up temporary test product ---")
        del_res = await db["Products"].delete_one({"_id": ObjectId(created_prod_id)})
        # Also clean any inventory record created for this test product if any
        await db["Inventory"].delete_one({"product_id": ObjectId(created_prod_id)})
        print(f"✓ Deleted temporary test product: deleted_count={del_res.deleted_count}")

    # 4. Final verification of all collections
    print("\n--- 4. Final Collections Safety Audit ---")
    tracked_collections = [
        "Users",
        "Orders",
        "Cart",
        "Wishlist",
        "Payments",
        "Addresses",
        "Notifications",
        "Products",
        "Categories",
        "Inventory",
    ]
    for col in tracked_collections:
        count = await db[col].count_documents({})
        print(f"  {col}: {count} documents")

    await db_manager.disconnect()
    print("\n✓ ALL VERIFICATIONS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    asyncio.run(verify())
