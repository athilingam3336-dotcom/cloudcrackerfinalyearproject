"""
Database Seeding Script for CloudCrackers
Seeds 8 real Sivakasi Categories and 16 real Sivakasi Products linked to local Stitch images.
"""

import asyncio
import json
import os
import sys
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def seed_database():
    from app.core.config import settings
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client['cloudcrackers']

    # 1. Backup current data
    os.makedirs('/home/athi/cloudcrackers/backend/data_backup', exist_ok=True)
    existing_prods = []
    async for p in db['Products'].find({}):
        p['_id'] = str(p['_id'])
        if 'category_id' in p:
            p['category_id'] = str(p['category_id'])
        if 'created_at' in p and isinstance(p['created_at'], datetime):
            p['created_at'] = p['created_at'].isoformat()
        if 'updated_at' in p and isinstance(p['updated_at'], datetime):
            p['updated_at'] = p['updated_at'].isoformat()
        existing_prods.append(p)

    with open('/home/athi/cloudcrackers/backend/data_backup/products_backup.json', 'w') as f:
        json.dump(existing_prods, f, indent=2)
    print(f'Backed up {len(existing_prods)} products to products_backup.json')

    # 2. Clean test placeholders
    await db['Products'].delete_many({'name': 'Super Phone'})
    await db['Categories'].delete_many({'name': 'Electronics'})
    await db['Inventory'].delete_many({})

    # 3. Create Sivakasi Categories
    now = datetime.now(timezone.utc)
    categories_data = [
        {
            '_id': ObjectId('660000000000000000000001'),
            'name': 'Sparklers',
            'description': 'Dazzling hand-held wire sparklers in gold, silver, and multi-color sparkle for weddings, Diwali, and celebrations.',
            'image_url': 'electric_sparklers.png',
            'is_active': True,
            'created_at': now,
            'updated_at': now,
            'status': 'active'
        },
        {
            '_id': ObjectId('660000000000000000000002'),
            'name': 'Flower Pots',
            'description': 'Show-stopping ground fountains that erupt in towering showers of golden sparks, multi-color flame, and whistling silver spray.',
            'image_url': 'flower_pot_fireworks.png',
            'is_active': True,
            'created_at': now,
            'updated_at': now,
            'status': 'active'
        },
        {
            '_id': ObjectId('660000000000000000000003'),
            'name': 'Ground Chakkars',
            'description': 'Whirling circular ground spinners and chakri wheels producing mesmerizing golden rings and emerald sparks.',
            'image_url': 'ground_chakkars_spinners.png',
            'is_active': True,
            'created_at': now,
            'updated_at': now,
            'status': 'active'
        },
        {
            '_id': ObjectId('660000000000000000000004'),
            'name': 'Rockets',
            'description': 'Aerodynamic altitude rockets shooting skyward with roaring thunder and brilliant parachute or glitter finales.',
            'image_url': 'rockets_fireworks.png',
            'is_active': True,
            'created_at': now,
            'updated_at': now,
            'status': 'active'
        },
        {
            '_id': ObjectId('660000000000000000000005'),
            'name': 'Atom Bombs',
            'description': 'High-decibel heavy sound crackers, hydro bombs, and display mortar canister shells engineered in Sivakasi.',
            'image_url': 'atom_bomb_cracker.png',
            'is_active': True,
            'created_at': now,
            'updated_at': now,
            'status': 'active'
        },
        {
            '_id': ObjectId('660000000000000000000006'),
            'name': 'Twinkling Stars',
            'description': 'Multi-shot repeater candles and slender twinkling star pencils ejecting repeating spheres of vibrant neon fire.',
            'image_url': 'pencil_crackers_roman_candles.png',
            'is_active': True,
            'created_at': now,
            'updated_at': now,
            'status': 'active'
        },
        {
            '_id': ObjectId('660000000000000000000007'),
            'name': 'Fancy Shots',
            'description': 'Multi-tube aerial display cakes and rapid-fire barrages creating sky-filling synchronized firework shows.',
            'image_url': '30_shots_multi_shot_fireworks.png',
            'is_active': True,
            'created_at': now,
            'updated_at': now,
            'status': 'active'
        },
        {
            '_id': ObjectId('660000000000000000000008'),
            'name': 'Gift Boxes',
            'description': 'Comprehensive festival gift boxes and family assortment packages containing an all-in-one variety of Sivakasi pyrotechnics.',
            'image_url': 'grand_festival_gift_box.png',
            'is_active': True,
            'created_at': now,
            'updated_at': now,
            'status': 'active'
        }
    ]

    for cat in categories_data:
        cat_set = {k: v for k, v in cat.items() if k != '_id'}
        await db['Categories'].update_one(
            {'name': cat['name']},
            {'$set': cat_set, '$setOnInsert': {'_id': cat['_id']}},
            upsert=True,
        )
    print(f'Upserted {len(categories_data)} categories.')

    # 4. Products Data
    products_data = [
        # Sparklers
        {
            '_id': ObjectId('660000000000000000000101'),
            'name': 'Electric Sparklers Deluxe Pack (50 Pcs)',
            'description': 'Premium long-burning electric gold and silver wire sparklers designed for weddings, family parties, and Diwali celebrations.',
            'price': 250.0,
            'discount_price': None,
            'category_id': ObjectId('660000000000000000000001'),
            'stock': 150,
            'images': ['electric_sparklers.png'],
            'rating': 4.9,
            'reviews_count': 94,
            'average_rating': 4.9,
            'total_reviews': 94,
            'rating_breakdown': {'5': 85, '4': 9, '3': 0, '2': 0, '1': 0},
            'is_featured': True,
            'is_bestseller': True,
            'is_flash_sale': False,
            'is_recommended': True,
            'is_active': True,
            'created_at': now,
            'updated_at': now,
            'status': 'active'
        },
        {
            '_id': ObjectId('660000000000000000000102'),
            'name': 'Starlight Pearl Color Sparklers (30 Pcs)',
            'description': 'Vibrant multi-colored sparklers with dense crystalline sparkle and cool burning spark emissions.',
            'price': 180.0,
            'discount_price': 150.0,
            'category_id': ObjectId('660000000000000000000001'),
            'stock': 80,
            'images': ['electric_sparklers.png'],
            'rating': 4.8,
            'reviews_count': 46,
            'average_rating': 4.8,
            'total_reviews': 46,
            'rating_breakdown': {'5': 38, '4': 8, '3': 0, '2': 0, '1': 0},
            'is_featured': False,
            'is_bestseller': False,
            'is_flash_sale': False,
            'is_recommended': True,
            'is_active': True,
            'created_at': now,
            'updated_at': now,
            'status': 'active'
        },
        # Flower Pots
        {
            '_id': ObjectId('660000000000000000000103'),
            'name': "Dragon's Breath Ground Fountain",
            'description': 'Continuous multi-color fountain erupting up to 15 feet high with brilliant silver crackling rain and emerald embers.',
            'price': 450.0,
            'discount_price': 380.0,
            'category_id': ObjectId('660000000000000000000002'),
            'stock': 65,
            'images': ['flower_pot_fireworks.png'],
            'rating': 4.8,
            'reviews_count': 142,
            'average_rating': 4.8,
            'total_reviews': 142,
            'rating_breakdown': {'5': 120, '4': 20, '3': 2, '2': 0, '1': 0},
            'is_featured': True,
            'is_bestseller': False,
            'is_flash_sale': True,
            'is_recommended': True,
            'is_active': True,
            'created_at': now,
            'updated_at': now,
            'status': 'active'
        },
        {
            '_id': ObjectId('660000000000000000000104'),
            'name': 'Aanar Special Tri-Color Flower Pots (5 Pcs)',
            'description': 'Traditional giant Sivakasi flower pots with 3-stage colored bursts changing from crimson to gold to green.',
            'price': 320.0,
            'discount_price': None,
            'category_id': ObjectId('660000000000000000000002'),
            'stock': 90,
            'images': ['flower_pot_fireworks.png'],
            'rating': 4.7,
            'reviews_count': 65,
            'average_rating': 4.7,
            'total_reviews': 65,
            'rating_breakdown': {'5': 50, '4': 13, '3': 2, '2': 0, '1': 0},
            'is_featured': False,
            'is_bestseller': False,
            'is_flash_sale': False,
            'is_recommended': False,
            'is_active': True,
            'created_at': now,
            'updated_at': now,
            'status': 'active'
        },
        # Ground Chakkars
        {
            '_id': ObjectId('660000000000000000000105'),
            'name': 'Deluxe Ground Chakkars (10 Pcs Box)',
            'description': 'High-speed spinning ground chakkars creating wide rings of golden glitter and radiant spark circles.',
            'price': 280.0,
            'discount_price': 220.0,
            'category_id': ObjectId('660000000000000000000003'),
            'stock': 120,
            'images': ['ground_chakkars_spinners.png'],
            'rating': 4.9,
            'reviews_count': 118,
            'average_rating': 4.9,
            'total_reviews': 118,
            'rating_breakdown': {'5': 105, '4': 13, '3': 0, '2': 0, '1': 0},
            'is_featured': False,
            'is_bestseller': True,
            'is_flash_sale': False,
            'is_recommended': True,
            'is_active': True,
            'created_at': now,
            'updated_at': now,
            'status': 'active'
        },
        {
            '_id': ObjectId('660000000000000000000106'),
            'name': 'Whistling Zamin Spinner Wheel',
            'description': 'Acoustic novelty ground spinner emitting dynamic high-pitch whistle and spinning jade green fire rings.',
            'price': 350.0,
            'discount_price': None,
            'category_id': ObjectId('660000000000000000000003'),
            'stock': 45,
            'images': ['ground_chakkars_spinners.png'],
            'rating': 4.7,
            'reviews_count': 52,
            'average_rating': 4.7,
            'total_reviews': 52,
            'rating_breakdown': {'5': 40, '4': 10, '3': 2, '2': 0, '1': 0},
            'is_featured': False,
            'is_bestseller': False,
            'is_flash_sale': False,
            'is_recommended': False,
            'is_active': True,
            'created_at': now,
            'updated_at': now,
            'status': 'active'
        },
        # Rockets
        {
            '_id': ObjectId('660000000000000000000107'),
            'name': 'Solar Flare Sky Rockets (10 Pcs Pack)',
            'description': 'Professional grade display sky rockets soaring 200 feet high with loud screaming ascent and golden willow burst.',
            'price': 799.0,
            'discount_price': 699.0,
            'category_id': ObjectId('660000000000000000000004'),
            'stock': 40,
            'images': ['rockets_fireworks.png'],
            'rating': 4.9,
            'reviews_count': 128,
            'average_rating': 4.9,
            'total_reviews': 128,
            'rating_breakdown': {'5': 115, '4': 13, '3': 0, '2': 0, '1': 0},
            'is_featured': True,
            'is_bestseller': True,
            'is_flash_sale': False,
            'is_recommended': True,
            'is_active': True,
            'created_at': now,
            'updated_at': now,
            'status': 'active'
        },
        {
            '_id': ObjectId('660000000000000000000108'),
            'name': 'Supernova Altitude Rocket Box (5 Pcs)',
            'description': 'Heavy payload high altitude rockets bursting into huge multi-color peony shells with crackling centers.',
            'price': 650.0,
            'discount_price': None,
            'category_id': ObjectId('660000000000000000000004'),
            'stock': 35,
            'images': ['rockets_fireworks.png'],
            'rating': 4.8,
            'reviews_count': 98,
            'average_rating': 4.8,
            'total_reviews': 98,
            'rating_breakdown': {'5': 82, '4': 14, '3': 2, '2': 0, '1': 0},
            'is_featured': False,
            'is_bestseller': False,
            'is_flash_sale': True,
            'is_recommended': False,
            'is_active': True,
            'created_at': now,
            'updated_at': now,
            'status': 'active'
        },
        # Atom Bombs
        {
            '_id': ObjectId('660000000000000000000109'),
            'name': 'Hydro Green Atom Bomb (10 Pcs Box)',
            'description': 'Authentic Sivakasi loud sound cracker tightly bound with green jute cord delivering powerful bass concussion.',
            'price': 350.0,
            'discount_price': 299.0,
            'category_id': ObjectId('660000000000000000000005'),
            'stock': 75,
            'images': ['atom_bomb_cracker.png'],
            'rating': 4.9,
            'reviews_count': 160,
            'average_rating': 4.9,
            'total_reviews': 160,
            'rating_breakdown': {'5': 145, '4': 15, '3': 0, '2': 0, '1': 0},
            'is_featured': False,
            'is_bestseller': True,
            'is_flash_sale': False,
            'is_recommended': True,
            'is_active': True,
            'created_at': now,
            'updated_at': now,
            'status': 'active'
        },
        {
            '_id': ObjectId('660000000000000000000110'),
            'name': 'Midnight Fury Aerial Shells Box',
            'description': '6-inch professional canister display shells with thunderous acoustic sound and deep midnight star bursts.',
            'price': 1650.0,
            'discount_price': 1250.0,
            'category_id': ObjectId('660000000000000000000005'),
            'stock': 25,
            'images': ['atom_bomb_cracker.png'],
            'rating': 5.0,
            'reviews_count': 128,
            'average_rating': 5.0,
            'total_reviews': 128,
            'rating_breakdown': {'5': 128, '4': 0, '3': 0, '2': 0, '1': 0},
            'is_featured': True,
            'is_bestseller': False,
            'is_flash_sale': False,
            'is_recommended': True,
            'is_active': True,
            'created_at': now,
            'updated_at': now,
            'status': 'active'
        },
        # Twinkling Stars / Roman Candles
        {
            '_id': ObjectId('660000000000000000000111'),
            'name': 'Twinkling Star Pencil Crackers (20 Pcs)',
            'description': 'Slender sparkling pencil tubes releasing continuous twinkling starlight flashes and gentle crackles.',
            'price': 190.0,
            'discount_price': 150.0,
            'category_id': ObjectId('660000000000000000000006'),
            'stock': 110,
            'images': ['pencil_crackers_roman_candles.png'],
            'rating': 4.7,
            'reviews_count': 72,
            'average_rating': 4.7,
            'total_reviews': 72,
            'rating_breakdown': {'5': 55, '4': 15, '3': 2, '2': 0, '1': 0},
            'is_featured': False,
            'is_bestseller': False,
            'is_flash_sale': False,
            'is_recommended': False,
            'is_active': True,
            'created_at': now,
            'updated_at': now,
            'status': 'active'
        },
        {
            '_id': ObjectId('660000000000000000000112'),
            'name': 'Celestial 10-Shot Roman Candle (4 Pcs)',
            'description': '10-shot multi-color repeating candles firing radiant ruby red, cobalt blue, and golden stars into the night.',
            'price': 420.0,
            'discount_price': 350.0,
            'category_id': ObjectId('660000000000000000000006'),
            'stock': 50,
            'images': ['pencil_crackers_roman_candles.png'],
            'rating': 4.8,
            'reviews_count': 76,
            'average_rating': 4.8,
            'total_reviews': 76,
            'rating_breakdown': {'5': 64, '4': 10, '3': 2, '2': 0, '1': 0},
            'is_featured': False,
            'is_bestseller': False,
            'is_flash_sale': False,
            'is_recommended': True,
            'is_active': True,
            'created_at': now,
            'updated_at': now,
            'status': 'active'
        },
        # Fancy Shots & 30-Shots
        {
            '_id': ObjectId('660000000000000000000113'),
            'name': '30-Shots Grand Finale Sky Barrage Cake',
            'description': 'Spectacular 30-shot rapid fire aerial cake display with gold brocade willows, color peony stars, and crackling finale.',
            'price': 1850.0,
            'discount_price': 1499.0,
            'category_id': ObjectId('660000000000000000000007'),
            'stock': 30,
            'images': ['30_shots_multi_shot_fireworks.png'],
            'rating': 5.0,
            'reviews_count': 210,
            'average_rating': 5.0,
            'total_reviews': 210,
            'rating_breakdown': {'5': 205, '4': 5, '3': 0, '2': 0, '1': 0},
            'is_featured': True,
            'is_bestseller': True,
            'is_flash_sale': False,
            'is_recommended': True,
            'is_active': True,
            'created_at': now,
            'updated_at': now,
            'status': 'active'
        },
        {
            '_id': ObjectId('660000000000000000000114'),
            'name': 'Crimson Sovereign 120-Shots Display Finale Box',
            'description': 'Large-scale 120-shot celebration cake engineered for grand weddings and festival celebrations with synchronized sky choreography.',
            'price': 3499.0,
            'discount_price': 2999.0,
            'category_id': ObjectId('660000000000000000000007'),
            'stock': 15,
            'images': ['30_shots_multi_shot_fireworks.png'],
            'rating': 5.0,
            'reviews_count': 310,
            'average_rating': 5.0,
            'total_reviews': 310,
            'rating_breakdown': {'5': 310, '4': 0, '3': 0, '2': 0, '1': 0},
            'is_featured': True,
            'is_bestseller': False,
            'is_flash_sale': False,
            'is_recommended': True,
            'is_active': True,
            'created_at': now,
            'updated_at': now,
            'status': 'active'
        },
        # Gift Boxes
        {
            '_id': ObjectId('660000000000000000000115'),
            'name': 'Grand Festival Celebration Gift Box (32 Items)',
            'description': 'All-in-one family assortment gift hamper packed with electric sparklers, giant aanars, deluxe chakkars, rockets, and pencil candles.',
            'price': 2499.0,
            'discount_price': 1999.0,
            'category_id': ObjectId('660000000000000000000008'),
            'stock': 50,
            'images': ['grand_festival_gift_box.png'],
            'rating': 4.9,
            'reviews_count': 188,
            'average_rating': 4.9,
            'total_reviews': 188,
            'rating_breakdown': {'5': 175, '4': 13, '3': 0, '2': 0, '1': 0},
            'is_featured': True,
            'is_bestseller': True,
            'is_flash_sale': False,
            'is_recommended': True,
            'is_active': True,
            'created_at': now,
            'updated_at': now,
            'status': 'active'
        },
        {
            '_id': ObjectId('660000000000000000000116'),
            'name': 'Royal Sivakasi VIP Mega Hamper (55 Items)',
            'description': 'Ultimate luxury Diwali celebration box loaded with high-altitude aerial shots, ground fountains, repeating candles, and giant sound bombs.',
            'price': 4999.0,
            'discount_price': 4250.0,
            'category_id': ObjectId('660000000000000000000008'),
            'stock': 20,
            'images': ['grand_festival_gift_box.png'],
            'rating': 5.0,
            'reviews_count': 95,
            'average_rating': 5.0,
            'total_reviews': 95,
            'rating_breakdown': {'5': 95, '4': 0, '3': 0, '2': 0, '1': 0},
            'is_featured': True,
            'is_bestseller': False,
            'is_flash_sale': False,
            'is_recommended': True,
            'is_active': True,
            'created_at': now,
            'updated_at': now,
            'status': 'active'
        }
    ]

    for prod in products_data:
        await db['Products'].replace_one({'_id': prod['_id']}, prod, upsert=True)
        # Create Inventory document
        inv_doc = {
            'product_id': prod['_id'],
            'current_stock': prod['stock'],
            'minimum_stock': 5,
            'maximum_stock': 1000,
            'last_updated': now,
            'history': [
                {
                    'transaction_type': 'IN',
                    'quantity': prod['stock'],
                    'old_stock': 0,
                    'new_stock': prod['stock'],
                    'remarks': 'Initial Sivakasi Catalog Ingestion',
                    'created_by': 'system_admin',
                    'created_at': now
                }
            ]
        }
        await db['Inventory'].replace_one({'product_id': prod['_id']}, inv_doc, upsert=True)

    print(f'Successfully seeded {len(products_data)} products and {len(products_data)} inventory documents.')

    # 5. Seed Active Coupons
    coupons_data = [
        {
            'coupon_code': 'FESTIVAL20',
            'description': '20% Festive discount on Sivakasi crackers',
            'discount_type': 'percentage',
            'percentage': 20.0,
            'minimum_order': 100.0,
            'maximum_discount': 100.0,
            'expiry_date': now + timedelta(days=60),
            'usage_limit': 1000,
            'used_count': 0,
            'is_active': True,
            'status': 'active',
            'created_at': now,
            'updated_at': now,
        },
        {
            'coupon_code': 'FIREWORKS10',
            'description': '10% discount on all fireworks',
            'discount_type': 'percentage',
            'percentage': 10.0,
            'minimum_order': 50.0,
            'maximum_discount': 50.0,
            'expiry_date': now + timedelta(days=60),
            'usage_limit': 500,
            'used_count': 0,
            'is_active': True,
            'status': 'active',
            'created_at': now,
            'updated_at': now,
        },
        {
            'coupon_code': 'SPARK20',
            'description': '20% discount on sparklers & novelties',
            'discount_type': 'percentage',
            'percentage': 20.0,
            'minimum_order': 50.0,
            'maximum_discount': 100.0,
            'expiry_date': now + timedelta(days=60),
            'usage_limit': 500,
            'used_count': 0,
            'is_active': True,
            'status': 'active',
            'created_at': now,
            'updated_at': now,
        }
    ]

    for cp in coupons_data:
        await db['Coupons'].replace_one({'coupon_code': cp['coupon_code']}, cp, upsert=True)
    print(f'Upserted {len(coupons_data)} active coupons.')

    # 6. Seed Default Users
    from app.core.security import hash_password
    users_data = [
        {
            "email": "admin@example.com",
            "full_name": "Admin User",
            "phone": "+91 9999999999",
            "password_hash": hash_password("AdminPassword123!"),
            "role": "ADMIN",
            "is_verified": True,
            "is_active": True,
            "status": "active",
            "created_at": now,
            "updated_at": now,
        },
        {
            "email": "athi@gmail.com",
            "full_name": "Athi Lingam",
            "phone": "+91 9876543210",
            "password_hash": hash_password("Password123!"),
            "role": "CUSTOMER",
            "is_verified": True,
            "is_active": True,
            "status": "active",
            "created_at": now,
            "updated_at": now,
        },
        {
            "email": "customer@example.com",
            "full_name": "Customer User",
            "phone": "+91 9123456789",
            "password_hash": hash_password("Password123!"),
            "role": "CUSTOMER",
            "is_verified": True,
            "is_active": True,
            "status": "active",
            "created_at": now,
            "updated_at": now,
        }
    ]

    for u in users_data:
        await db['Users'].replace_one({'email': u['email']}, u, upsert=True)
    print(f'Upserted {len(users_data)} users.')

    # 7. Seed About Meera Crackers Content
    about_count = await db['About'].count_documents({})
    if about_count == 0:
        await db['About'].insert_one({
            "version": "v2.4.0",
            "description": "Meera Crackers World — Fireworks Wholesale & Retailer",
            "sections": [
                {
                    "title": "🎆 Who We Are",
                    "content": "Meera Crackers World is your premier platform for 100% legal, Sivakasi-manufactured green crackers and professional pyrotechnics. Happy & Safety Guarantee for all your festive celebrations."
                },
                {
                    "title": "📍 Contact & Store Location",
                    "content": "Email: Meeracrackers@gmail.com | Phone: 7339624431, 94421 72314, 96268 24431\nLic No: E/SC/TN/24/685 (E 54389)\nLocation: https://maps.app.goo.gl/6BE5qX4vxyutrkAD6?g_st=aw"
                },
                {
                    "title": "🛡️ Safe & Compliant",
                    "content": "All our products strictly adhere to Supreme Court safety norms and NEERI green cracker formulations with reduced emissions and zero harmful heavy metals."
                },
                {
                    "title": "🚚 Delivery & Availability",
                    "content": "All Days Available! Specially packaged in shock-resistant and moisture-proof containers to guarantee safe transport straight to your doorstep."
                }
            ],
            "created_at": now,
            "updated_at": now
        })
        print("Seeded default 'About' document.")
    else:
        print("About document already exists, skipping seeding.")

if __name__ == '__main__':
    asyncio.run(seed_database())
