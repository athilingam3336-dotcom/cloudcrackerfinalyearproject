import os
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from fastapi import UploadFile

from app.core import cloudinary as cloud_core
from app.exceptions import NotFoundException, ValidationException
from app.models.product import Product
from app.repositories.category_repository import CategoryRepository
from app.repositories.product_repository import ProductRepository
from app.schemas.product import ProductCreate, ProductUpdate

ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"]
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


async def process_and_upload_product_image(image_file: UploadFile) -> str:
    """Validates image file and uploads to Cloudinary in cloudcrackers/products folder, returning secure_url."""
    file_bytes = await image_file.read()
    file_size = len(file_bytes)
    await image_file.seek(0)

    if file_size > MAX_FILE_SIZE:
        raise ValidationException(
            message=f"Image size exceeds 5 MB limit. Uploaded size: {file_size / (1024 * 1024):.2f} MB."
        )

    content_type = (image_file.content_type or "").lower()
    if content_type and content_type not in ALLOWED_MIME_TYPES:
        raise ValidationException(
            message=f"Invalid image type '{content_type}'. Only JPG, JPEG, PNG, and WebP are allowed."
        )

    ext = os.path.splitext(image_file.filename or "")[1].lower()
    if ext and ext not in ALLOWED_EXTENSIONS:
        raise ValidationException(
            message=f"Invalid image extension '{ext}'. Only JPG, JPEG, PNG, and WebP are allowed."
        )

    upload_result = await cloud_core.upload_image(file_bytes, folder="cloudcrackers/products")
    secure_url = upload_result.get("secure_url") or upload_result.get("url")
    if not secure_url:
        raise ValidationException(message="Failed to obtain Cloudinary URL for product image.")
    return secure_url


class ProductService:
    def __init__(self) -> None:
        self.product_repo = ProductRepository()
        self.category_repo = CategoryRepository()

    async def create_product(
        self,
        data: ProductCreate,
        user_id: str,
        image_file: Optional[UploadFile] = None,
    ) -> Product:
        """Creates a new product after asserting its parent category exists and is active, uploading image to Cloudinary."""
        # 1. Assert category exists and is active
        category = await self.category_repo.get_by_id(data.category_id)
        if not category or not category.is_active:
            raise ValidationException(
                message=f"Category with ID '{data.category_id}' does not exist or is inactive."
            )

        # 2. Upload image to Cloudinary if an image file is provided
        image_url = data.image_url
        if image_file:
            image_url = await process_and_upload_product_image(image_file)
        elif not image_url and data.images and len(data.images) > 0:
            image_url = data.images[0]

        images_list = [image_url] if image_url else []

        flash_hours = getattr(data, "flash_sale_hours", 4.0) or 4.0
        flash_ends_at = datetime.utcnow() + timedelta(hours=flash_hours) if data.is_flash_sale else None

        product_data = {
            "name": data.name,
            "description": data.description,
            "price": data.price,
            "discount_price": data.discount_price,
            "category_id": category.id,
            "stock": data.stock,
            "image_url": image_url,
            "images": images_list,
            "rating": 0.0,
            "reviews_count": 0,
            "is_featured": data.is_featured,
            "is_bestseller": data.is_bestseller,
            "is_flash_sale": data.is_flash_sale,
            "flash_sale_hours": flash_hours,
            "flash_sale_ends_at": flash_ends_at,
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
        self,
        product_id: str,
        data: ProductUpdate,
        user_id: str,
        image_file: Optional[UploadFile] = None,
    ) -> Product:
        """Updates product properties, checking parent category links, price thresholds, and updating Cloudinary image if provided."""
        product = await self.get_product(product_id)

        update_dict = data.model_dump(exclude_unset=True)

        if image_file:
            new_image_url = await process_and_upload_product_image(image_file)
            update_dict["image_url"] = new_image_url
            update_dict["images"] = [new_image_url]
        elif "image_url" in update_dict and update_dict["image_url"]:
            update_dict["images"] = [update_dict["image_url"]]
        elif "images" in update_dict and update_dict["images"]:
            update_dict["image_url"] = update_dict["images"][0]

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

        # Recalculate flash_sale_ends_at when flash sale status or duration is updated
        is_flash = update_dict.get("is_flash_sale", product.is_flash_sale)
        if is_flash:
            hours = float(update_dict.get("flash_sale_hours", product.flash_sale_hours or 4.0) or 4.0)
            update_dict["flash_sale_hours"] = hours
            update_dict["flash_sale_ends_at"] = datetime.utcnow() + timedelta(hours=hours)
        elif "is_flash_sale" in update_dict and not is_flash:
            update_dict["flash_sale_ends_at"] = None

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
