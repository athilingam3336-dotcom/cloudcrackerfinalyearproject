import cloudinary
import cloudinary.uploader
from starlette.concurrency import run_in_threadpool
from typing import Any, Dict

from app.core.config import settings

# Configure Cloudinary if properties are supplied
if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


async def upload_image(file_data: Any, folder: str = "cloudcrackers") -> Dict[str, Any]:
    """Uploads an image file object or stream to Cloudinary inside a threadpool worker."""
    if not (settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET):
        # Fallback Mock return for local testing or CI testing
        import uuid
        mock_id = f"mock_{uuid.uuid4().hex}"
        return {
            "public_id": f"{folder}/{mock_id}",
            "url": f"http://res.cloudinary.com/mock/image/upload/{folder}/{mock_id}.jpg",
            "secure_url": f"https://res.cloudinary.com/mock/image/upload/{folder}/{mock_id}.jpg",
            "resource_type": "image",
            "format": "jpg",
            "bytes": 50000,
            "width": 800,
            "height": 600,
            "folder": folder,
        }

    return await run_in_threadpool(
        cloudinary.uploader.upload,
        file_data,
        folder=folder,
    )


async def delete_image(public_id: str) -> Dict[str, Any]:
    """Deletes an image from Cloudinary using its public_id."""
    if not (settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET):
        return {"result": "ok"}

    return await run_in_threadpool(
        cloudinary.uploader.destroy,
        public_id,
    )


async def replace_image(public_id: str, file_data: Any, folder: str = "cloudcrackers") -> Dict[str, Any]:
    """Replaces an existing image by deleting the old public_id and uploading the new one."""
    await delete_image(public_id)
    return await upload_image(file_data, folder=folder)
