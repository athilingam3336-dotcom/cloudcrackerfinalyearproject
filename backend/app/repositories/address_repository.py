from datetime import datetime
from typing import Any, Dict, List, Optional
from beanie import PydanticObjectId

from app.models.address import Address


class AddressRepository:
    async def create(self, address_data: Dict[str, Any]) -> Address:
        """Insert a new Address document."""
        address = Address(**address_data)
        await address.insert()
        return address

    async def get_by_id(self, address_id: str) -> Optional[Address]:
        """Fetch an active address by database ID."""
        try:
            aid = PydanticObjectId(address_id)
        except Exception:
            return None
        address = await Address.get(aid)
        if address and address.status != "deleted":
            return address
        return None

    async def list_user_addresses(self, user_id: str) -> List[Address]:
        """List all active (non-deleted) addresses of a user."""
        try:
            uid = PydanticObjectId(user_id)
        except Exception:
            return []
        return await Address.find(
            Address.user_id == uid, Address.status != "deleted"
        ).to_list()

    async def clear_defaults(self, user_id: str) -> None:
        """Sets is_default to False for all active addresses owned by the user."""
        try:
            uid = PydanticObjectId(user_id)
        except Exception:
            return
        await Address.find(
            Address.user_id == uid, Address.status != "deleted"
        ).update({"$set": {"is_default": False}})

    async def update(self, address: Address, update_data: Dict[str, Any]) -> Address:
        """Update address fields and save changes."""
        for key, value in update_data.items():
            setattr(address, key, value)
        address.updated_at = datetime.utcnow()
        await address.save()
        return address

    async def delete(self, address: Address) -> Address:
        """Soft delete address by setting its status to deleted."""
        address.status = "deleted"
        address.is_default = False
        address.updated_at = datetime.utcnow()
        await address.save()
        return address
