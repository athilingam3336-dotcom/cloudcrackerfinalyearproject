from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from beanie import PydanticObjectId
from beanie.operators import Or, RegEx

from app.models.product import Product


class ProductRepository:
    async def get_by_id(self, product_id: str) -> Optional[Product]:
        """Fetch a product by ID if not deleted."""
        try:
            pid = PydanticObjectId(product_id)
        except Exception:
            return None
        product = await Product.get(pid)
        if product and product.status != "deleted":
            return product
        return None

    async def create(self, product_data: Dict[str, Any]) -> Product:
        """Insert a new Product document."""
        product = Product(**product_data)
        await product.insert()
        return product

    async def update(
        self, product: Product, update_data: Dict[str, Any]
    ) -> Product:
        """Update product fields and save changes."""
        for key, value in update_data.items():
            setattr(product, key, value)
        product.updated_at = datetime.utcnow()
        await product.save()
        return product

    async def soft_delete(self, product: Product) -> Product:
        """Mark product as deleted and deactivate it."""
        product.status = "deleted"
        product.is_active = False
        product.updated_at = datetime.utcnow()
        await product.save()
        return product

    async def list_active_paginated(
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
        """Perform paginated database queries with filters, search, and sorting."""
        # 1. Base criteria: omit soft deleted items
        criteria = [Product.status != "deleted", Product.is_active == True]

        # 2. String search (case-insensitive name or description regex match)
        if search:
            criteria.append(
                Or(
                    RegEx(Product.name, search, "i"),
                    RegEx(Product.description, search, "i"),
                )
            )

        # 3. Category match
        if category_id:
            try:
                criteria.append(Product.category_id == PydanticObjectId(category_id))
            except Exception:
                # If category_id is malformed, yield empty list
                return [], 0

        # 4. Price bounds
        if min_price is not None:
            criteria.append(Product.price >= min_price)
        if max_price is not None:
            criteria.append(Product.price <= max_price)

        # 5. Status boolean flags
        if is_featured is not None:
            criteria.append(Product.is_featured == is_featured)
        if is_bestseller is not None:
            criteria.append(Product.is_bestseller == is_bestseller)
        if is_flash_sale is not None:
            criteria.append(Product.is_flash_sale == is_flash_sale)
        if is_recommended is not None:
            criteria.append(Product.is_recommended == is_recommended)

        # 6. Stock check
        if in_stock is True:
            criteria.append(Product.stock > 0)

        # 7. Apply query filters
        query = Product.find(*criteria)

        # 8. Count total hits matching filters
        total = await query.count()

        # 9. Sorting
        if sort_by == "price_asc":
            query = query.sort(+Product.price)
        elif sort_by == "price_desc":
            query = query.sort(-Product.price)
        elif sort_by == "rating_desc":
            query = query.sort(-Product.rating)
        elif sort_by == "latest":
            query = query.sort(-Product.created_at)
        else:
            # Default sorting: latest created
            query = query.sort(-Product.created_at)

        # 10. Paginate
        skip = (page - 1) * limit
        products = await query.skip(skip).limit(limit).to_list()

        return products, total
