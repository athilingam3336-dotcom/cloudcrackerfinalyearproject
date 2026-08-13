from datetime import datetime
from typing import Any, Dict, List, Optional
from beanie import PydanticObjectId

from app.models.wishlist import Wishlist


class WishlistRepository:
    async def get_by_id(self, wishlist_id: str) -> Optional[Wishlist]:
        """Fetch a wishlist item by its database ID."""
        try:
            wid = PydanticObjectId(wishlist_id)
        except Exception:
            return None
        return await Wishlist.get(wid)

    async def get_user_wishlist_item(
        self, user_id: str, product_id: str
    ) -> Optional[Wishlist]:
        """Fetch a specific wishlist item for a user and product."""
        try:
            uid = PydanticObjectId(user_id)
            pid = PydanticObjectId(product_id)
        except Exception:
            return None
        return await Wishlist.find_one(
            Wishlist.user_id == uid, Wishlist.product_id == pid
        )

    async def list_user_wishlist(self, user_id: str) -> List[Wishlist]:
        """List all wishlist items for a given user."""
        try:
            uid = PydanticObjectId(user_id)
        except Exception:
            return []
        return await Wishlist.find(Wishlist.user_id == uid).to_list()

    async def create(self, wishlist_data: Dict[str, Any]) -> Wishlist:
        """Create a new wishlist entry document."""
        wishlist = Wishlist(**wishlist_data)
        await wishlist.insert()
        return wishlist

    async def delete(self, wishlist: Wishlist) -> None:
        """Delete a wishlist document."""
        await wishlist.delete()

    async def clear_user_wishlist(self, user_id: str) -> None:
        """Purge all wishlist entries for a user."""
        try:
            uid = PydanticObjectId(user_id)
        except Exception:
            return
        await Wishlist.find(Wishlist.user_id == uid).delete()
