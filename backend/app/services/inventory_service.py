from datetime import datetime
from typing import List, Optional

from app.exceptions import NotFoundException, ValidationException
from app.models.inventory import Inventory, InventoryHistory
from app.repositories.inventory_repository import InventoryRepository
from app.repositories.product_repository import ProductRepository
from app.schemas.inventory import InventoryAdjustRequest


class InventoryService:
    def __init__(self) -> None:
        self.inventory_repo = InventoryRepository()
        self.product_repo = ProductRepository()

    async def adjust_stock(self, user_id: str, data: InventoryAdjustRequest) -> Inventory:
        """Executes a stock adjustment transaction, adds history log, and syncs to Product stock."""
        product = await self.product_repo.get_by_id(data.product_id)
        if not product or product.status == "deleted":
            raise NotFoundException(message="Product not found.")

        inventory = await self.inventory_repo.get_by_product_id(data.product_id)
        if not inventory:
            # Lazy initialize inventory document if missing
            inventory_data = {
                "product_id": product.id,
                "current_stock": product.stock,  # Default from product stock
                "minimum_stock": 5,
                "maximum_stock": 1000,
                "last_updated": datetime.utcnow(),
                "history": [],
            }
            inventory = await self.inventory_repo.create(inventory_data)

        old_stock = inventory.current_stock

        if data.transaction_type == "IN":
            new_stock = old_stock + data.quantity
        elif data.transaction_type == "OUT":
            new_stock = old_stock - data.quantity
            if new_stock < 0:
                raise ValidationException(
                    message=f"Insufficient stock. Cannot execute OUT transaction of quantity {data.quantity} when current stock is {old_stock}."
                )
        else:  # "ADJUST"
            new_stock = data.quantity

        if new_stock > inventory.maximum_stock:
            raise ValidationException(
                message=f"New stock total ({new_stock}) exceeds maximum allowed stock cap ({inventory.maximum_stock})."
            )

        # Create history entry
        log_entry = InventoryHistory(
            transaction_type=data.transaction_type,
            quantity=data.quantity,
            old_stock=old_stock,
            new_stock=new_stock,
            remarks=data.remarks,
            created_by=user_id,
            created_at=datetime.utcnow(),
        )

        # Append to embedded list
        inventory.history.append(log_entry)
        inventory.current_stock = new_stock
        inventory.last_updated = datetime.utcnow()

        # Save inventory document
        await inventory.save()

        # Synchronize back to the Product document
        await self.product_repo.update(product, {"stock": new_stock})

        return inventory

    async def get_inventory_by_product(self, product_id: str) -> Inventory:
        """Fetch current inventory status of a product, lazy initializing if missing."""
        product = await self.product_repo.get_by_id(product_id)
        if not product or product.status == "deleted":
            raise NotFoundException(message="Product not found.")

        inventory = await self.inventory_repo.get_by_product_id(product_id)
        if not inventory:
            inventory_data = {
                "product_id": product.id,
                "current_stock": product.stock,
                "minimum_stock": 5,
                "maximum_stock": 1000,
                "last_updated": datetime.utcnow(),
                "history": [],
            }
            inventory = await self.inventory_repo.create(inventory_data)

        return inventory

    async def get_inventory_history(self, product_id: str) -> List[InventoryHistory]:
        """Fetch all transaction logs of a product."""
        inventory = await self.get_inventory_by_product(product_id)
        return inventory.history

    async def get_low_stock_products(self) -> List[Inventory]:
        """Lists inventory documents where current stock falls below threshold."""
        return await self.inventory_repo.list_low_stock()

    async def get_out_of_stock_products(self) -> List[Inventory]:
        """Lists inventory documents with 0 stock."""
        return await self.inventory_repo.list_out_of_stock()

    async def get_inventory_overview(
        self,
        search: Optional[str] = None,
        status_filter: Optional[str] = None,
        category_id: Optional[str] = None,
        page: int = 1,
        limit: int = 10,
    ):
        """Returns aggregated summary metrics and paginated inventory item overviews."""
        from app.models.category import Category
        from app.models.product import Product

        # 1. Fetch active non-deleted products
        all_products = await Product.find(Product.status != "deleted").to_list()
        categories = await Category.find(Category.status != "deleted").to_list()
        cat_map = {str(c.id): c.name for c in categories}

        total_products = len(all_products)
        total_stock_units = sum(p.stock for p in all_products)
        low_stock_count = sum(1 for p in all_products if 0 < p.stock <= 5)
        out_of_stock_count = sum(1 for p in all_products if p.stock == 0)

        metrics = {
            "total_products": total_products,
            "total_stock_units": total_stock_units,
            "low_stock_count": low_stock_count,
            "out_of_stock_count": out_of_stock_count,
        }

        # 2. Filter products based on search, category_id, status_filter
        filtered = []
        for p in all_products:
            if search and search.strip():
                s = search.strip().lower()
                if s not in p.name.lower() and s not in (p.description or "").lower():
                    continue

            if category_id and category_id.lower() not in ["all", ""]:
                if str(p.category_id) != category_id:
                    continue

            if status_filter and status_filter.lower() not in ["all", ""]:
                sf = status_filter.lower()
                if sf == "in_stock" and p.stock <= 5:
                    continue
                elif sf == "low_stock" and not (0 < p.stock <= 5):
                    continue
                elif sf == "out_of_stock" and p.stock != 0:
                    continue

            filtered.append(p)

        filtered.sort(key=lambda x: x.created_at, reverse=True)

        total_matched = len(filtered)
        skip = (page - 1) * limit
        paginated_products = filtered[skip : skip + limit]

        items = []
        for p in paginated_products:
            if p.stock == 0:
                stock_status = "OUT_OF_STOCK"
            elif p.stock <= 5:
                stock_status = "LOW_STOCK"
            else:
                stock_status = "IN_STOCK"

            cat_name = cat_map.get(str(p.category_id), "Aerial Shells")

            items.append({
                "product_id": str(p.id),
                "name": p.name,
                "category_id": str(p.category_id),
                "category_name": cat_name,
                "price": p.price,
                "stock": p.stock,
                "minimum_stock": 5,
                "maximum_stock": 1000,
                "stock_status": stock_status,
                "images": p.images if isinstance(p.images, list) else [],
                "last_updated": p.updated_at or p.created_at,
            })

        return metrics, items, total_matched
