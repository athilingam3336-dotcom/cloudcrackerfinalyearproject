# 🧨 CloudCrackers — Phase 11: Product Catalog Documentation

Comprehensive architecture, data models, inventory links, image mappings, and verification report for the real Sivakasi crackers product catalog.

---

## 1. Product Catalog Structure

The CloudCrackers product catalog represents authentic Sivakasi pyrotechnic products categorized by celebration type, ignition mechanics, and altitude scale.

```
Categories (10 Core Sivakasi Pyrotechnic Categories)
   └── Products (20 Real Sivakasi Crackers)
         ├── Pricing (Sensible Indian Rupees: ₹70.00 – ₹4,999.00)
         ├── Stock Quantity & SKU Link
         ├── Real Stitch Photography (/images/)
         └── Inventory (1:1 Beanie ODM Record with Stock History)
```

---

## 2. Categories

| Category ID (Hex) | Name | Description | Image Asset |
|---|---|---|---|
| `660000000000000000000001` | **Sparklers** | Safe, dazzling hand-held wire sparklers in gold, silver, and rainbow sparkle. | `electric_sparklers.png` |
| `660000000000000000000002` | **Flower Pots** | Ground fountains that erupt into towering columns of golden glitter and color flame. | `flower_pot_fireworks.png` |
| `660000000000000000000003` | **Ground Chakkars** | Whirling ground spinners and circular chakri wheels with continuous golden rings. | `ground_chakkars_spinners.png` |
| `660000000000000000000004` | **Rockets** | Aerodynamic altitude rockets designed for high skyward flight and roaring ascent. | `rockets_fireworks.png` |
| `660000000000000000000005` | **Atom Bombs** | Heavy sound crackers tightly bound with jute cord, delivering deep bass concussions. | `atom_bomb_cracker.png` |
| `660000000000000000000006` | **Bijili Crackers** | Traditional micro-crackers in continuous red strips for rhythmic festive bursts. | `atom_bomb_cracker.png` |
| `660000000000000000000007` | **Fancy Aerials** | Multi-tube aerial display cakes and synchronized sky barrages (7, 30, 60 shots). | `30_shots_multi_shot_fireworks.png` |
| `660000000000000000000008` | **Sound Crackers** | High-decibel single and multi-shot salute sound crackers. | `atom_bomb_cracker.png` |
| `660000000000000000000009` | **Kids Crackers** | Low-smoke novelty fireworks including twinkling star pencils and color combos. | `pencil_crackers_roman_candles.png` |
| `660000000000000000000010` | **Gift Boxes** | Comprehensive family assortment celebration hampers (25–45+ items). | `grand_festival_gift_box.png` |

---

## 3. Product Data Model

Defined in `backend/app/models/product.py` and serialized via `backend/app/schemas/product.py`:

```python
class Product(Document):
    name: Indexed(str)
    description: str
    price: float                           # In Indian Rupees (₹)
    discount_price: Optional[float] = None # Strictly < price
    category_id: Indexed(PydanticObjectId) # Foreign Key -> Categories._id
    stock: int                             # Non-negative integer
    images: List[str]                      # Real local Stitch asset filename
    rating: float = 0.0
    reviews_count: int = 0
    average_rating: float = 0.0
    total_reviews: int = 0
    rating_breakdown: dict = Field(default_factory=lambda: {"5": 0, "4": 0, "3": 0, "2": 0, "1": 0})
    is_featured: bool = False
    is_bestseller: bool = False
    is_flash_sale: bool = False
    is_recommended: bool = False
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "active"
```

---

## 4. Inventory Relationship

Defined in `backend/app/models/inventory.py`:

* Every active `Product` in MongoDB has a corresponding `Inventory` document linked via `product_id == Product._id`.
* Tracks `current_stock`, `minimum_stock` (threshold for low-stock alerts), `maximum_stock`, and transaction audit `history`:

```python
class Inventory(Document):
    product_id: Indexed(PydanticObjectId, unique=True)
    current_stock: int
    minimum_stock: int = 5
    maximum_stock: int = 1000
    last_updated: datetime
    history: List[InventoryHistory] = [
        {
            "transaction_type": "IN",
            "quantity": stock,
            "old_stock": 0,
            "new_stock": stock,
            "remarks": "Sivakasi Catalog Ingestion",
            "created_by": "system_admin",
            "created_at": datetime
        }
    ]
```

