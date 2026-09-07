"""
Safe Idempotent Category Upsert Script for CloudCrackers.
Upserts the 10 Sivakasi fireworks categories into MongoDB Atlas without deleting or modifying any existing collections, users, orders, cart, wishlist, payments, or the existing 'Electronics' category.
"""

import asyncio
import os
import sys
from datetime import datetime, timezone
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.config import settings

REAL_CATEGORIES = [
    {
        "_id": ObjectId("660000000000000000000001"),
        "name": "Sparklers",
        "description": "Safe, dazzling hand-held wire sparklers in gold, silver, and vibrant rainbow colors for weddings, parties, and Diwali celebrations.",
        "image_url": "electric_sparklers.png",
        "is_active": True,
        "status": "active",
    },
    {
        "_id": ObjectId("660000000000000000000002"),
        "name": "Flower Pots",
        "description": "Ground fountains that erupt into towering columns of golden glitter, multi-color flame bursts, and whistling silver showers.",
        "image_url": "flower_pot_fireworks.png",
        "is_active": True,
        "status": "active",
    },
    {
        "_id": ObjectId("660000000000000000000003"),
        "name": "Ground Chakkars",
        "description": "High-velocity whirling ground spinners and circular chakri wheels producing radiant golden rings and green fire circles.",
        "image_url": "ground_chakkars_spinners.png",
        "is_active": True,
        "status": "active",
    },
    {
        "_id": ObjectId("660000000000000000000004"),
        "name": "Rockets",
        "description": "Aerodynamic altitude rockets designed for extreme skyward flight, roaring acoustic ascent, and brilliant parachute or color bursts.",
        "image_url": "rockets_fireworks.png",
        "is_active": True,
        "status": "active",
    },
    {
        "_id": ObjectId("660000000000000000000005"),
        "name": "Atom Bombs",
        "description": "Authentic heavy sound crackers tightly bound with reinforced jute cord, delivering thunderous acoustic bass concussions.",
        "image_url": "atom_bomb_cracker.png",
        "is_active": True,
        "status": "active",
    },
    {
        "_id": ObjectId("660000000000000000000006"),
        "name": "Bijili Crackers",
        "description": "Traditional micro-crackers woven into vibrant red strips and strings, delivering rhythmic crackling sound bursts.",
        "image_url": "atom_bomb_cracker.png",
        "is_active": True,
        "status": "active",
    },
    {
        "_id": ObjectId("660000000000000000000007"),
        "name": "Fancy Aerials",
        "description": "Multi-tube aerial display cakes and synchronized sky barrages firing sequential color peonies, willows, and strobes.",
        "image_url": "30_shots_multi_shot_fireworks.png",
        "is_active": True,
        "status": "active",
    },
    {
        "_id": ObjectId("660000000000000000000008"),
        "name": "Sound Crackers",
        "description": "High-decibel single and multi-shot salute sound crackers engineered for maximum audible impact during celebrations.",
        "image_url": "atom_bomb_cracker.png",
        "is_active": True,
        "status": "active",
    },
    {
        "_id": ObjectId("660000000000000000000009"),
        "name": "Kids Crackers",
        "description": "Child-friendly, low-smoke novelty fireworks including twinkling star pencils, serpent eggs, and colorful spark novelties.",
        "image_url": "pencil_crackers_roman_candles.png",
        "is_active": True,
        "status": "active",
    },
    {
        "_id": ObjectId("660000000000000000000010"),
        "name": "Gift Boxes",
        "description": "Curated all-in-one celebration hampers and family assortment gift packs containing a balanced selection of all fireworks.",
        "image_url": "grand_festival_gift_box.png",
        "is_active": True,
        "status": "active",
    },
]


async def safe_upsert():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DB_NAME]

    print("--- 1. Verification Before Upsert ---")
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
    counts_before = {}
    for col in tracked_collections:
        counts_before[col] = await db[col].count_documents({})
        print(f"  {col}: {counts_before[col]} documents")

    cats_before = await db["Categories"].find({}).to_list(100)
    print(f"\nTotal categories before: {len(cats_before)}")
    for c in cats_before:
        print(f"  Existing Category: _id={c['_id']}, name='{c['name']}'")

    print("\n--- 2. Performing Idempotent Category Upserts ---")
    now = datetime.now(timezone.utc)
    added_names = []
    updated_names = []

    for cat in REAL_CATEGORIES:
        query = {"name": cat["name"]}
        existing = await db["Categories"].find_one(query)
        if existing:
            update_doc = {
                "$set": {
                    "description": cat["description"],
                    "image_url": cat["image_url"],
                    "is_active": True,
                    "status": "active",
                    "updated_at": now,
                    "updated_by": "system_admin",
                }
            }
            await db["Categories"].update_one(query, update_doc)
            updated_names.append(cat["name"])
            print(f"  [UPDATED] Category: {cat['name']} (ID: {existing['_id']})")
        else:
            insert_doc = {
                "_id": cat["_id"],
                "name": cat["name"],
                "description": cat["description"],
                "image_url": cat["image_url"],
                "is_active": True,
                "status": "active",
                "created_at": now,
                "updated_at": now,
                "created_by": "system_admin",
                "updated_by": "system_admin",
            }
            await db["Categories"].insert_one(insert_doc)
            added_names.append(cat["name"])
            print(f"  [INSERTED] Category: {cat['name']} (ID: {cat['_id']})")

    print("\n--- 3. Verification After Upsert ---")
    counts_after = {}
    for col in tracked_collections:
        counts_after[col] = await db[col].count_documents({})
        status = "UNCHANGED" if counts_after[col] == counts_before[col] else f"CHANGED ({counts_before[col]} -> {counts_after[col]})"
        print(f"  {col}: {counts_after[col]} documents [{status}]")

    cats_after = await db["Categories"].find({}).to_list(100)
    print(f"\nTotal categories after: {len(cats_after)}")
    for c in cats_after:
        print(f"  Category: _id={c['_id']}, name='{c['name']}', status='{c.get('status')}', is_active={c.get('is_active')}")

    print("\n==========================================")
    print("UPSERT REPORT:")
    print(f"Categories Before: {len(cats_before)} ({[c['name'] for c in cats_before]})")
    print(f"Categories Added:  {len(added_names)} ({added_names})")
    print(f"Categories Updated: {len(updated_names)} ({updated_names})")
    print(f"Categories After:  {len(cats_after)} ({[c['name'] for c in cats_after]})")
    print("==========================================")


if __name__ == "__main__":
    asyncio.run(safe_upsert())
