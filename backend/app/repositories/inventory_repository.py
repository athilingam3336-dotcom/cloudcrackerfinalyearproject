from typing import List, Optional
from beanie import PydanticObjectId

from app.models.inventory import Inventory


class InventoryRepository:
    async def create(self, inventory_data: dict) -> Inventory:
        """Insert a new Inventory document."""
        inventory = Inventory(**inventory_data)
        await inventory.insert()
        return inventory

    async def get_by_product_id(self, product_id: str) -> Optional[Inventory]:
        """Fetch the inventory document associated with a product ID."""
        try:
            pid = PydanticObjectId(product_id)
        except Exception:
            return None
        return await Inventory.find_one(Inventory.product_id == pid)

    async def list_low_stock(self) -> List[Inventory]:
        """Fetch all inventory records where current stock is less than or equal to minimum stock threshold."""
        return await Inventory.find(
            {"$expr": {"$lte": ["$current_stock", "$minimum_stock"]}}
        ).to_list()

    async def list_out_of_stock(self) -> List[Inventory]:
        """Fetch all inventory records where current stock is equal to 0."""
        return await Inventory.find(Inventory.current_stock == 0).to_list()

    async def update(self, inventory: Inventory, update_data: dict) -> Inventory:
        """Update inventory fields and save."""
        for key, value in update_data.items():
            setattr(inventory, key, value)
        await inventory.save()
        return inventory
