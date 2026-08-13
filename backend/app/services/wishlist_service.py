from typing import List

from app.exceptions import NotFoundException, ValidationException
from app.models.wishlist import Wishlist
from app.repositories.product_repository import ProductRepository
from app.repositories.wishlist_repository import WishlistRepository
from app.schemas.cart import CartAddRequest, CartResponse
from app.schemas.wishlist import WishlistAddRequest, WishlistResponse
from app.schemas.product import ProductResponse
from app.services.cart_service import CartService


class WishlistService:
    def __init__(self) -> None:
        self.wishlist_repo = WishlistRepository()
        self.product_repo = ProductRepository()
        self.cart_service = CartService()

    async def add_to_wishlist(self, user_id: str, data: WishlistAddRequest) -> Wishlist:
        """Adds a product to the user's wishlist, avoiding duplicates."""
        product = await self.product_repo.get_by_id(data.product_id)
        if not product or not product.is_active or product.status == "deleted":
            raise NotFoundException(message="Product not found or inactive.")

        existing = await self.wishlist_repo.get_user_wishlist_item(
            user_id, data.product_id
        )
        if existing:
            # Idempotent return of existing
            return existing

        wishlist_data = {
            "user_id": user_id,
            "product_id": data.product_id,
            "status": "active",
        }
        return await self.wishlist_repo.create(wishlist_data)

    async def get_user_wishlist(self, user_id: str) -> List[WishlistResponse]:
        """Fetch all user wishlist items populated with product details."""
        items = await self.wishlist_repo.list_user_wishlist(user_id)
        responses = []
        for item in items:
            product = await self.product_repo.get_by_id(str(item.product_id))
            resp = WishlistResponse.convert_id(item)
            if product:
                resp["product"] = ProductResponse.convert_id(product)
            responses.append(WishlistResponse(**resp))
        return responses

    async def delete_wishlist_item(self, user_id: str, wishlist_id: str) -> None:
        """Deletes a wishlist item."""
        item = await self.wishlist_repo.get_by_id(wishlist_id)
        if not item or str(item.user_id) != user_id:
            raise NotFoundException(message="Wishlist item not found.")
        await self.wishlist_repo.delete(item)

    async def clear_wishlist(self, user_id: str) -> None:
        """Clears all wishlist items for a user."""
        await self.wishlist_repo.clear_user_wishlist(user_id)

    async def move_to_cart(self, user_id: str, wishlist_id: str) -> List[CartResponse]:
        """Moves a wishlist item to the user's cart, verifying stock and deleting the wishlist item."""
        item = await self.wishlist_repo.get_by_id(wishlist_id)
        if not item or str(item.user_id) != user_id:
            raise NotFoundException(message="Wishlist item not found.")

        product = await self.product_repo.get_by_id(str(item.product_id))
        if not product or not product.is_active or product.status == "deleted":
            raise NotFoundException(message="Product not found or inactive.")

        if product.stock < 1:
            raise ValidationException(message="Product is out of stock.")

        # 1. Add to cart with quantity 1
        await self.cart_service.add_to_cart(
            user_id, CartAddRequest(product_id=str(item.product_id), quantity=1)
        )

        # 2. Remove from wishlist
        await self.wishlist_repo.delete(item)

        # 3. Return updated cart list
        return await self.cart_service.get_user_cart(user_id)
