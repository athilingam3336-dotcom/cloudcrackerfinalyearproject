from typing import Any, Dict, List, Optional, Tuple

from app.exceptions import NotFoundException, ValidationException
from app.models.product import Product
from app.repositories.category_repository import CategoryRepository
from app.repositories.product_repository import ProductRepository
from app.schemas.product import ProductCreate, ProductUpdate


class ProductService:
    def __init__(self) -> None:
        self.product_repo = ProductRepository()
        self.category_repo = CategoryRepository()

    async def create_product(self, data: ProductCreate, user_id: str) -> Product:
        """Creates a new product after asserting its parent category exists and is active."""
        # 1. Assert category exists and is active
        category = await self.category_repo.get_by_id(data.category_id)
        if not category or not category.is_active:
            raise ValidationException(
                message=f"Category with ID '{data.category_id}' does not exist or is inactive."
            )

        product_data = {
            "name": data.name,
            "description": data.description,
            "price": data.price,
            "discount_price": data.discount_price,
            "category_id": category.id,
            "stock": data.stock,
            "images": data.images,
            "rating": 0.0,
            "reviews_count": 0,
            "is_featured": data.is_featured,
            "is_bestseller": data.is_bestseller,
            "is_flash_sale": data.is_flash_sale,
            "is_recommended": data.is_recommended,
            "is_active": True,
            "status": "active",
            "created_by": user_id,
            "updated_by": user_id,
        }
        return await self.product_repo.create(product_data)

    async def get_product(self, product_id: str) -> Product:
        """Retrieves a single product by ID, throwing NotFound if missing."""
        product = await self.product_repo.get_by_id(product_id)
        if not product:
            raise NotFoundException(message="Product not found.")
        return product

    async def update_product(
        self, product_id: str, data: ProductUpdate, user_id: str
    ) -> Product:
        """Updates product properties, checking parent category links and price thresholds."""
        product = await self.get_product(product_id)

        update_dict = data.model_dump(exclude_unset=True)

        # 1. Verify category constraint if category_id is updated
        if "category_id" in update_dict:
            cat_id = update_dict["category_id"]
            category = await self.category_repo.get_by_id(cat_id)
            if not category or not category.is_active:
                raise ValidationException(
                    message=f"Category with ID '{cat_id}' does not exist or is inactive."
                )
            from beanie import PydanticObjectId
            update_dict["category_id"] = PydanticObjectId(cat_id)

        # 2. Check discount constraint across partial update states
        new_price = update_dict.get("price", product.price)
        new_discount = update_dict.get("discount_price", product.discount_price)

        # If discount price was explicitly set to None, it's valid
        if "discount_price" in update_dict and update_dict["discount_price"] is None:
            new_discount = None

        if new_discount is not None and new_discount >= new_price:
            raise ValidationException(
                message="Discount price must be strictly less than the product price."
            )

        update_dict["updated_by"] = user_id
        return await self.product_repo.update(product, update_dict)

    async def delete_product(self, product_id: str, user_id: str) -> Product:
        """Soft deletes a product."""
        product = await self.get_product(product_id)
        product.updated_by = user_id
        return await self.product_repo.soft_delete(product)

    async def list_products_paginated(
        self,
        search: Optional[str] = None,
        category_id: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        is_featured: Optional[bool] = None,
        is_bestseller: Optional[bool] = None,
        is_flash_sale: Optional[bool] = None,
        is_recommended: Optional[bool] = None,
        in_stock: Optional[bool] = None,
        sort_by: Optional[str] = None,
        page: int = 1,
        limit: int = 10,
    ) -> Tuple[List[Product], int]:
        """Performs a paginated list search and returns matches alongside hit count."""
        return await self.product_repo.list_active_paginated(
            search=search,
            category_id=category_id,
            min_price=min_price,
            max_price=max_price,
            is_featured=is_featured,
            is_bestseller=is_bestseller,
            is_flash_sale=is_flash_sale,
            is_recommended=is_recommended,
            in_stock=in_stock,
            sort_by=sort_by,
            page=page,
            limit=limit,
        )
