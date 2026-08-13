from typing import Any
from pydantic import BaseModel, Field


class ApiResponse(BaseModel):
    success: bool
    message: str
    data: Any = Field(default_factory=dict)
