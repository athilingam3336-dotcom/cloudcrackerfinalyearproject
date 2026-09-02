from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, Path, Query, Request, Response, UploadFile, status

from app.core.dependencies import get_current_admin
from app.exceptions import ValidationException
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.product import (
    PaginationMeta,
    ProductCreate,
    ProductListResponseData,
    ProductResponse,
    ProductUpdate,
)
from app.services.product_service import ProductService

router = APIRouter(prefix="/products", tags=["Products"])


def get_validated_product_id(product_id: str = Path(...)) -> str:
    """Helper path parameter validator to assert MongoDB ObjectId structure (422)."""
    if not ObjectId.is_valid(product_id):
        raise ValidationException(
            message="Invalid ID format. Must be a 24-character hexadecimal string."
        )
    return product_id


@router.post(
    "",
    response_model=ApiResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new product (Admin Only)",
    description="Registers a new product with optional image upload to Cloudinary. Requires admin authentication.",
)
async def create_product(
    request: Request,
    current_admin: User = Depends(get_current_admin),
    product_service: ProductService = Depends(),
) -> ApiResponse:
    content_type = request.headers.get("content-type", "")
    image_file: Optional[UploadFile] = None

    if "multipart/form-data" in content_type:
        form = await request.form()
        name = form.get("name") or form.get("title")
        description = form.get("description")
        price_raw = form.get("price") or form.get("original_price")
        discount_raw = form.get("discount_price")
        category_id = form.get("category_id") or form.get("category")
        stock_raw = form.get("stock")
        image_url = form.get("image_url")

        is_featured = str(form.get("is_featured", "false")).lower() in ("true", "1")
        is_bestseller = str(form.get("is_bestseller", "false")).lower() in ("true", "1")
        is_flash_sale = str(form.get("is_flash_sale", "false")).lower() in ("true", "1")
        is_recommended = str(form.get("is_recommended", "false")).lower() in ("true", "1")
        time_of_day = str(form.get("time_of_day", "both")).lower()

        raw_file = form.get("image") or form.get("file")
        if raw_file and hasattr(raw_file, "filename") and bool(raw_file.filename):
            image_file = raw_file

        if not name or not price_raw or not category_id or stock_raw is None:
            raise ValidationException(
                message="Missing required product fields (name, price, category_id, stock)."
            )

        try:
            price = float(price_raw)
            discount_price = (
                float(discount_raw)
                if discount_raw not in (None, "", "null")
                else None
            )
            stock = int(stock_raw)
        except (ValueError, TypeError):
            raise ValidationException(
                message="Invalid numeric format for price, discount_price, or stock."
            )

        try:
            data = ProductCreate(
                name=str(name),
                description=str(description or ""),
                price=price,
                discount_price=discount_price,
                category_id=str(category_id),
                stock=stock,
                image_url=str(image_url) if image_url else None,
                is_featured=is_featured,
                is_bestseller=is_bestseller,
                is_flash_sale=is_flash_sale,
                is_recommended=is_recommended,
                time_of_day=time_of_day,
            )
        except Exception as e:
            raise ValidationException(message=str(e))
    else:
        json_body = await request.json()
        try:
            data = ProductCreate(**json_body)
        except Exception as e:
            raise ValidationException(message=str(e))

    product = await product_service.create_product(
        data, str(current_admin.id), image_file=image_file
    )
    return ApiResponse(
        success=True,
        message="Product created successfully",
        data=ProductResponse.convert_id(product),
    )


