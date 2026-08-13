from typing import List, Optional

from app.exceptions import BaseAppException, NotFoundException
from app.models.address import Address
from app.repositories.address_repository import AddressRepository
from app.schemas.address import AddressCreateRequest, AddressUpdateRequest


class AddressService:
    def __init__(self) -> None:
        self.address_repo = AddressRepository()

    async def add_address(self, user_id: str, data: AddressCreateRequest) -> Address:
        """Adds a new address for a user. Clears previous defaults if is_default is True."""
        if data.is_default:
            await self.address_repo.clear_defaults(user_id)

        address_data = {
            "user_id": user_id,
            "full_name": data.full_name,
            "phone": data.phone,
            "address_line1": data.address_line1,
            "address_line2": data.address_line2,
            "city": data.city,
            "state": data.state,
            "country": data.country,
            "postal_code": data.postal_code,
            "landmark": data.landmark,
            "address_type": data.address_type,
            "is_default": data.is_default,
            "status": "active",
        }
        return await self.address_repo.create(address_data)

    async def get_user_addresses(self, user_id: str) -> List[Address]:
        """Fetch all active addresses for a given user."""
        return await self.address_repo.list_user_addresses(user_id)

    async def get_address_details(
        self, user_id: str, address_id: str, is_admin: bool = False
    ) -> Address:
        """Fetch details of an address. Customer accesses own; Admin accesses any."""
        address = await self.address_repo.get_by_id(address_id)
        if not address:
            raise NotFoundException(message="Address not found.")

        # Ownership validation
        if not is_admin and str(address.user_id) != user_id:
            raise BaseAppException(
                status_code=403,
                message="You do not have permission to access this address.",
            )

        return address

    async def update_address(
        self, user_id: str, address_id: str, data: AddressUpdateRequest
    ) -> Address:
        """Updates address fields, clearing defaults if is_default is set to True."""
        address = await self.get_address_details(user_id, address_id)

        update_dict = data.model_dump(exclude_unset=True)

        if update_dict.get("is_default") is True:
            await self.address_repo.clear_defaults(user_id)

        return await self.address_repo.update(address, update_dict)

    async def delete_address(self, user_id: str, address_id: str) -> Address:
        """Soft deletes an address."""
        address = await self.get_address_details(user_id, address_id)
        return await self.address_repo.delete(address)

    async def set_default_address(self, user_id: str, address_id: str) -> Address:
        """Marks a specific address as default, clearing other active addresses default states."""
        address = await self.get_address_details(user_id, address_id)
        await self.address_repo.clear_defaults(user_id)
        return await self.address_repo.update(address, {"is_default": True})
