from typing import List, Optional

from app.exceptions import NotFoundException, ValidationException
from app.models.category import Category
from app.repositories.category_repository import CategoryRepository
from app.schemas.category import CategoryCreate, CategoryUpdate


class CategoryService:
    def __init__(self) -> None:
        self.category_repo = CategoryRepository()

    async def create_category(
        self, data: CategoryCreate, user_id: str
    ) -> Category:
        """Creates a new category, validating unique name naming bounds."""
        # Assert unique name
        existing = await self.category_repo.get_by_name(data.name)
        if existing:
            raise ValidationException(
                message=f"Category with name '{data.name}' already exists."
            )

        category_data = {
            "name": data.name,
            "description": data.description,
            "image_url": data.image_url,
            "is_active": True,
            "status": "active",
            "created_by": user_id,
            "updated_by": user_id,
        }
        return await self.category_repo.create(category_data)

    async def get_category(self, category_id: str) -> Category:
        """Retrieves a single category by database ID."""
        category = await self.category_repo.get_by_id(category_id)
        if not category:
            raise NotFoundException(message="Category not found.")
        return category

    async def update_category(
        self, category_id: str, data: CategoryUpdate, user_id: str
    ) -> Category:
        """Updates category fields, asserting name uniqueness if modified."""
        category = await self.get_category(category_id)

        update_dict = data.model_dump(exclude_unset=True)

        if "name" in update_dict and update_dict["name"] != category.name:
            existing = await self.category_repo.get_by_name(update_dict["name"])
            if existing:
                raise ValidationException(
                    message=f"Category with name '{update_dict['name']}' already exists."
                )

        update_dict["updated_by"] = user_id
        return await self.category_repo.update(category, update_dict)

    async def delete_category(self, category_id: str, user_id: str) -> Category:
        """Soft deletes a category after ensuring no active products reference it."""
        from app.models.product import Product

        category = await self.get_category(category_id)

        # Check if active products currently reference this category
        active_products_count = await Product.find(
            Product.category_id == category.id,
            Product.status != "deleted",
        ).count()
        if active_products_count > 0:
            raise ValidationException(
                message=f"Cannot delete category '{category.name}' because {active_products_count} active product(s) are currently referencing it. Please reassign or delete those products first."
            )

        category.updated_by = user_id
        return await self.category_repo.soft_delete(category)

    async def list_categories(self, include_inactive: bool = False) -> List[dict]:
        """Lists categories with real active product counts populated."""
        from app.models.product import Product

        if include_inactive:
            categories = await self.category_repo.list_all_non_deleted()
        else:
            categories = await self.category_repo.list_active()

        results = []
        for cat in categories:
            cat_dict = cat.model_dump()
            cat_dict["id"] = str(cat.id)
            # Count active products associated with this category ID or category name
            count = await Product.find(
                {
                    "$or": [
                        {"category_id": str(cat.id)},
                        {"category_id": cat.name},
                        {"category": cat.name},
                    ],
                    "status": {"$ne": "deleted"},
                    "is_active": True,
                }
            ).count()
            cat_dict["item_count"] = count
            results.append(cat_dict)
        return results
