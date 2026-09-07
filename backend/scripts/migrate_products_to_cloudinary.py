"""
Product Image Cloudinary Migration Script for CloudCrackers
Safely migrates all existing MongoDB products with local asset references or placeholder URLs to Cloudinary.
"""

import asyncio
import os
import sys
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.config import settings
from app.core import cloudinary as cloud_core

# Base project path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FRONTEND_ASSETS_DIR = os.path.join(PROJECT_ROOT, "frontend", "assets", "products")

# Mapping of product keywords/names to local photography assets
LOCAL_ASSET_MAP = {
    "sparkler": "electric_sparklers.png",
    "flower pot": "flower_pot_fireworks.png",
    "fountain": "flower_pot_fireworks.png",
    "aanar": "flower_pot_fireworks.png",
    "chakkar": "ground_chakkars_spinners.png",
    "spinner": "ground_chakkars_spinners.png",
    "rocket": "rockets_fireworks.png",
    "bomb": "atom_bomb_cracker.png",
    "shell": "atom_bomb_cracker.png",
    "sound": "atom_bomb_cracker.png",
    "shot": "30_shots_multi_shot_fireworks.png",
    "barrage": "30_shots_multi_shot_fireworks.png",
    "cake": "30_shots_multi_shot_fireworks.png",
    "gift": "grand_festival_gift_box.png",
    "box": "grand_festival_gift_box.png",
    "candle": "pencil_crackers_roman_candles.png",
    "pencil": "pencil_crackers_roman_candles.png",
}

DEFAULT_ASSET = "30_shots_multi_shot_fireworks.png"


def find_local_image_for_product(product: dict) -> str:
    """Finds the best local high-resolution asset path for a product."""
    images = product.get("images", [])
    if images and isinstance(images[0], str):
        img_name = os.path.basename(images[0])
        asset_path = os.path.join(FRONTEND_ASSETS_DIR, img_name)
        if os.path.exists(asset_path):
            return asset_path

    img_url = product.get("image_url", "")
    if img_url and isinstance(img_url, str):
        img_name = os.path.basename(img_url)
        asset_path = os.path.join(FRONTEND_ASSETS_DIR, img_name)
        if os.path.exists(asset_path):
            return asset_path

    # Keyword matching
    name = (product.get("name") or product.get("title") or "").lower()
    desc = (product.get("description") or "").lower()
    full_text = f"{name} {desc}"

    for kw, asset_file in LOCAL_ASSET_MAP.items():
        if kw in full_text:
            asset_path = os.path.join(FRONTEND_ASSETS_DIR, asset_file)
            if os.path.exists(asset_path):
                return asset_path

    return os.path.join(FRONTEND_ASSETS_DIR, DEFAULT_ASSET)


async def migrate_products():
    print("=" * 70)
    print("🚀 CloudCrackers Product Image Migration to Cloudinary")
    print("=" * 70)
    print(f"MongoDB URL : {settings.MONGODB_URL}")
    print(f"Database    : {settings.DB_NAME}")
    print(f"Cloud Name  : {settings.CLOUDINARY_CLOUD_NAME or '(Mock Fallback Mode)'}")
    print(f"Assets Dir  : {FRONTEND_ASSETS_DIR}")
    print("-" * 70)

    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DB_NAME]
    cols = await db.list_collection_names()
    col_name = "Products" if "Products" in cols else "products"
    products_col = db[col_name]

    cursor = products_col.find({})
    products = await cursor.to_list(length=1000)

    print(f"Found {len(products)} products in database.")
    migrated_count = 0
    skipped_count = 0
    failed_count = 0

    for prod in products:
        prod_id = prod["_id"]
        prod_name = prod.get("name") or prod.get("title") or "Unnamed Product"
        current_img_url = prod.get("image_url") or (prod.get("images", [None])[0] if prod.get("images") else None)

        # Check if already a real Cloudinary URL
        if current_img_url and current_img_url.startswith("https://res.cloudinary.com") and "/mock/" not in current_img_url:
            print(f"⏩ [SKIP] '{prod_name}' already has Cloudinary URL: {current_img_url}")
            skipped_count += 1
            continue

        asset_path = find_local_image_for_product(prod)
        if not os.path.exists(asset_path):
            print(f"⚠️ [WARN] Asset not found for '{prod_name}': {asset_path}")
            failed_count += 1
            continue

        try:
            with open(asset_path, "rb") as f:
                file_bytes = f.read()

            upload_result = await cloud_core.upload_image(
                file_bytes,
                folder="cloudcrackers/products",
            )
            secure_url = upload_result.get("secure_url") or upload_result.get("url")

            if not secure_url:
                raise ValueError("No secure_url returned by Cloudinary uploader.")

            # Update MongoDB record with Cloudinary URL
            await products_col.update_one(
                {"_id": prod_id},
                {
                    "$set": {
                        "image_url": secure_url,
                        "images": [secure_url],
                        "updated_at": datetime.now(timezone.utc),
                    }
                },
            )

            print(f"✅ [MIGRATED] '{prod_name}' -> {secure_url}")
            migrated_count += 1
        except Exception as err:
            print(f"❌ [ERROR] Failed to migrate '{prod_name}': {err}")
            failed_count += 1

    print("-" * 70)
    print(f"Migration Summary:")
    print(f"  • Total Products Inspected : {len(products)}")
    print(f"  • Successfully Migrated   : {migrated_count}")
    print(f"  • Already On Cloudinary   : {skipped_count}")
    print(f"  • Failed/Missing Assets   : {failed_count}")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(migrate_products())
