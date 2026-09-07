import os
from typing import Any, Dict, List

from app.core import cloudinary as cloud_core
from app.exceptions import BaseAppException, NotFoundException, ValidationException
from app.models.image import Image
from app.repositories.image_repository import ImageRepository

ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"]
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


class ImageService:
    def __init__(self) -> None:
        self.image_repo = ImageRepository()

    def validate_image_file(self, file_name: str, content_type: str, file_size: int) -> None:
        """Validates that the file is an allowed image format under 5 MB in size."""
        # 1. Size check
        if file_size > MAX_FILE_SIZE:
            raise ValidationException(
                message=f"File size exceeds limit of 5 MB. Uploaded size: {file_size / (1024 * 1024):.2f} MB."
            )

        # 2. Mime type check
        if content_type.lower() not in ALLOWED_MIME_TYPES:
            raise ValidationException(
                message=f"Invalid file type: {content_type}. Only JPG, JPEG, PNG, and WEBP formats are allowed."
            )

        # 3. Extension check
        ext = os.path.splitext(file_name)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise ValidationException(
                message=f"Invalid file extension: '{ext}'. Allowed extensions: {', '.join(ALLOWED_EXTENSIONS)}."
            )

    async def upload_image(
        self,
        user_id: str,
        file_name: str,
        content_type: str,
        file_size: int,
        file_stream: Any,
        folder: str = "general",
    ) -> Image:
        """Validates file, uploads to Cloudinary, and saves metadata to DB."""
        self.validate_image_file(file_name, content_type, file_size)

        # Upload to Cloudinary (wrapped async threadpool)
        upload_result = await cloud_core.upload_image(file_stream, folder=folder)

        # Save to DB
        image_data = {
            "user_id": user_id,
            "public_id": upload_result["public_id"],
            "url": upload_result["url"],
            "secure_url": upload_result["secure_url"],
            "resource_type": upload_result.get("resource_type", "image"),
            "format": upload_result.get("format", "jpg"),
            "size": upload_result.get("bytes", file_size),
            "width": upload_result.get("width", 0),
            "height": upload_result.get("height", 0),
            "folder": folder,
        }

        return await self.image_repo.create(image_data)

    async def get_image_details(self, image_id: str) -> Image:
        """Fetch image metadata by ID."""
        image = await self.image_repo.get_by_id(image_id)
        if not image:
            raise NotFoundException(message="Image metadata not found.")
        return image

    async def delete_image(self, user_id: str, image_id: str, is_admin: bool = False) -> None:
        """Deletes image from Cloudinary and deletes database metadata."""
        image = await self.get_image_details(image_id)

        # Ownership validate
        if not is_admin and str(image.user_id) != user_id:
            raise BaseAppException(
                status_code=403,
                message="You do not have permission to delete this image.",
            )

        # Destroy on Cloudinary
        await cloud_core.delete_image(image.public_id)

        # Delete in DB
        await self.image_repo.delete(image)

    async def replace_image(
        self,
        user_id: str,
        image_id: str,
        file_name: str,
        content_type: str,
        file_size: int,
        file_stream: Any,
    ) -> Image:
        """Replaces an existing image on Cloudinary, keeping DB ID but updating metadata."""
        image = await self.get_image_details(image_id)

        if str(image.user_id) != user_id:
            raise BaseAppException(
                status_code=403,
                message="You do not have permission to replace this image.",
            )

        self.validate_image_file(file_name, content_type, file_size)

        # Replace in Cloudinary
        upload_result = await cloud_core.replace_image(image.public_id, file_stream, folder=image.folder)

        # Update DB fields
        update_data = {
            "public_id": upload_result["public_id"],
            "url": upload_result["url"],
            "secure_url": upload_result["secure_url"],
            "resource_type": upload_result.get("resource_type", "image"),
            "format": upload_result.get("format", "jpg"),
            "size": upload_result.get("bytes", file_size),
            "width": upload_result.get("width", 0),
            "height": upload_result.get("height", 0),
        }

        # Update repository record
        for key, value in update_data.items():
            setattr(image, key, value)
        await image.save()

        return image
