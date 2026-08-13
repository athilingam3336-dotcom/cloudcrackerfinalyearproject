from bson import ObjectId
from fastapi import APIRouter, Depends, File, Path, UploadFile, status

from app.core.dependencies import get_current_admin, get_current_user
from app.exceptions import ValidationException
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.image import (
    DeleteImageResponse,
    ImageMetadataResponse,
    UploadImageResponse,
)
from app.services.image_service import ImageService

router = APIRouter(prefix="/upload", tags=["Upload"])


def get_validated_image_id(image_id: str = Path(...)) -> str:
    """Helper path parameter validator to assert MongoDB ObjectId structure (422)."""
    if not ObjectId.is_valid(image_id):
        raise ValidationException(
            message="Invalid ID format. Must be a 24-character hexadecimal string."
        )
    return image_id


@router.post(
    "/product",
    response_model=ApiResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload product image (Admin Only)",
    description="Uploads a product catalog image. Requires admin privileges.",
)
async def upload_product_image(
    file: UploadFile = File(...),
    current_admin: User = Depends(get_current_admin),
    image_service: ImageService = Depends(),
) -> ApiResponse:
    file_bytes = await file.read()
    file_size = len(file_bytes)
    # Reset stream pointer
    await file.seek(0)

    image = await image_service.upload_image(
        user_id=str(current_admin.id),
        file_name=file.filename or "product.jpg",
        content_type=file.content_type or "image/jpeg",
        file_size=file_size,
        file_stream=file_bytes,
        folder="products",
    )

    metadata = ImageMetadataResponse.convert_id(image)
    payload = UploadImageResponse(
        image_id=str(image.id),
        url=image.url,
        secure_url=image.secure_url,
        public_id=image.public_id,
        metadata=ImageMetadataResponse(**metadata),
    )

    return ApiResponse(
        success=True,
        message="Product image uploaded successfully",
        data=payload,
    )


@router.post(
    "/profile",
    response_model=ApiResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload profile picture (Customer)",
    description="Uploads a customer profile avatar picture.",
)
async def upload_profile_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    image_service: ImageService = Depends(),
) -> ApiResponse:
    file_bytes = await file.read()
    file_size = len(file_bytes)
    await file.seek(0)

    image = await image_service.upload_image(
        user_id=str(current_user.id),
        file_name=file.filename or "profile.jpg",
        content_type=file.content_type or "image/jpeg",
        file_size=file_size,
        file_stream=file_bytes,
        folder="profiles",
    )

    metadata = ImageMetadataResponse.convert_id(image)
    payload = UploadImageResponse(
        image_id=str(image.id),
        url=image.url,
        secure_url=image.secure_url,
        public_id=image.public_id,
        metadata=ImageMetadataResponse(**metadata),
    )

    return ApiResponse(
        success=True,
        message="Profile image uploaded successfully",
        data=payload,
    )


@router.post(
    "/review",
    response_model=ApiResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload review image (Customer)",
    description="Uploads an image attachment for a product review.",
)
async def upload_review_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    image_service: ImageService = Depends(),
) -> ApiResponse:
    file_bytes = await file.read()
    file_size = len(file_bytes)
    await file.seek(0)

    image = await image_service.upload_image(
        user_id=str(current_user.id),
        file_name=file.filename or "review.jpg",
        content_type=file.content_type or "image/jpeg",
        file_size=file_size,
        file_stream=file_bytes,
        folder="reviews",
    )

    metadata = ImageMetadataResponse.convert_id(image)
    payload = UploadImageResponse(
        image_id=str(image.id),
        url=image.url,
        secure_url=image.secure_url,
        public_id=image.public_id,
        metadata=ImageMetadataResponse(**metadata),
    )

    return ApiResponse(
        success=True,
        message="Review image uploaded successfully",
        data=payload,
    )


@router.get(
    "/{image_id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Get image details (Public)",
    description="Fetches stored image metadata logs by image database ID.",
)
async def get_image_details(
    image_id: str = Depends(get_validated_image_id),
    image_service: ImageService = Depends(),
) -> ApiResponse:
    image = await image_service.get_image_details(image_id)
    return ApiResponse(
        success=True,
        message="Image details retrieved successfully",
        data=ImageMetadataResponse.convert_id(image),
    )


@router.put(
    "/{image_id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Replace image (Customer)",
    description="Replaces an uploaded image with a new file, updating Cloudinary assets and keeping metadata DB ID.",
)
async def replace_image(
    file: UploadFile = File(...),
    image_id: str = Depends(get_validated_image_id),
    current_user: User = Depends(get_current_user),
    image_service: ImageService = Depends(),
) -> ApiResponse:
    file_bytes = await file.read()
    file_size = len(file_bytes)
    await file.seek(0)

    image = await image_service.replace_image(
        user_id=str(current_user.id),
        image_id=image_id,
        file_name=file.filename or "replace.jpg",
        content_type=file.content_type or "image/jpeg",
        file_size=file_size,
        file_stream=file_bytes,
    )

    metadata = ImageMetadataResponse.convert_id(image)
    payload = UploadImageResponse(
        image_id=str(image.id),
        url=image.url,
        secure_url=image.secure_url,
        public_id=image.public_id,
        metadata=ImageMetadataResponse(**metadata),
    )

    return ApiResponse(
        success=True,
        message="Image replaced successfully",
        data=payload,
    )


@router.delete(
    "/{image_id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete image (Customer/Admin)",
    description="Deletes an image from Cloudinary and removes metadata logs from database.",
)
async def delete_image(
    image_id: str = Depends(get_validated_image_id),
    current_user: User = Depends(get_current_user),
    image_service: ImageService = Depends(),
) -> ApiResponse:
    is_admin = current_user.role == "ADMIN"
    await image_service.delete_image(
        user_id=str(current_user.id), image_id=image_id, is_admin=is_admin
    )
    return ApiResponse(
        success=True,
        message="Image deleted successfully",
        data=DeleteImageResponse(image_id=image_id),
    )
