from datetime import datetime
from typing import Any, Dict, List, Optional
from app.models.category import Category


class CategoryRepository:
    async def get_by_id(self, category_id: str) -> Optional[Category]:
        """Retrieve category by ID, ignoring deleted categories."""
        category = await Category.get(category_id)
        if category and category.status != "deleted":
            return category
        return None

    async def get_by_name(self, name: str) -> Optional[Category]:
        """Retrieve category by name (case-sensitive), ignoring deleted categories."""
        return await Category.find_one(
            Category.name == name, Category.status != "deleted"
        )

    async def list_active(self) -> List[Category]:
        """List all active, non-deleted categories."""
        return await Category.find(
            Category.is_active == True, Category.status != "deleted"
        ).to_list()

    async def list_all_non_deleted(self) -> List[Category]:
        """List all categories regardless of active state, as long as they are not deleted."""
        return await Category.find(Category.status != "deleted").to_list()

    async def create(self, category_data: Dict[str, Any]) -> Category:
        """Insert a new Category document."""
        category = Category(**category_data)
        await category.insert()
        return category

    async def update(
        self, category: Category, update_data: Dict[str, Any]
    ) -> Category:
        """Update category fields and save changes."""
        for key, value in update_data.items():
            setattr(category, key, value)
        category.updated_at = datetime.utcnow()
        await category.save()
        return category

    async def soft_delete(self, category: Category) -> Category:
        """Mark category as deleted and deactivate it."""
        category.status = "deleted"
        category.is_active = False
        category.updated_at = datetime.utcnow()
        await category.save()
        return category
