"""
Category Image Cloudinary Migration Script for CloudCrackers
Safely uploads high-resolution category images to Cloudinary (cloudcrackers/categories)
and updates the Categories collection in MongoDB with Cloudinary HTTPS URLs.
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

# Mapping of Category Name / ID to local asset filename
CATEGORY_ASSET_MAP = {
    "Sparklers": "electric_sparklers.png",
    "Flower Pots": "flower_pot_fireworks.png",
    "Ground Chakkars": "ground_chakkars_spinners.png",
    "Rockets": "rockets_fireworks.png",
    "Atom Bombs": "atom_bomb_cracker.png",
    "Bijili Crackers": "atom_bomb_cracker.png",
    "Fancy Aerials": "30_shots_multi_shot_fireworks.png",
    "Sound Crackers": "atom_bomb_cracker.png",
    "Kids Crackers": "pencil_crackers_roman_candles.png",
    "Gift Boxes": "grand_festival_gift_box.png",
}

DEFAULT_ASSET = "30_shots_multi_shot_fireworks.png"


async def migrate_categories():
    print("=" * 70)
    print("🚀 CloudCrackers Category Image Migration to Cloudinary")
    print("=" * 70)
    print(f"MongoDB URI : {settings.MONGODB_URI or settings.MONGODB_URL}")
    print(f"Database    : {settings.DB_NAME}")
    print(f"Cloud Name  : {settings.CLOUDINARY_CLOUD_NAME or '(Mock Fallback Mode)'}")
    print(f"Assets Dir  : {FRONTEND_ASSETS_DIR}")
    print("-" * 70)

    db_url = settings.MONGODB_URI if settings.MONGODB_URI else settings.MONGODB_URL
    client = AsyncIOMotorClient(db_url)
    db = client[settings.DB_NAME]
    cols = await db.list_collection_names()
    col_name = "Categories" if "Categories" in cols else "categories"
    cat_col = db[col_name]

    categories = await cat_col.find({}).to_list(length=100)
    print(f"Found {len(categories)} categories in database.")

    migrated_count = 0
    skipped_count = 0
    failed_count = 0

    for cat in categories:
        cat_id = cat["_id"]
        cat_name = cat.get("name") or "Unnamed Category"
        current_img_url = cat.get("image_url") or cat.get("imageUrl") or ""

        # Check if already a real Cloudinary URL
        if current_img_url and current_img_url.startswith("https://res.cloudinary.com") and "/mock/" not in current_img_url:
            print(f"⏩ [SKIP] '{cat_name}' already has Cloudinary URL: {current_img_url}")
            skipped_count += 1
            continue

        asset_filename = CATEGORY_ASSET_MAP.get(cat_name, DEFAULT_ASSET)
        asset_path = os.path.join(FRONTEND_ASSETS_DIR, asset_filename)

        if not os.path.exists(asset_path):
            print(f"⚠️ [WARN] Asset not found for '{cat_name}': {asset_path}")
            failed_count += 1
            continue

        try:
            with open(asset_path, "rb") as f:
                file_bytes = f.read()

            print(f"Uploading image for category '{cat_name}' ({asset_filename})...")
            upload_result = await cloud_core.upload_image(
                file_bytes,
                folder="cloudcrackers/categories",
            )
            secure_url = upload_result.get("secure_url") or upload_result.get("url")

            if not secure_url:
                raise ValueError("No secure_url returned by Cloudinary uploader.")

            # Update MongoDB record with Cloudinary URL
            await cat_col.update_one(
                {"_id": cat_id},
                {
                    "$set": {
                        "image_url": secure_url,
                        "imageUrl": secure_url,
                        "updated_at": datetime.now(timezone.utc),
                    }
                },
            )

            print(f"✅ [MIGRATED] '{cat_name}' -> {secure_url}")
            migrated_count += 1
        except Exception as err:
            print(f"❌ [ERROR] Failed to migrate category '{cat_name}': {err}")
            failed_count += 1

    print("-" * 70)
    print("Category Migration Summary:")
    print(f"  • Total Categories Inspected : {len(categories)}")
    print(f"  • Successfully Migrated     : {migrated_count}")
    print(f"  • Already On Cloudinary     : {skipped_count}")
    print(f"  • Failed/Missing Assets     : {failed_count}")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(migrate_categories())
