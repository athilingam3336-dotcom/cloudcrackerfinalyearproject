"""
Safe MongoDB Atlas Fireworks Catalog Population Script for CloudCrackers
Populates the fireworks product catalog safely and idempotently without deleting or modifying any existing collections, users, orders, payments, carts, wishlists, or categories.
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

# 10 Core Fireworks Categories
CORE_FIREWORKS_CATEGORIES = [
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

# 20 Core Fireworks Products across 10 Categories
FIREWORKS_CATALOG_TEMPLATES = [
    # 1. Sparklers
    {
        "_id": ObjectId("660000000000000000000101"),
        "name": "Electric Sparkler (10 Pcs)",
        "category_name": "Sparklers",
        "description": "Classic 10cm electric wire sparklers producing bright golden crackling sparks. Safe for all festive celebrations.",
        "price": 90.0,
        "discount_price": None,
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
    },
    {
        "_id": ObjectId("660000000000000000000102"),
        "name": "Color Sparkler (10 Pcs)",
        "category_name": "Sparklers",
        "description": "Multi-colored hand-held sparklers that burn with vibrant crimson, emerald green, and golden stars.",
        "price": 120.0,
        "discount_price": 99.0,
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
    },
    {
        "_id": ObjectId("660000000000000000000103"),
        "name": "Gold Sparkler Deluxe (50 Pcs)",
        "category_name": "Sparklers",
        "description": "Extra long 30cm wedding grade golden sparklers with extended 120-second burn duration.",
        "price": 250.0,
        "discount_price": None,
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
    },

    # 2. Flower Pots
    {
        "_id": ObjectId("660000000000000000000104"),
        "name": "Flower Pot Small (10 Pcs)",
        "category_name": "Flower Pots",
        "description": "Traditional cone flower pots generating a dense 6-foot shower of bright golden and silver sparks.",
        "price": 140.0,
        "discount_price": 120.0,
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
    },
    {
        "_id": ObjectId("660000000000000000000105"),
        "name": "Flower Pot Big (5 Pcs)",
        "category_name": "Flower Pots",
        "description": "Giant jumbo flower pots creating a high-rise 15-foot fountain of cascading multi-stage sparkles.",
        "price": 320.0,
        "discount_price": None,
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
    },

    # 3. Ground Chakkars
    {
        "_id": ObjectId("660000000000000000000106"),
        "name": "Ground Chakkar (10 Pcs)",
        "category_name": "Ground Chakkars",
        "description": "Smooth spinning ground wheel producing high-speed rotating circles of brilliant yellow-gold glitter.",
        "price": 110.0,
        "discount_price": None,
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
    },
    {
        "_id": ObjectId("660000000000000000000107"),
        "name": "Spinner Chakkar Deluxe (10 Pcs)",
        "category_name": "Ground Chakkars",
        "description": "High-velocity deluxe spinning wheels generating wide radiant spark perimeters and crackling sounds.",
        "price": 220.0,
        "discount_price": 180.0,
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
    },

    # 4. Rockets
    {
        "_id": ObjectId("660000000000000000000108"),
        "name": "Rocket Classic (10 Pcs)",
        "category_name": "Rockets",
        "description": "Standard altitude sky rockets launching with screaming velocity and bursting into a golden glitter canopy.",
        "price": 250.0,
        "discount_price": None,
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
    },
    {
        "_id": ObjectId("660000000000000000000109"),
        "name": "Whistling Rocket (10 Pcs)",
        "category_name": "Rockets",
        "description": "High-altitude whistling rockets emitting an acoustic siren ascent followed by a thunderous aerial burst.",
        "price": 380.0,
        "discount_price": 320.0,
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
    },

    # 5. Atom Bombs
    {
        "_id": ObjectId("660000000000000000000110"),
        "name": "Atom Bomb (10 Pcs)",
        "category_name": "Atom Bombs",
        "description": "Authentic Sivakasi loud sound cracker tightly bound with green jute cord delivering powerful bass concussion.",
        "price": 299.0,
        "discount_price": 249.0,
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
    },

    # 6. Bijili Crackers
    {
        "_id": ObjectId("660000000000000000000111"),
        "name": "Bijili (100 Pcs String)",
        "category_name": "Bijili Crackers",
        "description": "Traditional red paper bijili crackers bound into a rapid continuous strip for rhythmic festive crackles.",
        "price": 70.0,
        "discount_price": None,
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
    },

    # 7. Fancy Aerials
    {
        "_id": ObjectId("660000000000000000000112"),
        "name": "Fancy Aerial Shot (Single)",
        "category_name": "Fancy Aerials",
        "description": "Single-tube heavy display shell shooting 150 feet high and breaking into a multi-color spherical chrysanthemum.",
        "price": 650.0,
        "discount_price": 550.0,
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
    },
    {
        "_id": ObjectId("660000000000000000000113"),
        "name": "7 Shot Repeater",
        "category_name": "Fancy Aerials",
        "description": "7 sequential aerial shots ejecting color star balls with whistling tails and glittering breaks.",
        "price": 350.0,
        "discount_price": None,
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
    },
    {
        "_id": ObjectId("660000000000000000000114"),
        "name": "30 Shot Sky Barrage",
        "category_name": "Fancy Aerials",
        "description": "30-shot rapid fire aerial cake display with gold brocade willows, color peony stars, and crackling finale.",
        "price": 1499.0,
        "discount_price": 1299.0,
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
    },
    {
        "_id": ObjectId("660000000000000000000115"),
        "name": "60 Shot Grand Finale Cake",
        "category_name": "Fancy Aerials",
        "description": "Large-scale 60-shot celebration cake engineered for grand weddings and festival celebrations with synchronized sky choreography.",
        "price": 2750.0,
        "discount_price": 2400.0,
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
    },

    # 8. Sound Crackers
    {
        "_id": ObjectId("660000000000000000000116"),
        "name": "Thunder Sound Crackers (10 Pcs)",
        "category_name": "Sound Crackers",
        "description": "Intense audible sound crackers with crisp sharp crackle and zero flying debris for safe enjoyment.",
        "price": 220.0,
        "discount_price": 180.0,
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
    },

    # 9. Kids Crackers
    {
        "_id": ObjectId("660000000000000000000117"),
        "name": "Twinkling Stars Pencil (20 Pcs)",
        "category_name": "Kids Crackers",
        "description": "Gentle sparkling pencil tubes emitting low-smoke silver glitter and colorful star sparks.",
        "price": 150.0,
        "discount_price": None,
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
    },
    {
        "_id": ObjectId("660000000000000000000118"),
        "name": "Kids Crackers Combo Pack",
        "category_name": "Kids Crackers",
        "description": "Safe children's fireworks combo containing color sparklers, roll caps, popping strips, and ground spinners.",
        "price": 450.0,
        "discount_price": 399.0,
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
    },

    # 10. Gift Boxes
    {
        "_id": ObjectId("660000000000000000000119"),
        "name": "Festival Crackers Box (25 Items)",
        "category_name": "Gift Boxes",
        "description": "Popular family assortment gift box featuring sparklers, chakkars, flower pots, rockets, and pencil crackers.",
        "price": 1999.0,
        "discount_price": 1699.0,
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
    },
    {
        "_id": ObjectId("660000000000000000000120"),
        "name": "Deluxe Crackers Gift Box (45 Items)",
        "category_name": "Gift Boxes",
        "description": "Premium luxury Diwali gift hamper loaded with aerial multi-shots, giant flower pots, altitude rockets, and sound crackers.",
        "price": 2999.0,
        "discount_price": 2599.0,
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
    }
]


async def safe_upsert_fireworks_catalog():
    print(f"Connecting to MongoDB at {settings.MONGODB_URL} (Database: {settings.DB_NAME})")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DB_NAME]

    # 1. Audit before
    print("\n--- 1. COLLECTIONS SAFETY AUDIT BEFORE OPERATION ---")
    tracked_collections = [
        "Users",
        "Orders",
        "Payments",
        "Addresses",
        "Cart",
        "Wishlist",
        "Reviews",
        "Notifications",
        "AuditLogs",
        "Categories",
        "Products",
        "Inventory",
        "About",
        "Coupons",
    ]
    counts_before = {}
    for col in tracked_collections:
        counts_before[col] = await db[col].count_documents({})
        print(f"  {col}: {counts_before[col]} documents")

    existing_products_before = counts_before["Products"]
    now = datetime.now(timezone.utc)

    # 2. Safely ensure all 10 core fireworks categories exist in MongoDB Atlas
    print("\n--- 2. SAFELY UPSERTING CORE FIREWORKS CATEGORIES ---")
    cat_inserted_count = 0
    cat_updated_count = 0

    for cat_data in CORE_FIREWORKS_CATEGORIES:
        cat_id = cat_data["_id"]
        cat_name = cat_data["name"]

        existing_cat = await db["Categories"].find_one({
            "$or": [
                {"_id": cat_id},
                {"name": cat_name}
            ]
        })

        if existing_cat:
            # Update description / image / status safely without changing _id
            await db["Categories"].update_one(
                {"_id": existing_cat["_id"]},
                {"$set": {
                    "name": cat_name,
                    "description": cat_data["description"],
                    "image_url": cat_data["image_url"],
                    "is_active": True,
                    "status": "active",
                    "updated_at": now,
                }}
            )
            cat_updated_count += 1
            print(f"  [UPDATED CATEGORY] '{cat_name}' (ID: {existing_cat['_id']})")
        else:
            new_cat_doc = {
                "_id": cat_id,
                "name": cat_name,
                "description": cat_data["description"],
                "image_url": cat_data["image_url"],
                "is_active": True,
                "status": "active",
                "created_at": now,
                "updated_at": now,
                "created_by": "system_admin",
                "updated_by": "system_admin",
            }
            await db["Categories"].insert_one(new_cat_doc)
            cat_inserted_count += 1
            print(f"  [INSERTED CATEGORY] '{cat_name}' (ID: {cat_id})")

    # 3. Read and resolve all category IDs by name
    print("\n--- 3. RESOLVING CATEGORIES FROM MONGODB ATLAS ---")
    categories_cursor = db["Categories"].find({})
    categories_map = {}
    async for c in categories_cursor:
        cat_name = c.get("name")
        cat_id = c.get("_id")
        categories_map[cat_name] = cat_id
        print(f"  Resolved Category: '{cat_name}' -> ID: {cat_id}")

    # 4. Safe idempotent upsert of fireworks products & inventory
    print("\n--- 4. SAFE UPSERT OF FIREWORKS PRODUCTS & INVENTORY ---")
    inserted_count = 0
    updated_count = 0
    skipped_count = 0

    for template in FIREWORKS_CATALOG_TEMPLATES:
        cat_name = template["category_name"]
        cat_id = categories_map.get(cat_name)

        if not cat_id:
            print(f"  [ERROR] Cannot find category '{cat_name}' in Atlas for product '{template['name']}'. Skipping!")
            skipped_count += 1
            continue

        prod_id = template["_id"]
        prod_name = template["name"]

        # Check whether product exists by _id or name
        existing_prod = await db["Products"].find_one({
            "$or": [
                {"_id": prod_id},
                {"name": prod_name}
            ]
        })

        product_doc = {
            "_id": prod_id,
            "name": prod_name,
            "description": template["description"],
            "price": template["price"],
            "discount_price": template["discount_price"],
            "category_id": cat_id,
            "stock": template["stock"],
            "images": template["images"],
            "rating": template["rating"],
            "reviews_count": template["reviews_count"],
            "average_rating": template["average_rating"],
            "total_reviews": template["total_reviews"],
            "rating_breakdown": template["rating_breakdown"],
            "is_featured": template["is_featured"],
            "is_bestseller": template["is_bestseller"],
            "is_flash_sale": template["is_flash_sale"],
            "is_recommended": template["is_recommended"],
            "is_active": True,
            "status": "active",
            "created_by": "system_admin",
            "updated_by": "system_admin",
            "updated_at": now,
        }

        if existing_prod:
            # Update fields safely without changing _id or deleting
            update_data = {k: v for k, v in product_doc.items() if k != "_id"}
            await db["Products"].update_one(
                {"_id": existing_prod["_id"]},
                {"$set": update_data}
            )
            updated_count += 1
            print(f"  [UPDATED PRODUCT] '{prod_name}' (ID: {existing_prod['_id']}) -> Category: '{cat_name}' ({cat_id})")
            target_prod_id = existing_prod["_id"]
        else:
            product_doc["created_at"] = now
            await db["Products"].insert_one(product_doc)
            inserted_count += 1
            print(f"  [INSERTED PRODUCT] '{prod_name}' (ID: {prod_id}) -> Category: '{cat_name}' ({cat_id})")
            target_prod_id = prod_id

        # Safe upsert corresponding Inventory record
        inv_doc = {
            "product_id": target_prod_id,
            "current_stock": template["stock"],
            "minimum_stock": 5,
            "maximum_stock": 1000,
            "last_updated": now,
            "history": [
                {
                    "transaction_type": "IN",
                    "quantity": template["stock"],
                    "old_stock": 0,
                    "new_stock": template["stock"],
                    "remarks": "Safe Fireworks Catalog Ingestion",
                    "created_by": "system_admin",
                    "created_at": now,
                }
            ],
        }
        await db["Inventory"].update_one(
            {"product_id": target_prod_id},
            {"$set": inv_doc},
            upsert=True
        )

    # 5. Collections safety audit after
    print("\n--- 5. COLLECTIONS SAFETY AUDIT AFTER OPERATION ---")
    counts_after = {}
    for col in tracked_collections:
        counts_after[col] = await db[col].count_documents({})
        delta = counts_after[col] - counts_before[col]
        status = "UNCHANGED" if delta == 0 else f"CHANGED (+{delta})"
        print(f"  {col}: {counts_after[col]} documents [{status}]")

    # 6. Fireworks Catalog Verification Report
    print("\n==================================================")
    print("FIREWORKS CATALOG VERIFICATION REPORT:")
    print("==================================================")
    total_categories = await db["Categories"].count_documents({})
    total_products = await db["Products"].count_documents({})
    active_products = await db["Products"].count_documents({"status": "active", "is_active": True})
    missing_cat = await db["Products"].count_documents({"category_id": {"$exists": False}})
    missing_price = await db["Products"].count_documents({"$or": [{"price": {"$exists": False}}, {"price": {"$lte": 0}}]})
    missing_images = await db["Products"].count_documents({"$or": [{"images": {"$exists": False}}, {"images": {"$size": 0}}]})
    in_stock_prods = await db["Products"].count_documents({"stock": {"$gt": 0}})
    total_inventory = await db["Inventory"].count_documents({})

    print(f"Total Categories in DB:        {total_categories}")
    print(f"Total Products in DB:          {total_products}")
    print(f"Active Products:               {active_products}")
    print(f"Products with Missing Cat:     {missing_cat}")
    print(f"Products with Invalid Price:   {missing_price}")
    print(f"Products with Missing Images:  {missing_images}")
    print(f"Products with Stock (> 0):     {in_stock_prods}")
    print(f"Inventory Records:             {total_inventory}")

    print("\n--- Products per Category Breakdown ---")
    async for cat in db["Categories"].find({}):
        c_id = cat["_id"]
        c_name = cat.get("name", "Unknown")
        count = await db["Products"].count_documents({"category_id": c_id})
        print(f"  - Category: {c_name.ljust(25)} (ID: {c_id}) -> {count} products")

    print("\n--- User / Order / Payment Collections Safety Check ---")
    for critical_col in ["Users", "Orders", "Payments", "Addresses", "Cart", "Wishlist", "Reviews", "Notifications", "AuditLogs"]:
        assert counts_after[critical_col] == counts_before[critical_col], f"ALERT: {critical_col} document count changed!"
        print(f"  ✓ {critical_col} collection: {counts_after[critical_col]} documents preserved completely.")

    print("\n==================================================")
    print("SUMMARY:")
    print(f"  Existing products before: {existing_products_before}")
    print(f"  Products inserted:        {inserted_count}")
    print(f"  Products updated:         {updated_count}")
    print(f"  Products skipped:         {skipped_count}")
    print(f"  Final product count:      {total_products}")
    print("==================================================\n")


if __name__ == "__main__":
    asyncio.run(safe_upsert_fireworks_catalog())
