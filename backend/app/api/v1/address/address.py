from typing import List
from bson import ObjectId
from fastapi import APIRouter, Depends, Path, status

from app.core.dependencies import get_current_user
from app.exceptions import ValidationException
from app.models.user import User
from app.schemas.address import (
    AddressCreateRequest,
    AddressResponse,
    AddressUpdateRequest,
)
from app.schemas.common import ApiResponse
from app.services.address_service import AddressService

router = APIRouter(prefix="/address", tags=["Address"])


def get_validated_address_id(address_id: str = Path(...)) -> str:
    """Helper path parameter validator to assert MongoDB ObjectId structure (422)."""
    if not ObjectId.is_valid(address_id):
        raise ValidationException(
            message="Invalid ID format. Must be a 24-character hexadecimal string."
        )
    return address_id


@router.post(
    "",
    response_model=ApiResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add new address (Customer)",
    description="Adds a shipping/billing address to the authenticated user's account.",
)
async def add_address(
    data: AddressCreateRequest,
    current_user: User = Depends(get_current_user),
    address_service: AddressService = Depends(),
) -> ApiResponse:
    address = await address_service.add_address(str(current_user.id), data)
    return ApiResponse(
        success=True,
        message="Address created successfully",
        data=AddressResponse.convert_id(address),
    )


@router.get(
    "",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="List addresses (Customer)",
    description="Retrieves all active addresses saved in the authenticated user's account.",
)
async def get_addresses(
    current_user: User = Depends(get_current_user),
    address_service: AddressService = Depends(),
) -> ApiResponse:
    addresses = await address_service.get_user_addresses(str(current_user.id))
    serialized = [AddressResponse.convert_id(a) for a in addresses]
    return ApiResponse(
        success=True,
        message="Addresses retrieved successfully",
        data=serialized,
    )


@router.get(
    "/{address_id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Get address details (Customer/Admin)",
    description="Retrieves a specific address. Customers access their own; Admins retrieve any.",
)
async def get_address(
    address_id: str = Depends(get_validated_address_id),
    current_user: User = Depends(get_current_user),
    address_service: AddressService = Depends(),
) -> ApiResponse:
    is_admin = current_user.role == "ADMIN"
    address = await address_service.get_address_details(
        str(current_user.id), address_id, is_admin=is_admin
    )
    return ApiResponse(
        success=True,
        message="Address details retrieved successfully",
        data=AddressResponse.convert_id(address),
    )


@router.put(
    "/{address_id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Update address (Customer)",
    description="Updates details of a saved address in the customer's account.",
)
async def update_address(
    data: AddressUpdateRequest,
    address_id: str = Depends(get_validated_address_id),
    current_user: User = Depends(get_current_user),
    address_service: AddressService = Depends(),
) -> ApiResponse:
    address = await address_service.update_address(str(current_user.id), address_id, data)
    return ApiResponse(
        success=True,
        message="Address updated successfully",
        data=AddressResponse.convert_id(address),
    )


@router.delete(
    "/{address_id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete address (Customer)",
    description="Soft-deletes a saved address from the customer's account.",
)
async def delete_address(
    address_id: str = Depends(get_validated_address_id),
    current_user: User = Depends(get_current_user),
    address_service: AddressService = Depends(),
) -> ApiResponse:
    await address_service.delete_address(str(current_user.id), address_id)
    return ApiResponse(
        success=True,
        message="Address deleted successfully",
        data=None,
    )


@router.put(
    "/{address_id}/default",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Set default address (Customer)",
    description="Marks a specific address as default, clearing other default flags.",
)
async def set_default_address(
    address_id: str = Depends(get_validated_address_id),
    current_user: User = Depends(get_current_user),
    address_service: AddressService = Depends(),
) -> ApiResponse:
    address = await address_service.set_default_address(str(current_user.id), address_id)
    return ApiResponse(
        success=True,
        message="Default address updated successfully",
        data=AddressResponse.convert_id(address),
    )