---

## 5. Image Mapping

All 8 high-resolution (1024 × 1024 px) Stitch product photographs located in `/home/athi/cloudcrackers/images/` are mapped 100% cleanly:

| Image File | Category | Representative Products |
|---|---|---|
| `electric_sparklers.png` | Sparklers | Electric Sparkler, Color Sparkler, Gold Sparkler Deluxe |
| `flower_pot_fireworks.png` | Flower Pots | Flower Pot Small, Flower Pot Big, Dragon's Breath Fountain |
| `ground_chakkars_spinners.png` | Ground Chakkars | Ground Chakkar, Spinner Chakkar Deluxe, Whistling Spinner |
| `rockets_fireworks.png` | Rockets | Rocket Classic, Whistling Rocket, Solar Flare Rockets |
| `atom_bomb_cracker.png` | Atom Bombs / Bijili / Sound | Atom Bomb, Bijili String, Thunder Sound Crackers |
| `pencil_crackers_roman_candles.png` | Twinkling Stars / Kids | Twinkling Stars Pencil, Celestial Roman Candle |
| `30_shots_multi_shot_fireworks.png` | Fancy Aerials | Fancy Aerial Shot, 7 Shot Repeater, 30 Shot Sky Barrage, 60 Shot Cake |
| `grand_festival_gift_box.png` | Gift Boxes / Combos | Kids Crackers Combo, Festival Crackers Box, Deluxe Gift Box |

---

## 6. MongoDB Collections (`cloudcrackers`)

* **`Categories`**: 10 documents
* **`Products`**: 20 documents
* **`Inventory`**: 20 documents
* **`Images`**: Document image registry for storage metadata
* **`Users` / `Orders` / `Cart` / `Wishlist`**: Preserved with zero data loss.

---

## 7. Seed Process

Idempotent seed script located at `backend/scripts/seed_products.py`:

```bash
cd ~/cloudcrackers/backend
.venv/bin/python scripts/seed_products.py
```

* Connects via `settings.MONGODB_URL` and `settings.DB_NAME`.
* Upserts 10 Categories and 20 Products using deterministic `_id` values.
* Creates/updates matching `Inventory` records and stock transaction history.
* Safe to run multiple times without creating duplicates.

---

## 8. API Flow

```
GET /api/v1/categories
   └── Returns active categories with image_url, description, and status.

GET /api/v1/products?limit=50&category_id={id}&search={term}
   └── Returns paginated Sivakasi products with real stock, pricing (₹), and image references.

GET /api/v1/products/{product_id}
   └── Returns single product document with full rating breakdown and details.
```

---

## 9. Frontend Flow

```
HomeScreen / ProductListingScreen / CategoriesScreen
   └── productService.getProducts(category, search)
         └── axios GET http://127.0.0.1:8000/api/v1/products
               └── FastAPI ProductService
                     └── MongoDB 'Products' collection
                           └── ProductCard / Details UI (with Indian Rupee '₹' formatting & Stitch images)
```

---

## 10. Verification Results

| Verification Check | Status | Evidence |
|---|---|---|
| Category Count | **10** | Verified via `GET /api/v1/categories` |
| Product Count | **20** | Verified via `GET /api/v1/products?limit=50` |
| Inventory Records | **20** | 1:1 mapped to product ObjectIds in MongoDB |
| Image Mappings | **8 / 8 (100%)** | Local Stitch assets rendered on Web & Native |
| Products Without Category | **0** | All reference valid Category ObjectIds |
| Products Without Images | **0** | All reference valid local image assets |
| Products Without Inventory | **0** | Every product has an Inventory record |
| Duplicate Categories/Products | **0** | Cleaned and deduplicated |

---

## 11. Test Results

* **Backend Pytest**:
  ```bash
  cd ~/cloudcrackers/backend
  PYTHONPATH=. .venv/bin/pytest -q
  ```
  **Result**: `70 passed in 8.13s` (100% passing).

* **Frontend TypeScript Check**:
  ```bash
  cd ~/cloudcrackers/frontend
  npx tsc --noEmit
  ```
  **Result**: `0 errors` (Clean compilation).
