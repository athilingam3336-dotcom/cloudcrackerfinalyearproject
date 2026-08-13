from fastapi import APIRouter, Depends, status

from app.core.dependencies import get_current_admin
from app.models.user import User
from app.schemas.about import AboutCreateUpdate, AboutResponse
from app.schemas.common import ApiResponse
from app.services.about_service import AboutService

router = APIRouter(prefix="/about", tags=["About"])


@router.get(
    "",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Get About information",
    description="Retrieves the application's Dynamic 'About CloudCrackers' information including version and description sections.",
)
async def get_about(
    about_service: AboutService = Depends(),
) -> ApiResponse:
    about = await about_service.get_about()
    return ApiResponse(
        success=True,
        message="About details retrieved successfully",
        data=AboutResponse.convert_id(about),
    )


@router.put(
    "",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Update About information (Admin Only)",
    description="Updates the application version, overview, and custom content sections. Requires admin role authentication.",
)
async def update_about(
    data: AboutCreateUpdate,
    current_admin: User = Depends(get_current_admin),
    about_service: AboutService = Depends(),
) -> ApiResponse:
    about = await about_service.update_about(data, str(current_admin.id))
    return ApiResponse(
        success=True,
        message="About details updated successfully",
        data=AboutResponse.convert_id(about),
    )
