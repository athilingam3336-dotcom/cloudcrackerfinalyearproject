from typing import Any, Dict, Optional
from beanie import PydanticObjectId

from app.models.image import Image


class ImageRepository:
    async def create(self, image_data: Dict[str, Any]) -> Image:
        """Insert a new Image metadata record."""
        image = Image(**image_data)
        await image.insert()
        return image

    async def get_by_id(self, image_id: str) -> Optional[Image]:
        """Fetch image metadata by ID."""
        try:
            iid = PydanticObjectId(image_id)
        except Exception:
            return None
        return await Image.get(iid)

    async def delete(self, image: Image) -> None:
        """Hard delete image metadata record from database."""
        await image.delete()
