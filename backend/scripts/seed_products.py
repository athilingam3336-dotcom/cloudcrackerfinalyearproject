"""
CloudCrackers — Safe Sivakasi Product Catalog & Categories Seed Script
Seeds the 10 core Sivakasi pyrotechnic categories, realistic cracker products,
and corresponding inventory records into MongoDB safely and idempotently.

Safe execution:
- Connects using settings.MONGODB_URL and settings.DB_NAME.
- Does NOT delete users, orders, carts, addresses, or audit logs.
- Safe to execute multiple times (idempotent upserts).
"""

import asyncio
import os
import sys
from datetime import datetime, timezone
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.config import settings

# 10 Core Sivakasi Categories with deterministic ObjectIds
CATEGORIES = [
    {
        "_id": ObjectId("660000000000000000000001"),
        "name": "Sparklers",
        "description": "Safe, dazzling hand-held wire sparklers in gold, silver, and vibrant rainbow colors for weddings, parties, and Diwali celebrations.",
        "image_url": "electric_sparklers.png",
        "is_active": True,
        "status": "active"
    },
    {
        "_id": ObjectId("660000000000000000000002"),
        "name": "Flower Pots",
        "description": "Ground fountains that erupt into towering columns of golden glitter, multi-color flame bursts, and whistling silver showers.",
        "image_url": "flower_pot_fireworks.png",
        "is_active": True,
        "status": "active"
    },
    {
        "_id": ObjectId("660000000000000000000003"),
        "name": "Ground Chakkars",
        "description": "High-velocity whirling ground spinners and circular chakri wheels producing radiant golden rings and green fire circles.",
        "image_url": "ground_chakkars_spinners.png",
        "is_active": True,
        "status": "active"
    },
    {
        "_id": ObjectId("660000000000000000000004"),
        "name": "Rockets",
        "description": "Aerodynamic altitude rockets designed for extreme skyward flight, roaring acoustic ascent, and brilliant parachute or color bursts.",
        "image_url": "rockets_fireworks.png",
        "is_active": True,
        "status": "active"
    },
    {
        "_id": ObjectId("660000000000000000000005"),
        "name": "Atom Bombs",
        "description": "Authentic heavy sound crackers tightly bound with reinforced jute cord, delivering thunderous acoustic bass concussions.",
        "image_url": "atom_bomb_cracker.png",
        "is_active": True,
        "status": "active"
    },
    {
        "_id": ObjectId("660000000000000000000006"),
        "name": "Bijili Crackers",
        "description": "Traditional micro-crackers woven into vibrant red strips and strings, delivering rhythmic crackling sound bursts.",
        "image_url": "atom_bomb_cracker.png",
        "is_active": True,
        "status": "active"
    },
    {
        "_id": ObjectId("660000000000000000000007"),
        "name": "Fancy Aerials",
        "description": "Multi-tube aerial display cakes and synchronized sky barrages firing sequential color peonies, willows, and strobes.",
        "image_url": "30_shots_multi_shot_fireworks.png",
        "is_active": True,
        "status": "active"
    },
    {
        "_id": ObjectId("660000000000000000000008"),
        "name": "Sound Crackers",
        "description": "High-decibel single and multi-shot salute sound crackers engineered for maximum audible impact during celebrations.",
        "image_url": "atom_bomb_cracker.png",
        "is_active": True,
        "status": "active"
    },
    {
        "_id": ObjectId("660000000000000000000009"),
        "name": "Kids Crackers",
        "description": "Child-friendly, low-smoke novelty fireworks including twinkling star pencils, serpent eggs, and colorful spark novelties.",
        "image_url": "pencil_crackers_roman_candles.png",
        "is_active": True,
        "status": "active"
    },
    {
        "_id": ObjectId("660000000000000000000010"),
        "name": "Gift Boxes",
        "description": "Curated all-in-one celebration hampers and family assortment gift packs containing a balanced selection of all fireworks.",
        "image_url": "grand_festival_gift_box.png",
        "is_active": True,
        "status": "active"
    }
]

