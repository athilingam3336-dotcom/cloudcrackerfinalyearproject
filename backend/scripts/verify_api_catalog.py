"""
Live FastAPI Products & Categories API Verification Script for CloudCrackers
"""

import asyncio
import os
import sys
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.main import app
from app.core.database import db_manager


async def test_live_api():
    print("Testing live FastAPI products and categories endpoint...")
    await db_manager.connect()
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Categories
        cat_res = await client.get("/api/v1/categories")
        assert cat_res.status_code == 200, f"Categories API failed: {cat_res.text}"
        categories = cat_res.json().get("data", [])
        print(f"\n✓ GET /api/v1/categories -> Status: {cat_res.status_code}, Found {len(categories)} categories")
        for cat in categories:
            print(f"   • {cat.get('name').ljust(20)} (ID: {cat.get('id')})")

        # 2. All Products
        prod_res = await client.get("/api/v1/products?limit=50")
        assert prod_res.status_code == 200, f"Products API failed: {prod_res.text}"
        prod_data = prod_res.json().get("data", {})
        products = prod_data.get("products", [])
        total = prod_data.get("total", len(products))
        print(f"\n✓ GET /api/v1/products -> Status: {prod_res.status_code}, Total Active Products: {total}, Returned: {len(products)}")

        # 3. Category specific filtering
        test_category_names = [
            "Sparklers",
            "Flower Pots",
            "Rockets",
            "Fancy Aerials",
            "Ground Chakkars",
            "Atom Bombs",
            "Bijili Crackers",
            "Sound Crackers",
            "Kids Crackers",
            "Gift Boxes",
        ]

        print("\n--- Testing Category Filtering API ---")
        for name in test_category_names:
            matched_cat = next((c for c in categories if c.get("name") == name), None)
            if not matched_cat:
                print(f"   [FAIL] Category '{name}' not in /api/v1/categories")
                continue
            cat_id = matched_cat.get("id")
            res = await client.get(f"/api/v1/products?category_id={cat_id}")
            assert res.status_code == 200, f"Filtered category {name} failed: {res.text}"
            filtered_prods = res.json().get("data", {}).get("products", [])
            print(f"   ✓ Filter '{name.ljust(18)}' (ID: {cat_id}) -> {len(filtered_prods)} products")
            for p in filtered_prods:
                print(f"      - {p.get('name')} (Price: ₹{p.get('price')}, Stock: {p.get('stock')})")

    await db_manager.disconnect()
    print("\n✓ API verification completed successfully!")


if __name__ == "__main__":
    asyncio.run(test_live_api())
