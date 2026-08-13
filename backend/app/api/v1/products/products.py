from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, Path, Query, status

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
    description="Registers a new product. Requires admin authentication. Asserts parent category is active.",
)
async def create_product(
    data: ProductCreate,
    current_admin: User = Depends(get_current_admin),
    product_service: ProductService = Depends(),
) -> ApiResponse:
    product = await product_service.create_product(data, str(current_admin.id))
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
    description="Updates fields of a product. Requires admin authentication. Validates category links.",
)
async def update_product(
    data: ProductUpdate,
    product_id: str = Depends(get_validated_product_id),
    current_admin: User = Depends(get_current_admin),
    product_service: ProductService = Depends(),
) -> ApiResponse:
    product = await product_service.update_product(
        product_id, data, str(current_admin.id)
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
) -> ApiResponse:
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
) -> ApiResponse:
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
