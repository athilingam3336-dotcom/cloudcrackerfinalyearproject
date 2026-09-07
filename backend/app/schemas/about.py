from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, Field, model_validator


class AboutSectionSchema(BaseModel):
    title: str = Field(..., min_length=2, max_length=100)
    content: str = Field(..., min_length=2, max_length=1000)


class AboutCreateUpdate(BaseModel):
    version: str = Field(..., min_length=1, max_length=20)
    description: Optional[str] = Field(None, max_length=500)
    sections: List[AboutSectionSchema] = []


class AboutResponse(BaseModel):
    id: str
    version: str
    description: Optional[str]
    sections: List[AboutSectionSchema]
    updated_at: datetime

    @model_validator(mode="before")
    @classmethod
    def convert_id(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "_id" in data:
                data["id"] = str(data["_id"])
            elif "id" in data:
                data["id"] = str(data["id"])
        elif hasattr(data, "id"):
            data_dict = data.model_dump()
            data_dict["id"] = str(data.id)
            return data_dict
        return data