# Realistic Sivakasi Products with proper Indian Rupee pricing
PRODUCTS = [
    # 1. Sparklers
    {
        "_id": ObjectId("660000000000000000000101"),
        "name": "Electric Sparkler (10 Pcs)",
        "description": "Classic 10cm electric wire sparklers producing bright golden crackling sparks. Safe for all festive celebrations.",
        "price": 90.0,
        "discount_price": None,
        "category_id": ObjectId("660000000000000000000001"),
        "stock": 150,
        "images": ["electric_sparklers.png"],
        "rating": 4.8,
        "reviews_count": 86,
        "average_rating": 4.8,
        "total_reviews": 86,
        "rating_breakdown": {"5": 72, "4": 12, "3": 2, "2": 0, "1": 0},
        "is_featured": False,
        "is_bestseller": True,
        "is_flash_sale": False,
        "is_recommended": True,
        "is_active": True,
        "status": "active"
    },
    {
        "_id": ObjectId("660000000000000000000102"),
        "name": "Color Sparkler (10 Pcs)",
        "description": "Multi-colored hand-held sparklers that burn with vibrant crimson, emerald green, and golden stars.",
        "price": 120.0,
        "discount_price": 99.0,
        "category_id": ObjectId("660000000000000000000001"),
        "stock": 120,
        "images": ["electric_sparklers.png"],
        "rating": 4.7,
        "reviews_count": 54,
        "average_rating": 4.7,
        "total_reviews": 54,
        "rating_breakdown": {"5": 42, "4": 10, "3": 2, "2": 0, "1": 0},
        "is_featured": False,
        "is_bestseller": False,
        "is_flash_sale": True,
        "is_recommended": True,
        "is_active": True,
        "status": "active"
    },
    {
        "_id": ObjectId("660000000000000000000103"),
        "name": "Gold Sparkler Deluxe (50 Pcs)",
        "description": "Extra long 30cm wedding grade golden sparklers with extended 120-second burn duration.",
        "price": 250.0,
        "discount_price": None,
        "category_id": ObjectId("660000000000000000000001"),
        "stock": 100,
        "images": ["electric_sparklers.png"],
        "rating": 4.9,
        "reviews_count": 120,
        "average_rating": 4.9,
        "total_reviews": 120,
        "rating_breakdown": {"5": 110, "4": 10, "3": 0, "2": 0, "1": 0},
        "is_featured": True,
        "is_bestseller": True,
        "is_flash_sale": False,
        "is_recommended": True,
        "is_active": True,
        "status": "active"
    },

    # 2. Flower Pots
    {
        "_id": ObjectId("660000000000000000000104"),
        "name": "Flower Pot Small (10 Pcs)",
        "description": "Traditional cone flower pots generating a dense 6-foot shower of bright golden and silver sparks.",
        "price": 140.0,
        "discount_price": 120.0,
        "category_id": ObjectId("660000000000000000000002"),
        "stock": 90,
        "images": ["flower_pot_fireworks.png"],
        "rating": 4.7,
        "reviews_count": 68,
        "average_rating": 4.7,
        "total_reviews": 68,
        "rating_breakdown": {"5": 52, "4": 14, "3": 2, "2": 0, "1": 0},
        "is_featured": False,
        "is_bestseller": False,
        "is_flash_sale": False,
        "is_recommended": False,
        "is_active": True,
        "status": "active"
    },
    {
        "_id": ObjectId("660000000000000000000105"),
        "name": "Flower Pot Big (5 Pcs)",
        "description": "Giant jumbo flower pots creating a high-rise 15-foot fountain of cascading multi-stage sparkles.",
        "price": 320.0,
        "discount_price": None,
        "category_id": ObjectId("660000000000000000000002"),
        "stock": 75,
        "images": ["flower_pot_fireworks.png"],
        "rating": 4.9,
        "reviews_count": 92,
        "average_rating": 4.9,
        "total_reviews": 92,
        "rating_breakdown": {"5": 82, "4": 10, "3": 0, "2": 0, "1": 0},
        "is_featured": True,
        "is_bestseller": True,
        "is_flash_sale": False,
        "is_recommended": True,
        "is_active": True,
        "status": "active"
    },

    # 3. Ground Chakkars
    {
        "_id": ObjectId("660000000000000000000106"),
        "name": "Ground Chakkar (10 Pcs)",
        "description": "Smooth spinning ground wheel producing high-speed rotating circles of brilliant yellow-gold glitter.",
        "price": 110.0,
        "discount_price": None,
        "category_id": ObjectId("660000000000000000000003"),
        "stock": 120,
        "images": ["ground_chakkars_spinners.png"],
        "rating": 4.8,
        "reviews_count": 78,
        "average_rating": 4.8,
        "total_reviews": 78,
        "rating_breakdown": {"5": 65, "4": 11, "3": 2, "2": 0, "1": 0},
        "is_featured": False,
        "is_bestseller": True,
        "is_flash_sale": False,
        "is_recommended": True,
        "is_active": True,
        "status": "active"
    },
    {
        "_id": ObjectId("660000000000000000000107"),
        "name": "Spinner Chakkar Deluxe (10 Pcs)",
        "description": "High-velocity deluxe spinning wheels generating wide radiant spark perimeters and crackling sounds.",
        "price": 220.0,
        "discount_price": 180.0,
        "category_id": ObjectId("660000000000000000000003"),
        "stock": 80,
        "images": ["ground_chakkars_spinners.png"],
        "rating": 4.9,
        "reviews_count": 95,
        "average_rating": 4.9,
        "total_reviews": 95,
        "rating_breakdown": {"5": 85, "4": 10, "3": 0, "2": 0, "1": 0},
        "is_featured": True,
        "is_bestseller": False,
        "is_flash_sale": False,
        "is_recommended": True,
        "is_active": True,
        "status": "active"
    },

    # 4. Rockets
    {
        "_id": ObjectId("660000000000000000000108"),
        "name": "Rocket Classic (10 Pcs)",
        "description": "Standard altitude sky rockets launching with screaming velocity and bursting into a golden glitter canopy.",
        "price": 250.0,
        "discount_price": None,
        "category_id": ObjectId("660000000000000000000004"),
        "stock": 60,
        "images": ["rockets_fireworks.png"],
        "rating": 4.7,
        "reviews_count": 64,
        "average_rating": 4.7,
        "total_reviews": 64,
        "rating_breakdown": {"5": 50, "4": 12, "3": 2, "2": 0, "1": 0},
        "is_featured": False,
        "is_bestseller": False,
        "is_flash_sale": False,
        "is_recommended": True,
        "is_active": True,
        "status": "active"
    },
    {
        "_id": ObjectId("660000000000000000000109"),
        "name": "Whistling Rocket (10 Pcs)",
        "description": "High-altitude whistling rockets emitting an acoustic siren ascent followed by a thunderous aerial burst.",
        "price": 380.0,
        "discount_price": 320.0,
        "category_id": ObjectId("660000000000000000000004"),
        "stock": 50,
        "images": ["rockets_fireworks.png"],
        "rating": 4.9,
        "reviews_count": 112,
        "average_rating": 4.9,
        "total_reviews": 112,
        "rating_breakdown": {"5": 102, "4": 10, "3": 0, "2": 0, "1": 0},
        "is_featured": True,
        "is_bestseller": True,
        "is_flash_sale": True,
        "is_recommended": True,
        "is_active": True,
        "status": "active"
    },

    # 5. Atom Bombs
    {
        "_id": ObjectId("660000000000000000000110"),
        "name": "Atom Bomb (10 Pcs)",
        "description": "Authentic Sivakasi loud sound cracker tightly bound with green jute cord delivering powerful bass concussion.",
        "price": 299.0,
        "discount_price": 249.0,
        "category_id": ObjectId("660000000000000000000005"),
        "stock": 100,
        "images": ["atom_bomb_cracker.png"],
        "rating": 4.9,
        "reviews_count": 145,
        "average_rating": 4.9,
        "total_reviews": 145,
        "rating_breakdown": {"5": 135, "4": 10, "3": 0, "2": 0, "1": 0},
        "is_featured": True,
        "is_bestseller": True,
        "is_flash_sale": False,
        "is_recommended": True,
        "is_active": True,
        "status": "active"
    },

    # 6. Bijili Crackers
    {
        "_id": ObjectId("660000000000000000000111"),
        "name": "Bijili (100 Pcs String)",
        "description": "Traditional red paper bijili crackers bound into a rapid continuous strip for rhythmic festive crackles.",
        "price": 70.0,
        "discount_price": None,
        "category_id": ObjectId("660000000000000000000006"),
        "stock": 150,
        "images": ["atom_bomb_cracker.png"],
        "rating": 4.8,
        "reviews_count": 88,
        "average_rating": 4.8,
        "total_reviews": 88,
        "rating_breakdown": {"5": 75, "4": 11, "3": 2, "2": 0, "1": 0},
        "is_featured": False,
        "is_bestseller": True,
        "is_flash_sale": False,
        "is_recommended": False,
        "is_active": True,
        "status": "active"
    },

    # 7. Fancy Aerials
    {
        "_id": ObjectId("660000000000000000000112"),
        "name": "Fancy Aerial Shot (Single)",
        "description": "Single-tube heavy display shell shooting 150 feet high and breaking into a multi-color spherical chrysanthemum.",
        "price": 650.0,
        "discount_price": 550.0,
        "category_id": ObjectId("660000000000000000000007"),
        "stock": 35,
        "images": ["30_shots_multi_shot_fireworks.png"],
        "rating": 4.8,
        "reviews_count": 58,
        "average_rating": 4.8,
        "total_reviews": 58,
        "rating_breakdown": {"5": 48, "4": 8, "3": 2, "2": 0, "1": 0},
        "is_featured": False,
        "is_bestseller": False,
        "is_flash_sale": False,
        "is_recommended": True,
        "is_active": True,
        "status": "active"
    },
    {
        "_id": ObjectId("660000000000000000000113"),
        "name": "7 Shot Repeater",
        "description": "7 sequential aerial shots ejecting color star balls with whistling tails and glittering breaks.",
        "price": 350.0,
        "discount_price": None,
        "category_id": ObjectId("660000000000000000000007"),
        "stock": 45,
        "images": ["30_shots_multi_shot_fireworks.png"],
        "rating": 4.7,
        "reviews_count": 42,
        "average_rating": 4.7,
        "total_reviews": 42,
        "rating_breakdown": {"5": 32, "4": 8, "3": 2, "2": 0, "1": 0},
        "is_featured": False,
        "is_bestseller": False,
        "is_flash_sale": False,
        "is_recommended": False,
        "is_active": True,
        "status": "active"
    },
    {
        "_id": ObjectId("660000000000000000000114"),
        "name": "30 Shot Sky Barrage",
        "description": "30-shot rapid fire aerial cake display with gold brocade willows, color peony stars, and crackling finale.",
        "price": 1499.0,
        "discount_price": 1299.0,
        "category_id": ObjectId("660000000000000000000007"),
        "stock": 30,
        "images": ["30_shots_multi_shot_fireworks.png"],
        "rating": 5.0,
        "reviews_count": 210,
        "average_rating": 5.0,
        "total_reviews": 210,
        "rating_breakdown": {"5": 205, "4": 5, "3": 0, "2": 0, "1": 0},
        "is_featured": True,
        "is_bestseller": True,
        "is_flash_sale": False,
        "is_recommended": True,
        "is_active": True,
        "status": "active"
    },
    {
        "_id": ObjectId("660000000000000000000115"),
        "name": "60 Shot Grand Finale Cake",
        "description": "Large-scale 60-shot celebration cake engineered for grand weddings and festival celebrations with synchronized sky choreography.",
        "price": 2750.0,
        "discount_price": 2400.0,
        "category_id": ObjectId("660000000000000000000007"),
        "stock": 25,
        "images": ["30_shots_multi_shot_fireworks.png"],
        "rating": 5.0,
        "reviews_count": 185,
        "average_rating": 5.0,
        "total_reviews": 185,
        "rating_breakdown": {"5": 185, "4": 0, "3": 0, "2": 0, "1": 0},
        "is_featured": True,
        "is_bestseller": False,
        "is_flash_sale": False,
        "is_recommended": True,
        "is_active": True,
        "status": "active"
    },

    # 8. Sound Crackers
    {
        "_id": ObjectId("660000000000000000000116"),
        "name": "Thunder Sound Crackers (10 Pcs)",
        "description": "Intense audible sound crackers with crisp sharp crackle and zero flying debris for safe enjoyment.",
        "price": 220.0,
        "discount_price": 180.0,
        "category_id": ObjectId("660000000000000000000008"),
        "stock": 80,
        "images": ["atom_bomb_cracker.png"],
        "rating": 4.8,
        "reviews_count": 65,
        "average_rating": 4.8,
        "total_reviews": 65,
        "rating_breakdown": {"5": 55, "4": 8, "3": 2, "2": 0, "1": 0},
        "is_featured": False,
        "is_bestseller": False,
        "is_flash_sale": False,
        "is_recommended": False,
        "is_active": True,
        "status": "active"
    },

    # 9. Kids Crackers
    {
        "_id": ObjectId("660000000000000000000117"),
        "name": "Twinkling Stars Pencil (20 Pcs)",
        "description": "Gentle sparkling pencil tubes emitting low-smoke silver glitter and colorful star sparks.",
        "price": 150.0,
        "discount_price": None,
        "category_id": ObjectId("660000000000000000000009"),
        "stock": 100,
        "images": ["pencil_crackers_roman_candles.png"],
        "rating": 4.8,
        "reviews_count": 74,
        "average_rating": 4.8,
        "total_reviews": 74,
        "rating_breakdown": {"5": 62, "4": 10, "3": 2, "2": 0, "1": 0},
        "is_featured": False,
        "is_bestseller": False,
        "is_flash_sale": False,
        "is_recommended": True,
        "is_active": True,
        "status": "active"
    },
    {
        "_id": ObjectId("660000000000000000000118"),
        "name": "Kids Crackers Combo Pack",
        "description": "Safe children's fireworks combo containing color sparklers, roll caps, popping strips, and ground spinners.",
        "price": 450.0,
        "discount_price": 399.0,
        "category_id": ObjectId("660000000000000000000009"),
        "stock": 60,
        "images": ["grand_festival_gift_box.png"],
        "rating": 4.9,
        "reviews_count": 98,
        "average_rating": 4.9,
        "total_reviews": 98,
        "rating_breakdown": {"5": 90, "4": 8, "3": 0, "2": 0, "1": 0},
        "is_featured": True,
        "is_bestseller": True,
        "is_flash_sale": False,
        "is_recommended": True,
        "is_active": True,
        "status": "active"
    },

    # 10. Gift Boxes
    {
        "_id": ObjectId("660000000000000000000119"),
        "name": "Festival Crackers Box (25 Items)",
        "description": "Popular family assortment gift box featuring sparklers, chakkars, flower pots, rockets, and pencil crackers.",
        "price": 1999.0,
        "discount_price": 1699.0,
        "category_id": ObjectId("660000000000000000000010"),
        "stock": 50,
        "images": ["grand_festival_gift_box.png"],
        "rating": 4.9,
        "reviews_count": 188,
        "average_rating": 4.9,
        "total_reviews": 188,
        "rating_breakdown": {"5": 175, "4": 13, "3": 0, "2": 0, "1": 0},
        "is_featured": True,
        "is_bestseller": True,
        "is_flash_sale": False,
        "is_recommended": True,
        "is_active": True,
        "status": "active"
    },
    {
        "_id": ObjectId("660000000000000000000120"),
        "name": "Deluxe Crackers Gift Box (45 Items)",
        "description": "Premium luxury Diwali gift hamper loaded with aerial multi-shots, giant flower pots, altitude rockets, and sound crackers.",
        "price": 2999.0,
        "discount_price": 2599.0,
        "category_id": ObjectId("660000000000000000000010"),
        "stock": 30,
        "images": ["grand_festival_gift_box.png"],
        "rating": 5.0,
        "reviews_count": 140,
        "average_rating": 5.0,
        "total_reviews": 140,
        "rating_breakdown": {"5": 140, "4": 0, "3": 0, "2": 0, "1": 0},
        "is_featured": True,
        "is_bestseller": False,
        "is_flash_sale": False,
        "is_recommended": True,
        "is_active": True,
        "status": "active"
    }
]


