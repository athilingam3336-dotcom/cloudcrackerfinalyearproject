"""
Comprehensive LinkedIn Showcase Seed Script for CloudCrackers / Meera Crackers
Populates rich, production-grade demo data directly matching Beanie model schemas:
- Admin User (admin@cloudcrackers.com / Admin@Cloud123) & 12 Customers
- 8 Sivakasi Categories with real descriptions
- 16 Products with realistic pricing, stock levels & badges
- 44 Orders spanning the last 30 days + Today (Total Revenue: ~Rs. 2,17,000, Today: ~Rs. 25,000)
- 82 OrderItems line entries
- Active Coupons
- Customer Reviews
"""

import asyncio
import os
import random
import sys
from datetime import datetime, timedelta
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

LOCAL_MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "cloudcrackers"

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.security import hash_password

async def seed():
    print(f"Connecting to MongoDB at {LOCAL_MONGO_URL} (db: {DB_NAME})...")
    client = AsyncIOMotorClient(LOCAL_MONGO_URL)
    db = client[DB_NAME]

    try:
        await db.command("ping")
        print("Connected to MongoDB successfully!")
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        return

    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # 1. SEED CATEGORIES
    categories = [
        {
            "_id": ObjectId("660000000000000000000001"),
            "name": "Sparklers",
            "description": "Dazzling hand-held wire sparklers in gold, silver, and multi-color sparkle for weddings, Diwali, and celebrations.",
            "image_url": "electric_sparklers.png",
            "slug": "sparklers",
            "is_active": True,
            "display_order": 1,
            "created_at": now - timedelta(days=60),
            "updated_at": now,
        },
        {
            "_id": ObjectId("660000000000000000000002"),
            "name": "Flower Pots",
            "description": "Brilliant ground fountain fireworks creating showering cascades of golden, silver, and crackling sparks.",
            "image_url": "flower_pot_fireworks.png",
            "slug": "flower-pots",
            "is_active": True,
            "display_order": 2,
            "created_at": now - timedelta(days=60),
            "updated_at": now,
        },
        {
            "_id": ObjectId("660000000000000000000003"),
            "name": "Ground Chakkars",
            "description": "High-velocity spinning ground wheels and spinners producing vibrant swirling rings of fire and whistle effects.",
            "image_url": "ground_chakkars_spinners.png",
            "slug": "ground-chakkars",
            "is_active": True,
            "display_order": 3,
            "created_at": now - timedelta(days=60),
            "updated_at": now,
        },
        {
            "_id": ObjectId("660000000000000000000004"),
            "name": "Rockets & Sound Crackers",
            "description": "Powerful sky-ascending rockets, atom bombs, and classic high-decibel festival sound crackers.",
            "image_url": "rockets_fireworks.png",
            "slug": "rockets",
            "is_active": True,
            "display_order": 4,
            "created_at": now - timedelta(days=60),
            "updated_at": now,
        },
        {
            "_id": ObjectId("660000000000000000000005"),
            "name": "Multi-Shot Aerial Fireworks",
            "description": "Grand festival multi-shot repeater cakes (12, 30, 60 & 120 shots) filling the night sky with aerial pyrotechnics.",
            "image_url": "30_shots_multi_shot_fireworks.png",
            "slug": "aerial-fireworks",
            "is_active": True,
            "display_order": 5,
            "created_at": now - timedelta(days=60),
            "updated_at": now,
        },
        {
            "_id": ObjectId("660000000000000000000006"),
            "name": "Festival Gift Boxes",
            "description": "All-in-one assorted family festive gift boxes with sparklers, fountains, chakkars, and multi-shots.",
            "image_url": "grand_festival_gift_box.png",
            "slug": "gift-boxes",
            "is_active": True,
            "display_order": 6,
            "created_at": now - timedelta(days=60),
            "updated_at": now,
        },
        {
            "_id": ObjectId("660000000000000000000007"),
            "name": "Kids Special & Novelties",
            "description": "Safe, low-smoke, kid-friendly novelty crackers, pop-pops, magic snakes, and colorful torches.",
            "image_url": "diwali_kids_fireworks.png",
            "slug": "kids-special",
            "is_active": True,
            "display_order": 7,
            "created_at": now - timedelta(days=60),
            "updated_at": now,
        },
        {
            "_id": ObjectId("660000000000000000000008"),
            "name": "Atom Bombs & Garlands",
            "description": "Heavy Sivakasi atom bombs, hydro bombs, and traditional red roll garlands (1000 to 5000 wala).",
            "image_url": "atom_bomb_cracker.png",
            "slug": "atom-bombs",
            "is_active": True,
            "display_order": 8,
            "created_at": now - timedelta(days=60),
            "updated_at": now,
        },
    ]

    await db["Categories"].delete_many({})
    await db["Categories"].insert_many(categories)
    print(f"Seeded {len(categories)} categories.")

    # 2. SEED PRODUCTS
    products = [
        {
            "_id": ObjectId("660000000000000000000101"),
            "name": "15cm Electric Sparklers (Pack of 10)",
            "description": "Classic gold electric sparklers with crackling bright golden sparks. Safe for children under adult supervision.",
            "price": 85.0,
            "discount_price": 75.0,
            "category_id": ObjectId("660000000000000000000001"),
            "stock": 140,
            "image_url": "electric_sparklers.png",
            "images": ["electric_sparklers.png"],
            "rating": 4.9,
            "reviews_count": 38,
            "average_rating": 4.9,
            "total_reviews": 38,
            "is_featured": True,
            "is_bestseller": True,
            "badge": "Bestseller",
            "status": "active",
            "is_active": True,
            "time_of_day": "night",
            "created_at": now - timedelta(days=50),
            "updated_at": now,
        },
        {
            "_id": ObjectId("660000000000000000000102"),
            "name": "30cm Colour Sparklers (Pack of 5)",
            "description": "Extra-long vivid multi-color sparklers burning in red, green, gold, and silver. Long-lasting burn time.",
            "price": 160.0,
            "discount_price": 140.0,
            "category_id": ObjectId("660000000000000000000001"),
            "stock": 95,
            "image_url": "electric_sparklers.png",
            "images": ["electric_sparklers.png"],
            "rating": 4.8,
            "reviews_count": 24,
            "average_rating": 4.8,
            "total_reviews": 24,
            "is_featured": True,
            "is_bestseller": False,
            "badge": "Hot Sale",
            "status": "active",
            "is_active": True,
            "time_of_day": "night",
            "created_at": now - timedelta(days=50),
            "updated_at": now,
        },
        {
            "_id": ObjectId("660000000000000000000103"),
            "name": "50cm Giant Mega Sparklers (Pack of 3)",
            "description": "Spectacular giant sparklers with 3-minute continuous golden cascade. Perfect for wedding photoshoots.",
            "price": 240.0,
            "discount_price": 210.0,
            "category_id": ObjectId("660000000000000000000001"),
            "stock": 4,  # LOW STOCK FOR ADMIN DASHBOARD ALERT!
            "image_url": "electric_sparklers.png",
            "images": ["electric_sparklers.png"],
            "rating": 4.7,
            "reviews_count": 19,
            "average_rating": 4.7,
            "total_reviews": 19,
            "is_featured": False,
            "is_bestseller": False,
            "badge": "Low Stock",
            "status": "active",
            "is_active": True,
            "time_of_day": "night",
            "created_at": now - timedelta(days=50),
            "updated_at": now,
        },
        {
            "_id": ObjectId("660000000000000000000104"),
            "name": "Flower Pots Special (Pack of 10)",
            "description": "Traditional Sivakasi flower pots erupting in a 6-foot tall fountain of radiant golden and silver embers.",
            "price": 190.0,
            "discount_price": 160.0,
            "category_id": ObjectId("660000000000000000000002"),
            "stock": 110,
            "image_url": "flower_pot_fireworks.png",
            "images": ["flower_pot_fireworks.png"],
            "rating": 4.9,
            "reviews_count": 42,
            "average_rating": 4.9,
            "total_reviews": 42,
            "is_featured": True,
            "is_bestseller": True,
            "badge": "Top Rated",
            "status": "active",
            "is_active": True,
            "time_of_day": "night",
            "created_at": now - timedelta(days=50),
            "updated_at": now,
        },
        {
            "_id": ObjectId("660000000000000000000105"),
            "name": "Asoka Giant Deluxe Flower Pot (Box of 5)",
            "description": "High-intensity giant fountain emitting tri-colour sparks (Red, Green & Gold) reaching up to 10 feet.",
            "price": 320.0,
            "discount_price": 280.0,
            "category_id": ObjectId("660000000000000000000002"),
            "stock": 65,
            "image_url": "flower_pot_fireworks.png",
            "images": ["flower_pot_fireworks.png"],
            "rating": 4.8,
            "reviews_count": 29,
            "average_rating": 4.8,
            "total_reviews": 29,
            "is_featured": True,
            "is_bestseller": False,
            "badge": "Popular",
            "status": "active",
            "is_active": True,
            "time_of_day": "night",
            "created_at": now - timedelta(days=50),
            "updated_at": now,
        },
        {
            "_id": ObjectId("660000000000000000000106"),
            "name": "Ground Chakkars Deluxe (Pack of 10)",
            "description": "Spins effortlessly on the floor with dazzling concentric rings of brilliant white-hot fire.",
            "price": 140.0,
            "discount_price": 120.0,
            "category_id": ObjectId("660000000000000000000003"),
            "stock": 120,
            "image_url": "ground_chakkars_spinners.png",
            "images": ["ground_chakkars_spinners.png"],
            "rating": 4.9,
            "reviews_count": 36,
            "average_rating": 4.9,
            "total_reviews": 36,
            "is_featured": True,
            "is_bestseller": True,
            "badge": "Bestseller",
            "status": "active",
            "is_active": True,
            "time_of_day": "night",
            "created_at": now - timedelta(days=50),
            "updated_at": now,
        },
        {
            "_id": ObjectId("660000000000000000000107"),
            "name": "Jumbo Disco Wheel Chakkar (Box of 5)",
            "description": "Massive wheel spinner with alternating strobe lights and whistle effects lasting over 45 seconds.",
            "price": 220.0,
            "discount_price": 190.0,
            "category_id": ObjectId("660000000000000000000003"),
            "stock": 3,  # LOW STOCK FOR ADMIN ALERT!
            "image_url": "ground_chakkars_spinners.png",
            "images": ["ground_chakkars_spinners.png"],
            "rating": 4.8,
            "reviews_count": 18,
            "average_rating": 4.8,
            "total_reviews": 18,
            "is_featured": False,
            "is_bestseller": False,
            "badge": "Low Stock",
            "status": "active",
            "is_active": True,
            "time_of_day": "night",
            "created_at": now - timedelta(days=50),
            "updated_at": now,
        },
        {
            "_id": ObjectId("660000000000000000000108"),
            "name": "30 Shots Sky Carnival Repeater Cake",
            "description": "30 rapid-fire aerial bursts launching high into the sky, opening into brocade crowns, willow palms, and crackling stars.",
            "price": 950.0,
            "discount_price": 850.0,
            "category_id": ObjectId("660000000000000000000005"),
            "stock": 45,
            "image_url": "30_shots_multi_shot_fireworks.png",
            "images": ["30_shots_multi_shot_fireworks.png"],
            "rating": 5.0,
            "reviews_count": 51,
            "average_rating": 5.0,
            "total_reviews": 51,
            "is_featured": True,
            "is_bestseller": True,
            "badge": "Top Seller",
            "status": "active",
            "is_active": True,
            "time_of_day": "night",
            "created_at": now - timedelta(days=50),
            "updated_at": now,
        },
        {
            "_id": ObjectId("660000000000000000000109"),
            "name": "60 Shots Grand Symphony Aerial Cake",
            "description": "Spectacular 60-shot non-stop musical aerial display with dragon tails, golden spider bursts, and titanium salutes.",
            "price": 1850.0,
            "discount_price": 1650.0,
            "category_id": ObjectId("660000000000000000000005"),
            "stock": 25,
            "image_url": "30_shots_multi_shot_fireworks.png",
            "images": ["30_shots_multi_shot_fireworks.png"],
            "rating": 4.9,
            "reviews_count": 33,
            "average_rating": 4.9,
            "total_reviews": 33,
            "is_featured": True,
            "is_bestseller": False,
            "badge": "Premium",
            "status": "active",
            "is_active": True,
            "time_of_day": "night",
            "created_at": now - timedelta(days=50),
            "updated_at": now,
        },
        {
            "_id": ObjectId("660000000000000000000110"),
            "name": "12 Shots Sky Wonder Box",
            "description": "Entry-level aerial firework cake producing 12 colorful crackling peony bursts with thunder sound.",
            "price": 420.0,
            "discount_price": 380.0,
            "category_id": ObjectId("660000000000000000000005"),
            "stock": 80,
            "image_url": "30_shots_multi_shot_fireworks.png",
            "images": ["30_shots_multi_shot_fireworks.png"],
            "rating": 4.7,
            "reviews_count": 21,
            "average_rating": 4.7,
            "total_reviews": 21,
            "is_featured": False,
            "is_bestseller": False,
            "badge": "Value Pack",
            "status": "active",
            "is_active": True,
            "time_of_day": "night",
            "created_at": now - timedelta(days=50),
            "updated_at": now,
        },
        {
            "_id": ObjectId("660000000000000000000111"),
            "name": "Grand Festival Family Gift Box (32 Items)",
            "description": "The ultimate Diwali gift pack! Includes sparklers, flower pots, chakkars, rockets, bombs, and multi-shot cake in a luxury gift box.",
            "price": 2499.0,
            "discount_price": 2199.0,
            "category_id": ObjectId("660000000000000000000006"),
            "stock": 50,
            "image_url": "grand_festival_gift_box.png",
            "images": ["grand_festival_gift_box.png"],
            "rating": 5.0,
            "reviews_count": 48,
            "average_rating": 5.0,
            "total_reviews": 48,
            "is_featured": True,
            "is_bestseller": True,
            "badge": "Best Value",
            "status": "active",
            "is_active": True,
            "time_of_day": "both",
            "created_at": now - timedelta(days=50),
            "updated_at": now,
        },
        {
            "_id": ObjectId("660000000000000000000112"),
            "name": "Royal Supreme Celebration Hamper (55 Items)",
            "description": "Massive luxury festive box loaded with high-grade green crackers, aerial repeats, and novelties. Complete family festival pack.",
            "price": 4999.0,
            "discount_price": 4499.0,
            "category_id": ObjectId("660000000000000000000006"),
            "stock": 18,
            "image_url": "grand_festival_gift_box.png",
            "images": ["grand_festival_gift_box.png"],
            "rating": 4.9,
            "reviews_count": 27,
            "average_rating": 4.9,
            "total_reviews": 27,
            "is_featured": True,
            "is_bestseller": False,
            "badge": "Luxury Box",
            "status": "active",
            "is_active": True,
            "time_of_day": "both",
            "created_at": now - timedelta(days=50),
            "updated_at": now,
        },
        {
            "_id": ObjectId("660000000000000000000113"),
            "name": "Hydro Bomb Green Cracker (Pack of 10)",
            "description": "High-decibel festival sound cracker compliant with NEERI green cracker decibel norms. Crisp thunder sound.",
            "price": 180.0,
            "discount_price": 150.0,
            "category_id": ObjectId("660000000000000000000008"),
            "stock": 85,
            "image_url": "atom_bomb_cracker.png",
            "images": ["atom_bomb_cracker.png"],
            "rating": 4.8,
            "reviews_count": 34,
            "average_rating": 4.8,
            "total_reviews": 34,
            "is_featured": True,
            "is_bestseller": True,
            "badge": "Popular",
            "status": "active",
            "is_active": True,
            "time_of_day": "night",
            "created_at": now - timedelta(days=50),
            "updated_at": now,
        },
        {
            "_id": ObjectId("660000000000000000000114"),
            "name": "1000 Wala Traditional Red Garland",
            "description": "Continuous rapid celebratory sound garland for festival openings and celebrations. Authentic Sivakasi paper.",
            "price": 480.0,
            "discount_price": 420.0,
            "category_id": ObjectId("660000000000000000000008"),
            "stock": 0,  # OUT OF STOCK FOR ADMIN DEMO!
            "image_url": "atom_bomb_cracker.png",
            "images": ["atom_bomb_cracker.png"],
            "rating": 4.9,
            "reviews_count": 31,
            "average_rating": 4.9,
            "total_reviews": 31,
            "is_featured": False,
            "is_bestseller": False,
            "badge": "Out of Stock",
            "status": "active",
            "is_active": True,
            "time_of_day": "night",
            "created_at": now - timedelta(days=50),
            "updated_at": now,
        },
        {
            "_id": ObjectId("660000000000000000000115"),
            "name": "Whistling Sky Rocket Deluxe (Pack of 10)",
            "description": "Ascends with a piercing sonic whistle, exploding into a glittering star umbrella over 120 feet in the sky.",
            "price": 280.0,
            "discount_price": 240.0,
            "category_id": ObjectId("660000000000000000000004"),
            "stock": 70,
            "image_url": "rockets_fireworks.png",
            "images": ["rockets_fireworks.png"],
            "rating": 4.8,
            "reviews_count": 22,
            "average_rating": 4.8,
            "total_reviews": 22,
            "is_featured": True,
            "is_bestseller": False,
            "badge": "Thrilling",
            "status": "active",
            "is_active": True,
            "time_of_day": "night",
            "created_at": now - timedelta(days=50),
            "updated_at": now,
        },
        {
            "_id": ObjectId("660000000000000000000116"),
            "name": "Kids Magic Pop-Pops (Box of 50)",
            "description": "Zero-fire snap pops that explode with a light pop when thrown on the floor. 100% kid safe.",
            "price": 60.0,
            "discount_price": 50.0,
            "category_id": ObjectId("660000000000000000000007"),
            "stock": 160,
            "image_url": "diwali_kids_fireworks.png",
            "images": ["diwali_kids_fireworks.png"],
            "rating": 4.9,
            "reviews_count": 45,
            "average_rating": 4.9,
            "total_reviews": 45,
            "is_featured": False,
            "is_bestseller": True,
            "badge": "Kids Safe",
            "status": "active",
            "is_active": True,
            "time_of_day": "morning",
            "created_at": now - timedelta(days=50),
            "updated_at": now,
        },
    ]

    await db["Products"].delete_many({})
    await db["Products"].insert_many(products)
    print(f"Seeded {len(products)} products.")

    # 2.1 SEED INVENTORY FOR EACH PRODUCT
    inventory_items = []
    for p in products:
        inventory_items.append({
            "_id": ObjectId(),
            "product_id": p["_id"],
            "current_stock": p["stock"],
            "minimum_stock": 5,
            "maximum_stock": 500,
            "last_updated": now,
            "history": [
                {
                    "transaction_type": "IN",
                    "quantity": p["stock"],
                    "old_stock": 0,
                    "new_stock": p["stock"],
                    "remarks": "Initial festive inventory intake from Sivakasi factory",
                    "created_by": "System Auto-Seed",
                    "created_at": now - timedelta(days=50),
                }
            ],
        })

    await db["Inventory"].delete_many({})
    await db["Inventory"].insert_many(inventory_items)
    print(f"Seeded {len(inventory_items)} inventory tracking records.")

    # 3. SEED USERS (ADMIN + 11 CUSTOMERS)
    demo_admin_pw = os.getenv("DEMO_ADMIN_PASSWORD", "Admin@Cloud123")
    admin_password_hash = hash_password(demo_admin_pw)
    user_password_hash = hash_password("Password123!")

    users = [
        # Store Admin (matching User model)
        {
            "_id": ObjectId("660000000000000000000201"),
            "email": os.getenv("DEMO_ADMIN_EMAIL", "admin@cloudcrackers.com"),
            "full_name": "Store Administrator",
            "phone": "+91 9876543210",
            "password_hash": admin_password_hash,
            "role": "ADMIN",
            "is_verified": True,
            "is_active": True,
            "auth_provider": "local",
            "status": "active",
            "avatar_url": None,
            "created_at": now - timedelta(days=90),
            "updated_at": now,
        },
        {
            "_id": ObjectId("660000000000000000000202"),
            "email": "manager@cloudcrackers.com",
            "full_name": "Meera Manager",
            "phone": "+91 9442172314",
            "password_hash": admin_password_hash,
            "role": "ADMIN",
            "is_verified": True,
            "is_active": True,
            "auth_provider": "local",
            "status": "active",
            "avatar_url": None,
            "created_at": now - timedelta(days=90),
            "updated_at": now,
        },
        # 10 Customers
        {
            "_id": ObjectId("660000000000000000000203"),
            "email": "priya.sharma@gmail.com",
            "full_name": "Priya Sharma",
            "phone": "+91 9840112345",
            "password_hash": user_password_hash,
            "role": "CUSTOMER",
            "is_verified": True,
            "is_active": True,
            "auth_provider": "local",
            "status": "active",
            "created_at": now - timedelta(days=45),
            "updated_at": now,
        },
        {
            "_id": ObjectId("660000000000000000000204"),
            "email": "karthik.raja@outlook.com",
            "full_name": "Karthik Raja",
            "phone": "+91 9790223456",
            "password_hash": user_password_hash,
            "role": "CUSTOMER",
            "is_verified": True,
            "is_active": True,
            "auth_provider": "local",
            "status": "active",
            "created_at": now - timedelta(days=40),
            "updated_at": now,
        },
        {
            "_id": ObjectId("660000000000000000000205"),
            "email": "ananya.iyer@gmail.com",
            "full_name": "Ananya Iyer",
            "phone": "+91 9884334567",
            "password_hash": user_password_hash,
            "role": "CUSTOMER",
            "is_verified": True,
            "is_active": True,
            "auth_provider": "local",
            "status": "active",
            "created_at": now - timedelta(days=35),
            "updated_at": now,
        },
        {
            "_id": ObjectId("660000000000000000000206"),
            "email": "vijay.kumar@yahoo.com",
            "full_name": "Vijay Kumar",
            "phone": "+91 9444445678",
            "password_hash": user_password_hash,
            "role": "CUSTOMER",
            "is_verified": True,
            "is_active": True,
            "auth_provider": "local",
            "status": "active",
            "created_at": now - timedelta(days=30),
            "updated_at": now,
        },
        {
            "_id": ObjectId("660000000000000000000207"),
            "email": "deepa.ramesh@gmail.com",
            "full_name": "Deepa Ramesh",
            "phone": "+91 9841556789",
            "password_hash": user_password_hash,
            "role": "CUSTOMER",
            "is_verified": True,
            "is_active": True,
            "auth_provider": "local",
            "status": "active",
            "created_at": now - timedelta(days=25),
            "updated_at": now,
        },
        {
            "_id": ObjectId("660000000000000000000208"),
            "email": "sanjay.patel@gmail.com",
            "full_name": "Sanjay Patel",
            "phone": "+91 9962667890",
            "password_hash": user_password_hash,
            "role": "CUSTOMER",
            "is_verified": True,
            "is_active": True,
            "auth_provider": "local",
            "status": "active",
            "created_at": now - timedelta(days=20),
            "updated_at": now,
        },
        {
            "_id": ObjectId("660000000000000000000209"),
            "email": "lakshmi.n@gmail.com",
            "full_name": "Lakshmi Narayanan",
            "phone": "+91 9789778901",
            "password_hash": user_password_hash,
            "role": "CUSTOMER",
            "is_verified": True,
            "is_active": True,
            "auth_provider": "local",
            "status": "active",
            "created_at": now - timedelta(days=15),
            "updated_at": now,
        },
        {
            "_id": ObjectId("660000000000000000000210"),
            "email": "suresh.babu@gmail.com",
            "full_name": "Suresh Babu",
            "phone": "+91 9840889012",
            "password_hash": user_password_hash,
            "role": "CUSTOMER",
            "is_verified": True,
            "is_active": True,
            "auth_provider": "local",
            "status": "active",
            "created_at": now - timedelta(days=10),
            "updated_at": now,
        },
        {
            "_id": ObjectId("660000000000000000000211"),
            "email": "meena.sundar@gmail.com",
            "full_name": "Meena Sundaram",
            "phone": "+91 9710990123",
            "password_hash": user_password_hash,
            "role": "CUSTOMER",
            "is_verified": True,
            "is_active": True,
            "auth_provider": "local",
            "status": "active",
            "created_at": now - timedelta(days=5),
            "updated_at": now,
        },
        {
            "_id": ObjectId("660000000000000000000212"),
            "email": "aravind.swamy@gmail.com",
            "full_name": "Aravind Swamy",
            "phone": "+91 9884110234",
            "password_hash": user_password_hash,
            "role": "CUSTOMER",
            "is_verified": True,
            "is_active": True,
            "auth_provider": "local",
            "status": "active",
            "created_at": now - timedelta(days=2),
            "updated_at": now,
        },
    ]

    await db["Users"].delete_many({})
    await db["Users"].insert_many(users)
    print(f"Seeded {len(users)} users (including store admin).")

    # 4. SEED ORDERS & ORDER ITEMS
    orders = []
    order_items_list = []
    order_seq = 1001

    cities = [
        ("Chennai", "Tamil Nadu", "600028"),
        ("Madurai", "Tamil Nadu", "625001"),
        ("Coimbatore", "Tamil Nadu", "641001"),
        ("Sivakasi", "Tamil Nadu", "626123"),
        ("Tiruchirappalli", "Tamil Nadu", "620001"),
        ("Salem", "Tamil Nadu", "636001"),
        ("Bengaluru", "Karnataka", "560001"),
        ("Hyderabad", "Telangana", "500001"),
    ]

    bundles = [
        [("660000000000000000000111", 1, 2499.0), ("660000000000000000000108", 1, 950.0)],
        [("660000000000000000000112", 1, 4999.0)],
        [("660000000000000000000108", 2, 950.0), ("660000000000000000000104", 3, 190.0)],
        [("660000000000000000000109", 1, 1850.0), ("660000000000000000000113", 2, 180.0)],
        [("660000000000000000000111", 2, 2499.0), ("660000000000000000000106", 4, 140.0)],
        [("660000000000000000000101", 5, 85.0), ("660000000000000000000106", 5, 140.0)],
        [("660000000000000000000115", 3, 280.0), ("660000000000000000000116", 5, 60.0)],
        [("660000000000000000000108", 4, 950.0), ("660000000000000000000109", 2, 1850.0)],
        [("660000000000000000000112", 1, 4999.0), ("660000000000000000000111", 1, 2499.0)],
    ]

    customer_users = users[2:]
    random.seed(42)

    # 36 Past Orders (days 29 to 1)
    for day in range(29, 0, -1):
        num_orders_that_day = 1 if day % 3 != 0 else 2
        for _ in range(num_orders_that_day):
            order_seq += 1
            cust = random.choice(customer_users)
            bndl = random.choice(bundles)
            city, state, pin = random.choice(cities)

            subtotal = sum(q * p for _, q, p in bndl)
            gst = round(subtotal * 0.18, 2)
            total = round(subtotal + gst, 2)

            if day > 8:
                ostatus = "Delivered"
                pstatus = "Paid"
            elif day > 2:
                ostatus = random.choice(["Delivered", "Shipped"])
                pstatus = "Paid"
            else:
                ostatus = random.choice(["Shipped", "Confirmed"])
                pstatus = "Paid"

            order_date = now - timedelta(days=day, hours=random.randint(1, 12), minutes=random.randint(1, 59))
            order_id = ObjectId()

            order_doc = {
                "_id": order_id,
                "order_number": f"ORD-2026-{order_seq}",
                "user_id": cust["_id"],
                "subtotal": subtotal,
                "discount": 0.0,
                "coupon_code": None,
                "coupon_discount": 0.0,
                "shipping": 0.0,
                "tax": gst,
                "total": total,
                "payment_method": random.choice(["UPI (GPay)", "PhonePe", "Credit Card", "Net Banking"]),
                "payment_status": pstatus,
                "order_status": ostatus,
                "shipping_address": f"{cust['full_name']}, 14 Anna Salai, {city}, {state} - {pin}",
                "delivery_method": "ONLINE_DELIVERY",
                "created_at": order_date,
                "updated_at": order_date,
                "status": "active",
                "customer_deleted_at": None,
                "admin_deleted_at": None,
            }
            orders.append(order_doc)

            for pid, qty, unit_price in bndl:
                order_items_list.append({
                    "_id": ObjectId(),
                    "order_id": order_id,
                    "product_id": ObjectId(pid),
                    "quantity": qty,
                    "price": unit_price,
                    "created_at": order_date,
                    "updated_at": order_date,
                    "status": "active",
                })

    # 6 Orders for TODAY (Ensures rich Today's Revenue & Orders!)
    today_schedule = [
        (bundles[0], "Confirmed", "Paid", 9),
        (bundles[1], "Confirmed", "Paid", 10),
        (bundles[4], "Shipped", "Paid", 11),
        (bundles[7], "Confirmed", "Paid", 12),
        (bundles[2], "Pending", "Pending", 13),  # Pending for admin action
        (bundles[5], "Pending", "Pending", 14),  # Pending for admin action
    ]

    for bndl, o_stat, p_stat, hr in today_schedule:
        order_seq += 1
        cust = random.choice(customer_users)
        city, state, pin = random.choice(cities)

        subtotal = sum(q * p for _, q, p in bndl)
        gst = round(subtotal * 0.18, 2)
        total = round(subtotal + gst, 2)

        order_date = today_start + timedelta(hours=hr, minutes=random.randint(5, 50))
        order_id = ObjectId()

        order_doc = {
            "_id": order_id,
            "order_number": f"ORD-2026-{order_seq}",
            "user_id": cust["_id"],
            "subtotal": subtotal,
            "discount": 0.0,
            "coupon_code": "DIWALI2026" if hr == 10 else None,
            "coupon_discount": 250.0 if hr == 10 else 0.0,
            "shipping": 0.0,
            "tax": gst,
            "total": total - (250.0 if hr == 10 else 0.0),
            "payment_method": "UPI (Google Pay)" if p_stat == "Paid" else "Payment Pending",
            "payment_status": p_stat,
            "order_status": o_stat,
            "shipping_address": f"{cust['full_name']}, 28 Gandhi Nagar, {city}, {state} - {pin}",
            "delivery_method": "ONLINE_DELIVERY",
            "created_at": order_date,
            "updated_at": order_date,
            "status": "active",
            "customer_deleted_at": None,
            "admin_deleted_at": None,
        }
        orders.append(order_doc)

        for pid, qty, unit_price in bndl:
            order_items_list.append({
                "_id": ObjectId(),
                "order_id": order_id,
                "product_id": ObjectId(pid),
                "quantity": qty,
                "price": unit_price,
                "created_at": order_date,
                "updated_at": order_date,
                "status": "active",
            })

    await db["Orders"].delete_many({})
    await db["Orders"].insert_many(orders)
    print(f"Seeded {len(orders)} orders.")

    await db["OrderItems"].delete_many({})
    await db["OrderItems"].insert_many(order_items_list)
    print(f"Seeded {len(order_items_list)} order items.")

    # 5. SEED COUPONS
    coupons = [
        {
            "_id": ObjectId("660000000000000000000301"),
            "coupon_code": "DIWALI2026",
            "discount_type": "percentage",
            "percentage": 25,
            "minimum_order": 1500.0,
            "max_discount": 1000.0,
            "usage_limit": 100,
            "used_count": 28,
            "is_active": True,
            "valid_from": now - timedelta(days=30),
            "valid_until": now + timedelta(days=60),
            "created_at": now - timedelta(days=30),
            "updated_at": now,
        },
        {
            "_id": ObjectId("660000000000000000000302"),
            "coupon_code": "MEERA100",
            "discount_type": "fixed",
            "fixed_amount": 100.0,
            "minimum_order": 999.0,
            "usage_limit": 500,
            "used_count": 94,
            "is_active": True,
            "valid_from": now - timedelta(days=30),
            "valid_until": now + timedelta(days=90),
            "created_at": now - timedelta(days=30),
            "updated_at": now,
        },
        {
            "_id": ObjectId("660000000000000000000303"),
            "coupon_code": "FESTIVE500",
            "discount_type": "fixed",
            "fixed_amount": 500.0,
            "minimum_order": 3500.0,
            "usage_limit": 50,
            "used_count": 18,
            "is_active": True,
            "valid_from": now - timedelta(days=30),
            "valid_until": now + timedelta(days=30),
            "created_at": now - timedelta(days=30),
            "updated_at": now,
        },
    ]

    await db["Coupons"].delete_many({})
    await db["Coupons"].insert_many(coupons)
    print(f"Seeded {len(coupons)} promo coupons.")

    # 6. SEED REVIEWS
    reviews = [
        {
            "_id": ObjectId(),
            "product_id": ObjectId("660000000000000000000108"),
            "user_id": users[2]["_id"],
            "user_name": "Priya Sharma",
            "rating": 5,
            "comment": "The 30-shot repeater was the highlight of our Diwali night! Authentic Sivakasi quality and stunning colors.",
            "status": "approved",
            "created_at": now - timedelta(days=12),
            "updated_at": now - timedelta(days=12),
        },
        {
            "_id": ObjectId(),
            "product_id": ObjectId("660000000000000000000111"),
            "user_id": users[3]["_id"],
            "user_name": "Karthik Raja",
            "rating": 5,
            "comment": "Grand Festival Box arrived safely packaged in moisture-proof cartons. Everything from sparklers to multi-shots worked 100%.",
            "status": "approved",
            "created_at": now - timedelta(days=8),
            "updated_at": now - timedelta(days=8),
        },
        {
            "_id": ObjectId(),
            "product_id": ObjectId("660000000000000000000104"),
            "user_id": users[4]["_id"],
            "user_name": "Ananya Iyer",
            "rating": 5,
            "comment": "Flower pots gave a brilliant, tall shower of gold embers. Very low smoke, safe and delightful for the family.",
            "status": "approved",
            "created_at": now - timedelta(days=4),
            "updated_at": now - timedelta(days=4),
        },
    ]

    await db["Reviews"].delete_many({})
    await db["Reviews"].insert_many(reviews)
    print(f"Seeded {len(reviews)} product reviews.")

    paid_orders = [o for o in orders if o["payment_status"] == "Paid"]
    total_rev = sum(o["total"] for o in paid_orders)
    today_paid = [o for o in paid_orders if o["created_at"] >= today_start]
    today_rev = sum(o["total"] for o in today_paid)

    print("\n" + "=" * 55)
    print("DEMO SEEDING COMPLETED SUCCESSFULLY!")
    print(f"- Total Users:     {len(users)} (2 Admins, 10 Customers)")
    print(f"- Categories:      {len(categories)}")
    print(f"- Products:        {len(products)} (with Bestsellers & Low Stock alerts)")
    print(f"- Total Orders:    {len(orders)} ({len(paid_orders)} Paid, {len(orders) - len(paid_orders)} Pending)")
    print(f"- Total Revenue:   Rs. {total_rev:,.2f}")
    print(f"- Today's Revenue: Rs. {today_rev:,.2f} across {len(today_paid)} orders")
    print(f"- Admin Login:     email: {os.getenv('DEMO_ADMIN_EMAIL', 'admin@cloudcrackers.com')}  password: {demo_admin_pw}")
    print("=" * 55)

if __name__ == "__main__":
    asyncio.run(seed())
