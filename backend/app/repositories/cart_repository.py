from datetime import datetime
from typing import Any, Dict, List, Optional
from beanie import PydanticObjectId

from app.models.cart import Cart


class CartRepository:
    async def get_by_id(self, cart_id: str) -> Optional[Cart]:
        """Fetch a cart item by its ID."""
        try:
            cid = PydanticObjectId(cart_id)
        except Exception:
            return None
        return await Cart.get(cid)

    async def get_user_cart_item(self, user_id: str, product_id: str) -> Optional[Cart]:
        """Fetch a specific cart item for a user and product."""
        try:
            uid = PydanticObjectId(user_id)
            pid = PydanticObjectId(product_id)
        except Exception:
            return None
        return await Cart.find_one(Cart.user_id == uid, Cart.product_id == pid)

    async def list_user_cart(self, user_id: str) -> List[Cart]:
        """List all cart items for a given user."""
        try:
            uid = PydanticObjectId(user_id)
        except Exception:
            return []
        return await Cart.find(Cart.user_id == uid).to_list()

    async def create(self, cart_data: Dict[str, Any]) -> Cart:
        """Create a new cart item document."""
        cart = Cart(**cart_data)
        await cart.insert()
        return cart

    async def update(self, cart: Cart, update_data: Dict[str, Any]) -> Cart:
        """Update properties of a cart item and save."""
        for key, value in update_data.items():
            setattr(cart, key, value)
        cart.updated_at = datetime.utcnow()
        await cart.save()
        return cart

    async def delete(self, cart: Cart) -> None:
        """Delete a cart item document."""
        await cart.delete()

    async def clear_user_cart(self, user_id: str) -> None:
        """Purge all cart items for a user."""
        try:
            uid = PydanticObjectId(user_id)
        except Exception:
            return
        await Cart.find(Cart.user_id == uid).delete()
