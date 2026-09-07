from typing import List
from bson import ObjectId
from fastapi import APIRouter, Depends, Path, Query, status

from app.core.dependencies import get_current_admin
from app.exceptions import ValidationException
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate
from app.schemas.common import ApiResponse
from app.services.category_service import CategoryService

router = APIRouter(prefix="/categories", tags=["Categories"])


def get_validated_id(category_id: str = Path(...)) -> str:
    """Helper path parameter validator to assert MongoDB ObjectId structure (422)."""
    if not ObjectId.is_valid(category_id):
        raise ValidationException(
            message="Invalid ID format. Must be a 24-character hexadecimal string."
        )
    return category_id


@router.post(
    "",
    response_model=ApiResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new category (Admin Only)",
    description="Registers a new product category. Requires admin role authentication. Category name must be unique.",
)
async def create_category(
    data: CategoryCreate,
    current_admin: User = Depends(get_current_admin),
    category_service: CategoryService = Depends(),
) -> ApiResponse:
    category = await category_service.create_category(data, str(current_admin.id))
    return ApiResponse(
        success=True,
        message="Category created successfully",
        data=CategoryResponse.convert_id(category),
    )


@router.put(
    "/{category_id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Update category (Admin Only)",
    description="Updates fields of an existing category. Requires admin role authentication.",
)
async def update_category(
    data: CategoryUpdate,
    category_id: str = Depends(get_validated_id),
    current_admin: User = Depends(get_current_admin),
    category_service: CategoryService = Depends(),
) -> ApiResponse:
    category = await category_service.update_category(
        category_id, data, str(current_admin.id)
    )
    return ApiResponse(
        success=True,
        message="Category updated successfully",
        data=CategoryResponse.convert_id(category),
    )


@router.delete(
    "/{category_id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Soft delete category (Admin Only)",
    description="Deactivates and soft-deletes a category. Requires admin role authentication.",
)
async def delete_category(
    category_id: str = Depends(get_validated_id),
    current_admin: User = Depends(get_current_admin),
    category_service: CategoryService = Depends(),
) -> ApiResponse:
    category = await category_service.delete_category(category_id, str(current_admin.id))
    return ApiResponse(
        success=True,
        message="Category deleted successfully",
        data=CategoryResponse.convert_id(category),
    )


@router.get(
    "",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="List categories (Public)",
    description="Returns a list of categories. Supports including inactive categories for admin management.",
)
async def list_categories(
    include_inactive: bool = Query(False, description="Include inactive categories"),
    category_service: CategoryService = Depends(),
) -> ApiResponse:
    categories = await category_service.list_categories(include_inactive=include_inactive)
    serialized = [CategoryResponse.convert_id(c) for c in categories]
    return ApiResponse(
        success=True,
        message="Categories retrieved successfully",
        data=serialized,
    )


@router.get(
    "/{category_id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Get category details (Public)",
    description="Retrieves details of a single category by its database ID. No authentication required.",
)
async def get_category(
    category_id: str = Depends(get_validated_id),
    category_service: CategoryService = Depends(),
) -> ApiResponse:
    category = await category_service.get_category(category_id)
    return ApiResponse(
        success=True,
        message="Category retrieved successfully",
        data=CategoryResponse.convert_id(category),
    )
