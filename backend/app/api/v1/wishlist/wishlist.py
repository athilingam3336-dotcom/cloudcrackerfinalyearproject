from typing import List
from bson import ObjectId
from fastapi import APIRouter, Depends, Path, status

from app.core.dependencies import get_current_user
from app.exceptions import ValidationException
from app.models.user import User
from app.schemas.cart import CartResponse
from app.schemas.common import ApiResponse
from app.schemas.wishlist import WishlistAddRequest, WishlistResponse
from app.services.wishlist_service import WishlistService

router = APIRouter(prefix="/wishlist", tags=["Wishlist"])


def get_validated_wishlist_id(wishlist_id: str = Path(...)) -> str:
    """Helper path parameter validator to assert MongoDB ObjectId structure (422)."""
    if not ObjectId.is_valid(wishlist_id):
        raise ValidationException(
            message="Invalid ID format. Must be a 24-character hexadecimal string."
        )
    return wishlist_id


@router.post(
    "/add",
    response_model=ApiResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add product to wishlist (Customer)",
    description="Adds a product to the authenticated user's wishlist.",
)
async def add_to_wishlist(
    data: WishlistAddRequest,
    current_user: User = Depends(get_current_user),
    wishlist_service: WishlistService = Depends(),
) -> ApiResponse:
    wishlist_item = await wishlist_service.add_to_wishlist(str(current_user.id), data)
    return ApiResponse(
        success=True,
        message="Item added to wishlist successfully",
        data=WishlistResponse.convert_id(wishlist_item),
    )


@router.get(
    "",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="View wishlist (Customer)",
    description="Returns the authenticated user's active wishlist items.",
)
async def get_wishlist(
    current_user: User = Depends(get_current_user),
    wishlist_service: WishlistService = Depends(),
) -> ApiResponse:
    wishlist_list = await wishlist_service.get_user_wishlist(str(current_user.id))
    return ApiResponse(
        success=True,
        message="Wishlist retrieved successfully",
        data=wishlist_list,
    )


@router.delete(
    "/{wishlist_id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Remove item from wishlist (Customer)",
    description="Removes a specific product from the user's wishlist.",
)
async def delete_wishlist_item(
    wishlist_id: str = Depends(get_validated_wishlist_id),
    current_user: User = Depends(get_current_user),
    wishlist_service: WishlistService = Depends(),
) -> ApiResponse:
    await wishlist_service.delete_wishlist_item(str(current_user.id), wishlist_id)
    return ApiResponse(
        success=True,
        message="Item removed from wishlist successfully",
        data=None,
    )


@router.post(
    "/{wishlist_id}/move-to-cart",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Move wishlist item to cart (Customer)",
    description="Removes item from wishlist, checks product stock, and adds it to the cart.",
)
async def move_to_cart(
    wishlist_id: str = Depends(get_validated_wishlist_id),
    current_user: User = Depends(get_current_user),
    wishlist_service: WishlistService = Depends(),
) -> ApiResponse:
    updated_cart = await wishlist_service.move_to_cart(str(current_user.id), wishlist_id)
    return ApiResponse(
        success=True,
        message="Wishlist item moved to cart successfully",
        data=updated_cart,
    )


@router.post(
    "/clear",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Clear wishlist (Customer)",
    description="Purges all wishlist items from the user's account.",
)
async def clear_wishlist(
    current_user: User = Depends(get_current_user),
    wishlist_service: WishlistService = Depends(),
) -> ApiResponse:
    await wishlist_service.clear_wishlist(str(current_user.id))
    return ApiResponse(
        success=True,
        message="Wishlist cleared successfully",
        data=None,
    )
