from typing import List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, Path, Query, status

from app.core.dependencies import get_current_admin, get_current_user
from app.exceptions import ValidationException
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.review import (
    AdminReviewResponse,
    CreateReviewRequest,
    ReviewResponse,
    UpdateReviewRequest,
)
from app.services.review_service import ReviewService

# Customer routes
router = APIRouter(prefix="/reviews", tags=["Reviews"])

# Admin routes
admin_router = APIRouter(prefix="/admin/reviews", tags=["Admin Reviews"])


def get_validated_review_id(review_id: str = Path(...)) -> str:
    """Path parameter validator for reviews ID."""
    if not ObjectId.is_valid(review_id):
        raise ValidationException(
            message="Invalid ID format. Must be a 24-character hexadecimal string."
        )
    return review_id


def get_validated_product_id(product_id: str = Path(...)) -> str:
    """Path parameter validator for product ID."""
    if not ObjectId.is_valid(product_id):
        raise ValidationException(
            message="Invalid ID format. Must be a 24-character hexadecimal string."
        )
    return product_id


def get_validated_admin_review_id(id: str = Path(...)) -> str:
    """Path parameter validator for admin reviews ID."""
    if not ObjectId.is_valid(id):
        raise ValidationException(
            message="Invalid ID format. Must be a 24-character hexadecimal string."
        )
    return id


# --- Customer API Endpoints ---

@router.post(
    "",
    response_model=ApiResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create review (Customer)",
    description="Submits a rating and review for a purchased product. Limit: one review per user per product.",
)
async def create_review(
    data: CreateReviewRequest,
    current_user: User = Depends(get_current_user),
    review_service: ReviewService = Depends(),
) -> ApiResponse:
    review = await review_service.create_review(str(current_user.id), data)
    return ApiResponse(
        success=True,
        message="Review submitted successfully",
        data=ReviewResponse.convert_id(review),
    )


@router.get(
    "/my",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="List my reviews (Customer)",
    description="Retrieves a paginated list of active reviews written by the authenticated user.",
)
async def get_my_reviews(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    review_service: ReviewService = Depends(),
) -> ApiResponse:
    reviews = await review_service.get_user_reviews(str(current_user.id), skip=skip, limit=limit)
    serialized = [ReviewResponse.convert_id(r) for r in reviews]
    return ApiResponse(
        success=True,
        message="User reviews retrieved successfully",
        data=serialized,
    )


@router.get(
    "/product/{product_id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Get product reviews (Public)",
    description="Retrieves active reviews for a product with pagination and sorting choices.",
)
async def get_product_reviews(
    product_id: str = Depends(get_validated_product_id),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    sort_by: str = Query("newest", description="newest, highest_rating, lowest_rating, most_liked"),
    review_service: ReviewService = Depends(),
) -> ApiResponse:
    reviews = await review_service.get_product_reviews(
        product_id, skip=skip, limit=limit, sort_by=sort_by
    )
    serialized = [ReviewResponse.convert_id(r) for r in reviews]
    return ApiResponse(
        success=True,
        message="Product reviews retrieved successfully",
        data=serialized,
    )


@router.get(
    "/{review_id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Get review details (Public)",
    description="Fetch a review details by database ID.",
)
async def get_review_details(
    review_id: str = Depends(get_validated_review_id),
    review_service: ReviewService = Depends(),
) -> ApiResponse:
    review = await review_service.get_review_details(review_id)
    return ApiResponse(
        success=True,
        message="Review details retrieved successfully",
        data=ReviewResponse.convert_id(review),
    )


@router.put(
    "/{review_id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Update review (Customer)",
    description="Updates rating, title, and body text of a review. Only the owner can edit.",
)
async def update_review(
    data: UpdateReviewRequest,
    review_id: str = Depends(get_validated_review_id),
    current_user: User = Depends(get_current_user),
    review_service: ReviewService = Depends(),
) -> ApiResponse:
    review = await review_service.update_review(str(current_user.id), review_id, data)
    return ApiResponse(
        success=True,
        message="Review updated successfully",
        data=ReviewResponse.convert_id(review),
    )


@router.delete(
    "/{review_id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete review (Customer)",
    description="Soft-deletes a review written by the authenticated user.",
)
async def delete_review(
    review_id: str = Depends(get_validated_review_id),
    current_user: User = Depends(get_current_user),
    review_service: ReviewService = Depends(),
) -> ApiResponse:
    await review_service.delete_review(str(current_user.id), review_id)
    return ApiResponse(
        success=True,
        message="Review deleted successfully",
        data=None,
    )


# --- Administrative API Endpoints ---

@admin_router.get(
    "",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="List reviews (Admin Only)",
    description="Lists all active and hidden reviews in the database. Requires admin role.",
)
async def list_reviews_admin(
    status_filter: Optional[str] = Query(None, description="ACTIVE, HIDDEN"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_admin: User = Depends(get_current_admin),
    review_service: ReviewService = Depends(),
) -> ApiResponse:
    reviews = await review_service.get_all_reviews_admin(
        status_filter=status_filter, skip=skip, limit=limit
    )
    serialized = [AdminReviewResponse.convert_id(r) for r in reviews]
    return ApiResponse(
        success=True,
        message="Admin reviews list retrieved successfully",
        data=serialized,
    )


@admin_router.put(
    "/{id}/hide",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Hide review (Admin Only)",
    description="Hides a review from public listings. Requires admin role.",
)
async def hide_review(
    id: str = Depends(get_validated_admin_review_id),
    current_admin: User = Depends(get_current_admin),
    review_service: ReviewService = Depends(),
) -> ApiResponse:
    review = await review_service.hide_review(id)
    return ApiResponse(
        success=True,
        message="Review hidden successfully",
        data=AdminReviewResponse.convert_id(review),
    )


@admin_router.put(
    "/{id}/restore",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Restore review (Admin Only)",
    description="Restores a hidden review back to active display. Requires admin role.",
)
async def restore_review(
    id: str = Depends(get_validated_admin_review_id),
    current_admin: User = Depends(get_current_admin),
    review_service: ReviewService = Depends(),
) -> ApiResponse:
    review = await review_service.restore_review(id)
    return ApiResponse(
        success=True,
        message="Review restored successfully",
        data=AdminReviewResponse.convert_id(review),
    )


@admin_router.delete(
    "/{id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete review (Admin Only)",
    description="Soft-deletes a review from the database. Requires admin role.",
)
async def delete_review_admin(
    id: str = Depends(get_validated_admin_review_id),
    current_admin: User = Depends(get_current_admin),
    review_service: ReviewService = Depends(),
) -> ApiResponse:
    await review_service.delete_review_admin(id)
    return ApiResponse(
        success=True,
        message="Review deleted successfully",
        data=None,
    )
