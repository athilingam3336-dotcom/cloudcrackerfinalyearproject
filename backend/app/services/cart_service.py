from typing import List, Optional
import logging

from app.exceptions import NotFoundException, ValidationException
from app.models.cart import Cart
from app.repositories.cart_repository import CartRepository
from app.repositories.product_repository import ProductRepository
from app.schemas.cart import CartAddRequest, CartResponse, CartSummaryResponse, CartUpdateRequest
from app.schemas.product import ProductResponse

logger = logging.getLogger("app.services.cart")


class CartService:
    def __init__(self) -> None:
        self.cart_repo = CartRepository()
        self.product_repo = ProductRepository()

    async def add_to_cart(self, user_id: str, data: CartAddRequest) -> Cart:
        """Adds a product to the user's cart, verifying stock, active status, and merging duplicates."""
        try:
            product = await self.product_repo.get_by_id(data.product_id)
            if not product or not getattr(product, "is_active", True) or getattr(product, "status", None) == "deleted":
                raise NotFoundException(message="Product not found or is currently inactive.")

            stock = getattr(product, "stock", 0)
            if data.quantity > stock:
                raise ValidationException(
                    message=f"Requested quantity ({data.quantity}) exceeds available stock ({stock})."
                )

            # Get price (use discount_price if available)
            price = (
                product.discount_price
                if getattr(product, "discount_price", None) is not None
                else product.price
            )

            existing_item = await self.cart_repo.get_user_cart_item(user_id, data.product_id)
            if existing_item:
                new_quantity = existing_item.quantity + data.quantity
                if new_quantity > stock:
                    raise ValidationException(
                        message=f"Total requested quantity ({new_quantity}) exceeds available stock ({stock})."
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
        except (NotFoundException, ValidationException):
            raise
        except Exception as exc:
            logger.error(f"Error adding to cart for user {user_id}, product {data.product_id}: {exc}", exc_info=True)
            raise ValidationException(message=f"Could not add item to cart: {str(exc)}")

    async def get_user_cart(self, user_id: str) -> List[CartResponse]:
        """Fetch all user cart items, merge duplicate product entries in DB, and populate product details."""
        try:
            cart_items = await self.cart_repo.list_user_cart(user_id)
            if not cart_items:
                return []

            # Group duplicate cart documents by product_id
            merged_map = {}
            for item in cart_items:
                p_id = str(item.product_id)
                if p_id in merged_map:
                    main_item, extras = merged_map[p_id]
                    extras.append(item)
                    main_item.quantity += item.quantity
                else:
                    merged_map[p_id] = (item, [])

            responses = []
            for p_id, (main_item, extras) in merged_map.items():
                try:
                    product = await self.product_repo.get_by_id(p_id)
                    max_stock = product.stock if (product and hasattr(product, 'stock') and product.stock is not None) else 999
                    
                    # Cap quantity at product stock if needed
                    if main_item.quantity > max_stock:
                        main_item.quantity = max_stock

                    price = (
                        product.discount_price
                        if (product and getattr(product, "discount_price", None) is not None)
                        else (product.price if product else main_item.unit_price)
                    )
                    main_item.unit_price = price
                    main_item.total_price = main_item.quantity * price

                    # Synchronize DB update for main item and remove extra duplicates
                    await self.cart_repo.update(main_item, {
                        "quantity": main_item.quantity,
                        "unit_price": main_item.unit_price,
                        "total_price": main_item.total_price,
                    })
                    for extra in extras:
                        try:
                            await self.cart_repo.delete(extra)
                        except Exception as de:
                            logger.warning(f"Could not delete extra duplicate cart item {extra.id}: {de}")

                    resp = CartResponse.convert_id(main_item)
                    if product:
                        try:
                            resp["product"] = ProductResponse.convert_id(product)
                        except Exception as pe:
                            logger.warning(f"Failed converting product response for product_id {p_id}: {pe}")
                            resp["product"] = None
                    else:
                        resp["product"] = None
                    responses.append(CartResponse(**resp))
                except Exception as item_err:
                    logger.error(f"Error processing cart item {getattr(main_item, 'id', 'unknown')} for user {user_id}: {item_err}")
                    # Still try to convert basic cart item so user doesn't lose items
                    try:
                        resp = CartResponse.convert_id(main_item)
                        resp["product"] = None
                        responses.append(CartResponse(**resp))
                    except Exception:
                        pass

            return responses
        except Exception as exc:
            logger.error(f"Error retrieving cart for user {user_id}: {exc}", exc_info=True)
            return []

    async def update_cart_item(
        self, user_id: str, cart_id: str, data: CartUpdateRequest
    ) -> Cart:
        """Updates the quantity of a cart item with stock verification."""
        try:
            cart_item = await self.cart_repo.get_by_id(cart_id)
            if not cart_item or str(cart_item.user_id) != user_id:
                # Fallback check if cart_id was passed as product_id
                cart_item = await self.cart_repo.get_user_cart_item(user_id, cart_id)
            if not cart_item or str(cart_item.user_id) != user_id:
                raise NotFoundException(message="Cart item not found.")

            product = await self.product_repo.get_by_id(str(cart_item.product_id))
            if not product or not getattr(product, "is_active", True) or getattr(product, "status", None) == "deleted":
                raise NotFoundException(message="Product associated with cart item is not available.")

            stock = getattr(product, "stock", 0)
            if data.quantity > stock:
                raise ValidationException(
                    message=f"Requested quantity ({data.quantity}) exceeds available stock ({stock})."
                )

            price = (
                product.discount_price
                if getattr(product, "discount_price", None) is not None
                else product.price
            )
            update_data = {
                "quantity": data.quantity,
                "unit_price": price,
                "total_price": data.quantity * price,
            }
            return await self.cart_repo.update(cart_item, update_data)
        except (NotFoundException, ValidationException):
            raise
        except Exception as exc:
            logger.error(f"Error updating cart item {cart_id} for user {user_id}: {exc}", exc_info=True)
            raise ValidationException(message=f"Could not update cart item: {str(exc)}")

    async def delete_cart_item(self, user_id: str, cart_id: str) -> None:
        """Deletes a cart item safely and idempotently."""
        try:
            cart_item = await self.cart_repo.get_by_id(cart_id)
            if not cart_item or str(cart_item.user_id) != user_id:
                # Fallback check if cart_id was passed as product_id
                cart_item = await self.cart_repo.get_user_cart_item(user_id, cart_id)
            if not cart_item or str(cart_item.user_id) != user_id:
                # Item already deleted or not in DB - return success (idempotent)
                return
            await self.cart_repo.delete(cart_item)
        except Exception as exc:
            logger.error(f"Error deleting cart item {cart_id} for user {user_id}: {exc}", exc_info=True)

    async def clear_cart(self, user_id: str) -> None:
        """Clears all cart items for a user."""
        try:
            await self.cart_repo.clear_user_cart(user_id)
        except Exception as exc:
            logger.error(f"Error clearing cart for user {user_id}: {exc}", exc_info=True)

    async def get_cart_summary(self, user_id: str) -> CartSummaryResponse:
        """Calculates financials for the user's cart."""
        try:
            cart_items = await self.cart_repo.list_user_cart(user_id)
            total_items = 0
            subtotal = 0.0
            total_discount = 0.0
            grand_total = 0.0

            for item in cart_items:
                try:
                    product = await self.product_repo.get_by_id(str(item.product_id))
                    if not product:
                        continue
                    total_items += item.quantity
                    item_subtotal = item.quantity * product.price
                    subtotal += item_subtotal

                    discount_diff = 0.0
                    if getattr(product, "discount_price", None) is not None:
                        discount_diff = product.price - product.discount_price

                    total_discount += item.quantity * discount_diff
                    grand_total += item.total_price
                except Exception as item_err:
                    logger.warning(f"Error calculating summary item {item.id}: {item_err}")

            return CartSummaryResponse(
                total_items=total_items,
                subtotal=round(subtotal, 2),
                total_discount=round(total_discount, 2),
                grand_total=round(grand_total, 2),
            )
        except Exception as exc:
            logger.error(f"Error building cart summary for user {user_id}: {exc}", exc_info=True)
            return CartSummaryResponse(
                total_items=0,
                subtotal=0.0,
                total_discount=0.0,
                grand_total=0.0,
            )

