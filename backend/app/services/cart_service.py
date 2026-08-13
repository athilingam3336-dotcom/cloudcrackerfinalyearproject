from typing import List, Optional

from app.exceptions import NotFoundException, ValidationException
from app.models.cart import Cart
from app.repositories.cart_repository import CartRepository
from app.repositories.product_repository import ProductRepository
from app.schemas.cart import CartAddRequest, CartResponse, CartSummaryResponse, CartUpdateRequest
from app.schemas.product import ProductResponse


class CartService:
    def __init__(self) -> None:
        self.cart_repo = CartRepository()
        self.product_repo = ProductRepository()

    async def add_to_cart(self, user_id: str, data: CartAddRequest) -> Cart:
        """Adds a product to the user's cart, verifying stock, active status, and merging duplicates."""
        product = await self.product_repo.get_by_id(data.product_id)
        if not product or not product.is_active or product.status == "deleted":
            raise NotFoundException(message="Product not found or inactive.")

        if data.quantity > product.stock:
            raise ValidationException(
                message=f"Requested quantity exceeds available stock ({product.stock})."
            )

        # Get price (use discount_price if available)
        price = (
            product.discount_price
            if product.discount_price is not None
            else product.price
        )

        existing_item = await self.cart_repo.get_user_cart_item(user_id, data.product_id)
        if existing_item:
            new_quantity = existing_item.quantity + data.quantity
            if new_quantity > product.stock:
                raise ValidationException(
                    message=f"Total requested quantity ({new_quantity}) exceeds available stock ({product.stock})."
                )
            update_data = {
                "quantity": new_quantity,
                "unit_price": price,
                "total_price": new_quantity * price,
            }
            return await self.cart_repo.update(existing_item, update_data)

        # Create new cart item
        cart_data = {
            "user_id": user_id,
            "product_id": data.product_id,
            "quantity": data.quantity,
            "unit_price": price,
            "total_price": data.quantity * price,
            "status": "active",
        }
        return await self.cart_repo.create(cart_data)

    async def get_user_cart(self, user_id: str) -> List[CartResponse]:
        """Fetch all user cart items and populate product details."""
        cart_items = await self.cart_repo.list_user_cart(user_id)
        responses = []
        for item in cart_items:
            product = await self.product_repo.get_by_id(str(item.product_id))
            resp = CartResponse.convert_id(item)
            if product:
                resp["product"] = ProductResponse.convert_id(product)
            responses.append(CartResponse(**resp))
        return responses

    async def update_cart_item(
        self, user_id: str, cart_id: str, data: CartUpdateRequest
    ) -> Cart:
        """Updates the quantity of a cart item with stock verification."""
        cart_item = await self.cart_repo.get_by_id(cart_id)
        if not cart_item or str(cart_item.user_id) != user_id:
            raise NotFoundException(message="Cart item not found.")

        product = await self.product_repo.get_by_id(str(cart_item.product_id))
        if not product or not product.is_active or product.status == "deleted":
            raise NotFoundException(message="Product associated with cart item not found.")

        if data.quantity > product.stock:
            raise ValidationException(
                message=f"Requested quantity exceeds available stock ({product.stock})."
            )

        price = (
            product.discount_price
            if product.discount_price is not None
            else product.price
        )
        update_data = {
            "quantity": data.quantity,
            "unit_price": price,
            "total_price": data.quantity * price,
        }
        return await self.cart_repo.update(cart_item, update_data)

    async def delete_cart_item(self, user_id: str, cart_id: str) -> None:
        """Deletes a cart item."""
        cart_item = await self.cart_repo.get_by_id(cart_id)
        if not cart_item or str(cart_item.user_id) != user_id:
            raise NotFoundException(message="Cart item not found.")
        await self.cart_repo.delete(cart_item)

    async def clear_cart(self, user_id: str) -> None:
        """Clears all cart items for a user."""
        await self.cart_repo.clear_user_cart(user_id)

    async def get_cart_summary(self, user_id: str) -> CartSummaryResponse:
        """Calculates financials for the user's cart."""
        cart_items = await self.cart_repo.list_user_cart(user_id)
        total_items = 0
        subtotal = 0.0
        total_discount = 0.0
        grand_total = 0.0

        for item in cart_items:
            product = await self.product_repo.get_by_id(str(item.product_id))
            if not product:
                continue
            total_items += item.quantity
            item_subtotal = item.quantity * product.price
            subtotal += item_subtotal

            discount_diff = 0.0
            if product.discount_price is not None:
                discount_diff = product.price - product.discount_price

            total_discount += item.quantity * discount_diff
            grand_total += item.total_price

        return CartSummaryResponse(
            total_items=total_items,
            subtotal=round(subtotal, 2),
            total_discount=round(total_discount, 2),
            grand_total=round(grand_total, 2),
        )