@router.put(
    "/{product_id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Update product details (Admin Only)",
    description="Updates fields of a product and optional image upload to Cloudinary. Requires admin authentication.",
)
async def update_product(
    request: Request,
    product_id: str = Depends(get_validated_product_id),
    current_admin: User = Depends(get_current_admin),
    product_service: ProductService = Depends(),
) -> ApiResponse:
    content_type = request.headers.get("content-type", "")
    image_file: Optional[UploadFile] = None

    if "multipart/form-data" in content_type:
        form = await request.form()
        update_kwargs: dict = {}
        if "name" in form or "title" in form:
            update_kwargs["name"] = str(form.get("name") or form.get("title"))
        if "description" in form:
            update_kwargs["description"] = str(form.get("description"))
        if "price" in form or "original_price" in form:
            update_kwargs["price"] = float(
                form.get("price") or form.get("original_price")  # type: ignore
            )
        if "discount_price" in form:
            val = form.get("discount_price")
            update_kwargs["discount_price"] = (
                float(val) if val not in (None, "", "null") else None  # type: ignore
            )
        if "category_id" in form or "category" in form:
            update_kwargs["category_id"] = str(
                form.get("category_id") or form.get("category")
            )
        if "stock" in form:
            update_kwargs["stock"] = int(form.get("stock"))  # type: ignore
        if "is_featured" in form:
            update_kwargs["is_featured"] = str(form.get("is_featured")).lower() in (
                "true",
                "1",
            )
        if "is_bestseller" in form:
            update_kwargs["is_bestseller"] = str(form.get("is_bestseller")).lower() in (
                "true",
                "1",
            )
        if "is_flash_sale" in form:
            update_kwargs["is_flash_sale"] = str(form.get("is_flash_sale")).lower() in (
                "true",
                "1",
            )
        if "is_recommended" in form:
            update_kwargs["is_recommended"] = str(
                form.get("is_recommended")
            ).lower() in ("true", "1")
        if "is_active" in form:
            update_kwargs["is_active"] = str(form.get("is_active")).lower() in (
                "true",
                "1",
            )
        if "time_of_day" in form:
            update_kwargs["time_of_day"] = str(form.get("time_of_day")).lower()
        if "image_url" in form:
            update_kwargs["image_url"] = str(form.get("image_url"))

        raw_file = form.get("image") or form.get("file")
        if raw_file and hasattr(raw_file, "filename") and bool(raw_file.filename):
            image_file = raw_file

        try:
            data = ProductUpdate(**update_kwargs)
        except Exception as e:
            raise ValidationException(message=str(e))
    else:
        json_body = await request.json()
        try:
            data = ProductUpdate(**json_body)
        except Exception as e:
            raise ValidationException(message=str(e))

    product = await product_service.update_product(
        product_id, data, str(current_admin.id), image_file=image_file
    )
    return ApiResponse(
        success=True,
        message="Product updated successfully",
        data=ProductResponse.convert_id(product),
    )


@router.delete(
    "/{product_id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Soft delete product (Admin Only)",
    description="Soft-deletes a product, setting its state to deleted and inactive. Requires admin authentication.",
)
async def delete_product(
    product_id: str = Depends(get_validated_product_id),
    current_admin: User = Depends(get_current_admin),
    product_service: ProductService = Depends(),
) -> ApiResponse:
    product = await product_service.delete_product(product_id, str(current_admin.id))
    return ApiResponse(
        success=True,
        message="Product deleted successfully",
        data=ProductResponse.convert_id(product),
    )


@router.get(
    "/{product_id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Get product details (Public)",
    description="Retrieves details of a single product by its database ID. No authentication required.",
)
async def get_product(
    product_id: str = Depends(get_validated_product_id),
    product_service: ProductService = Depends(),
    response: Response = None, # type: ignore
) -> ApiResponse:
    if response:
        response.headers["Cache-Control"] = "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
    product = await product_service.get_product(product_id)
    return ApiResponse(
        success=True,
        message="Product retrieved successfully",
        data=ProductResponse.convert_id(product),
    )


@router.get(
    "",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="List and filter products (Public)",
    description="Returns a paginated list of active products. Supports text searching, category matching, price caps, flag filters, and custom sort order.",
)
async def list_products(
    search: Optional[str] = Query(None, description="Search by name"),
    category_id: Optional[str] = Query(None, description="Filter by category ID"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price filter"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price filter"),
    is_featured: Optional[bool] = Query(None, description="Filter by featured flag"),
    is_bestseller: Optional[bool] = Query(None, description="Filter by bestseller flag"),
    is_flash_sale: Optional[bool] = Query(None, description="Filter by flash sale flag"),
    is_recommended: Optional[bool] = Query(None, description="Filter by recommended flag"),
    in_stock: Optional[bool] = Query(None, description="Filter by stock availability"),
    sort_by: Optional[str] = Query(
        None,
        description="Sorting strategy (price_asc, price_desc, rating_desc, latest)",
    ),
    page: int = Query(1, ge=1, description="Page index"),
    limit: int = Query(10, ge=1, le=100, description="Items per page limit"),
    product_service: ProductService = Depends(),
    response: Response = None, # type: ignore
) -> ApiResponse:
    if response:
        response.headers["Cache-Control"] = "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
    # 1. Validate category_id format if provided in query parameters
    if category_id is not None and not ObjectId.is_valid(category_id):
        raise ValidationException(
            message="Invalid category_id format. Must be a 24-character hexadecimal string."
        )

    products, total = await product_service.list_products_paginated(
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

    pages = (total + limit - 1) // limit if total > 0 else 0

    response_data = ProductListResponseData(
        products=[ProductResponse.convert_id(p) for p in products],
        pagination=PaginationMeta(total=total, page=page, limit=limit, pages=pages),
    )

    return ApiResponse(
        success=True,
        message="Products retrieved successfully",
        data=response_data,
    )
