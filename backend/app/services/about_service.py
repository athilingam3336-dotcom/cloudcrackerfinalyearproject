from typing import Any, Dict
from fastapi import Depends
from app.repositories.about_repository import AboutRepository
from app.models.about import About
from app.schemas.about import AboutCreateUpdate


class AboutService:
    def __init__(self, about_repo: AboutRepository = Depends()):
        self.about_repo = about_repo

    async def get_about(self) -> About:
        """Fetch the single About page configuration."""
        return await self.about_repo.get_about()

    async def update_about(self, data: AboutCreateUpdate, user_id: str) -> About:
        """Update the About page configuration."""
        about = await self.about_repo.get_about()
        update_dict = data.model_dump(exclude_unset=True)
        return await self.about_repo.update_about(about, update_dict, user_id)
