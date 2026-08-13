from bson import ObjectId
from fastapi import APIRouter, Depends, Path, status

from app.core.dependencies import get_current_admin, get_current_user
from app.exceptions import ValidationException
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.refresh_token import CreateRefreshTokenRequest, RefreshTokenResponse
from app.services.refresh_token_service import RefreshTokenService

router = APIRouter(prefix="/tokens", tags=["Refresh Tokens"])
admin_router = APIRouter(prefix="/admin/tokens", tags=["Admin Refresh Tokens"])


def get_validated_user_id(user_id: str = Path(..., description="24-character hex ID of the user")) -> str:
    """Path parameter validator for user ID."""
    if not ObjectId.is_valid(user_id):
        raise ValidationException(
            message="Invalid ID format. Must be a 24-character hexadecimal string."
        )
    return user_id


@router.post(
    "/revoke",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Revoke refresh token (Customer)",
    description="Revokes a single refresh token string provided by the user.",
)
async def revoke_token(
    data: CreateRefreshTokenRequest,
    current_user: User = Depends(get_current_user),
    token_service: RefreshTokenService = Depends(),
) -> ApiResponse:
    token = await token_service.revoke_token(data.token)
    return ApiResponse(
        success=True,
        message="Refresh token revoked successfully.",
        data=RefreshTokenResponse.convert_id(token),
    )


@router.post(
    "/revoke-all",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Revoke all my sessions (Customer)",
    description="Revokes all refresh tokens belonging to the authenticated user.",
)
async def revoke_all_my_tokens(
    current_user: User = Depends(get_current_user),
    token_service: RefreshTokenService = Depends(),
) -> ApiResponse:
    count = await token_service.revoke_all_user_tokens(str(current_user.id))
    return ApiResponse(
        success=True,
        message=f"Revoked {count} refresh tokens for current user.",
        data={"revoked_count": count},
    )


@admin_router.post(
    "/revoke-user/{user_id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Revoke user sessions (Admin Only)",
    description="Revokes all refresh tokens for a specified user ID. Requires Admin role.",
)
async def revoke_user_tokens_admin(
    user_id: str = Depends(get_validated_user_id),
    current_admin: User = Depends(get_current_admin),
    token_service: RefreshTokenService = Depends(),
) -> ApiResponse:
    count = await token_service.revoke_all_user_tokens(user_id)
    return ApiResponse(
        success=True,
        message=f"Revoked {count} refresh tokens for user '{user_id}'.",
        data={"revoked_count": count},
    )
