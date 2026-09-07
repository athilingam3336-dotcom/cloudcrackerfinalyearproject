from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, Path, Query, status

from app.core.dependencies import get_current_admin, get_current_user
from app.exceptions import ValidationException
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.coupon import (
    CouponCreateRequest,
    CouponOverviewPagination,
    CouponOverviewResponseData,
    CouponResponse,
    CouponStatusUpdateRequest,
    CouponSummaryMetrics,
    CouponUpdateRequest,
    CouponValidateRequest,
)
from app.services.coupon_service import CouponService

router = APIRouter(prefix="/coupons", tags=["Coupons"])


def get_validated_coupon_id(coupon_id: str = Path(...)) -> str:
    """Helper path parameter validator to assert MongoDB ObjectId structure (422)."""
    if not ObjectId.is_valid(coupon_id):
        raise ValidationException(
            message="Invalid ID format. Must be a 24-character hexadecimal string."
        )
    return coupon_id


@router.get(
    "",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="List coupons overview (Admin Only)",
    description="Retrieves summary metrics and paginated coupon campaign records with multi-field search and status filtering. Requires admin role.",
)
async def list_coupons(
    search: Optional[str] = Query(None, description="Search coupon code or description"),
    status_filter: Optional[str] = Query("all", description="all, active, inactive, expired, upcoming, usage_limit_reached"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    current_admin: User = Depends(get_current_admin),
    coupon_service: CouponService = Depends(),
) -> ApiResponse:
    metrics_dict, items_raw, total = await coupon_service.list_coupons(
        search=search,
        status_filter=status_filter,
        page=page,
        limit=limit,
    )
    pages = (total + limit - 1) // limit if total > 0 else 1

    response_data = CouponOverviewResponseData(
        metrics=CouponSummaryMetrics(**metrics_dict),
        items=[CouponResponse.convert_id(c) for c in items_raw],
        pagination=CouponOverviewPagination(
            total=total,
            page=page,
            limit=limit,
            pages=pages,
        ),
    )
    return ApiResponse(
        success=True,
        message="Coupons list retrieved successfully",
        data=response_data,
    )


@router.patch(
    "/{coupon_id}/status",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Update coupon active status (Admin Only)",
    description="Quick toggle to activate or deactivate a coupon campaign. Requires admin role.",
)
async def update_coupon_status(
    data: CouponStatusUpdateRequest,
    coupon_id: str = Depends(get_validated_coupon_id),
    current_admin: User = Depends(get_current_admin),
    coupon_service: CouponService = Depends(),
) -> ApiResponse:
    coupon = await coupon_service.update_coupon_status(coupon_id, data.is_active)
    return ApiResponse(
        success=True,
        message=f"Coupon status updated to {'active' if data.is_active else 'inactive'}",
        data=CouponResponse.convert_id(coupon),
    )


@router.post(
    "/validate",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate coupon (Customer)",
    description="Validates a coupon code against an order total, returning the discount value. No usage count increment.",
)
async def validate_coupon(
    data: CouponValidateRequest,
    current_user: User = Depends(get_current_user),
    coupon_service: CouponService = Depends(),
) -> ApiResponse:
    val_resp = await coupon_service.validate_coupon(data)
    return ApiResponse(
        success=True,
        message="Coupon validated successfully",
        data=val_resp,
    )


@router.post(
    "/apply",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Apply coupon (Customer)",
    description="Validates a coupon code and increments its usage count by 1 in the database.",
)
async def apply_coupon(
    data: CouponValidateRequest,
    current_user: User = Depends(get_current_user),
    coupon_service: CouponService = Depends(),
) -> ApiResponse:
    apply_resp = await coupon_service.apply_coupon(data)
    return ApiResponse(
        success=True,
        message="Coupon applied successfully",
        data=apply_resp,
    )


@router.post(
    "",
    response_model=ApiResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a coupon (Admin Only)",
    description="Creates a new discount coupon. Requires admin privileges.",
)
async def create_coupon(
    data: CouponCreateRequest,
    current_admin: User = Depends(get_current_admin),
    coupon_service: CouponService = Depends(),
) -> ApiResponse:
    coupon = await coupon_service.create_coupon(data)
    return ApiResponse(
        success=True,
        message="Coupon created successfully",
        data=CouponResponse.convert_id(coupon),
    )


@router.put(
    "/{coupon_id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a coupon (Admin Only)",
    description="Updates coupon details. Requires admin privileges.",
)
async def update_coupon(
    data: CouponUpdateRequest,
    coupon_id: str = Depends(get_validated_coupon_id),
    current_admin: User = Depends(get_current_admin),
    coupon_service: CouponService = Depends(),
) -> ApiResponse:
    coupon = await coupon_service.update_coupon(coupon_id, data)
    return ApiResponse(
        success=True,
        message="Coupon updated successfully",
        data=CouponResponse.convert_id(coupon),
    )


@router.delete(
    "/{coupon_id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Soft delete a coupon (Admin Only)",
    description="Soft-deletes a coupon. Requires admin privileges.",
)
async def delete_coupon(
    coupon_id: str = Depends(get_validated_coupon_id),
    current_admin: User = Depends(get_current_admin),
    coupon_service: CouponService = Depends(),
) -> ApiResponse:
    await coupon_service.delete_coupon(coupon_id)
    return ApiResponse(
        success=True,
        message="Coupon deleted successfully",
        data=None,
    )


@router.get(
    "/{coupon_id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Get coupon details (Admin Only)",
    description="Fetch a coupon by database ID. Requires admin privileges.",
)
async def get_coupon(
    coupon_id: str = Depends(get_validated_coupon_id),
    current_admin: User = Depends(get_current_admin),
    coupon_service: CouponService = Depends(),
) -> ApiResponse:
    coupon = await coupon_service.get_coupon(coupon_id)
    return ApiResponse(
        success=True,
        message="Coupon details retrieved successfully",
        data=CouponResponse.convert_id(coupon),
    )
