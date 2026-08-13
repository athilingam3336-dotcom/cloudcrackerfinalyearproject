from typing import List
from bson import ObjectId
from fastapi import APIRouter, Depends, Path, status

from app.core.dependencies import get_current_user
from app.exceptions import ValidationException
from app.models.user import User
from app.schemas.cart import (
    CartAddRequest,
    CartResponse,
    CartSummaryResponse,
    CartUpdateRequest,
)
from app.schemas.common import ApiResponse
from app.services.cart_service import CartService

router = APIRouter(prefix="/cart", tags=["Cart"])


def get_validated_cart_id(cart_id: str = Path(...)) -> str:
    """Helper path parameter validator to assert MongoDB ObjectId structure (422)."""
    if not ObjectId.is_valid(cart_id):
        raise ValidationException(
            message="Invalid ID format. Must be a 24-character hexadecimal string."
        )
    return cart_id


@router.post(
    "/add",
    response_model=ApiResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add product to cart (Customer)",
    description="Adds a product to the authenticated user's cart. Merges quantity if already in cart.",
)
async def add_to_cart(
    data: CartAddRequest,
    current_user: User = Depends(get_current_user),
    cart_service: CartService = Depends(),
) -> ApiResponse:
    cart_item = await cart_service.add_to_cart(str(current_user.id), data)
    return ApiResponse(
        success=True,
        message="Item added to cart successfully",
        data=CartResponse.convert_id(cart_item),
    )


@router.get(
    "",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="View shopping cart (Customer)",
    description="Returns list of all products in the authenticated user's cart.",
)
async def get_cart(
    current_user: User = Depends(get_current_user),
    cart_service: CartService = Depends(),
) -> ApiResponse:
    cart_list = await cart_service.get_user_cart(str(current_user.id))
    return ApiResponse(
        success=True,
        message="Cart retrieved successfully",
        data=cart_list,
    )


@router.delete(
    "/clear",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Clear whole cart (Customer)",
    description="Purges all items from the authenticated user's cart.",
)
async def clear_cart(
    current_user: User = Depends(get_current_user),
    cart_service: CartService = Depends(),
) -> ApiResponse:
    await cart_service.clear_cart(str(current_user.id))
    return ApiResponse(
        success=True,
        message="Cart cleared successfully",
        data=None,
    )


@router.get(
    "/summary",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Get cart summary (Customer)",
    description="Retrieves a summary of the shopping cart containing subtotal, discount, items, and grand totals.",
)
async def get_cart_summary(
    current_user: User = Depends(get_current_user),
    cart_service: CartService = Depends(),
) -> ApiResponse:
    summary = await cart_service.get_cart_summary(str(current_user.id))
    return ApiResponse(
        success=True,
        message="Cart summary calculated successfully",
        data=summary,
    )


@router.put(
    "/{cart_id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Update cart item quantity (Customer)",
    description="Updates quantity of a product inside the user's cart.",
)
async def update_cart(
    data: CartUpdateRequest,
    cart_id: str = Depends(get_validated_cart_id),
    current_user: User = Depends(get_current_user),
    cart_service: CartService = Depends(),
) -> ApiResponse:
    cart_item = await cart_service.update_cart_item(str(current_user.id), cart_id, data)
    return ApiResponse(
        success=True,
        message="Cart item updated successfully",
        data=CartResponse.convert_id(cart_item),
    )


@router.delete(
    "/{cart_id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Remove item from cart (Customer)",
    description="Removes a specific item from the authenticated user's cart.",
)
async def delete_cart(
    cart_id: str = Depends(get_validated_cart_id),
    current_user: User = Depends(get_current_user),
    cart_service: CartService = Depends(),
) -> ApiResponse:
    await cart_service.delete_cart_item(str(current_user.id), cart_id)
    return ApiResponse(
        success=True,
        message="Item removed from cart successfully",
        data=None,
    )