async def seed():
    print(f"Connecting to MongoDB at: {settings.MONGODB_URL} (DB: {settings.DB_NAME})")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DB_NAME]

    now = datetime.now(timezone.utc)

    # 1. Upsert Categories
    print("--- Seeding Categories ---")
    for cat in CATEGORIES:
        doc = {**cat, "created_at": now, "updated_at": now}
        await db["Categories"].replace_one({"_id": cat["_id"]}, doc, upsert=True)
        print(f"  ✓ Category: {cat['name']} ({cat['_id']})")

    # 2. Upsert Products & Inventory
    print("\n--- Seeding Products & Inventory ---")
    for prod in PRODUCTS:
        doc = {**prod, "created_at": now, "updated_at": now}
        await db["Products"].replace_one({"_id": prod["_id"]}, doc, upsert=True)

        # Upsert corresponding Inventory record
        inv_doc = {
            "product_id": prod["_id"],
            "current_stock": prod["stock"],
            "minimum_stock": 5,
            "maximum_stock": 1000,
            "last_updated": now,
            "history": [
                {
                    "transaction_type": "IN",
                    "quantity": prod["stock"],
                    "old_stock": 0,
                    "new_stock": prod["stock"],
                    "remarks": "Sivakasi Catalog Ingestion",
                    "created_by": "system_admin",
                    "created_at": now
                }
            ]
        }
        await db["Inventory"].replace_one({"product_id": prod["_id"]}, inv_doc, upsert=True)
        print(f"  ✓ Product: {prod['name']} | Price: ₹{prod['price']} | Stock: {prod['stock']}")

    # 3. Clean any orphaned placeholder records
    await db["Products"].delete_many({"name": "Super Phone"})
    await db["Categories"].delete_many({"name": "Electronics"})

    # Summary
    cat_count = await db["Categories"].count_documents({"status": "active"})
    prod_count = await db["Products"].count_documents({"status": "active"})
    inv_count = await db["Inventory"].count_documents({})

    print("\n==========================================")
    print("SEEDING SUMMARY:")
    print(f"  Total Categories in DB: {cat_count}")
    print(f"  Total Products in DB:   {prod_count}")
    print(f"  Total Inventory in DB:  {inv_count}")
    print("==========================================\n")


if __name__ == "__main__":
    asyncio.run(seed())
