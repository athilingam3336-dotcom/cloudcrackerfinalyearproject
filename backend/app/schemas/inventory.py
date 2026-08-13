from datetime import datetime
from typing import Any, List, Optional
from bson import ObjectId
from pydantic import BaseModel, Field, field_validator, model_validator


class InventoryAdjustRequest(BaseModel):
    product_id: str
    transaction_type: str = Field(..., description="Either 'IN', 'OUT', or 'ADJUST'")
    quantity: int = Field(..., ge=0)
    remarks: Optional[str] = None

    @model_validator(mode="after")
    def validate_tx_quantity(self) -> "InventoryAdjustRequest":
        if self.transaction_type in ["IN", "OUT"] and self.quantity < 1:
            raise ValueError("Quantity must be at least 1 for IN or OUT transactions.")
        return self

    @field_validator("product_id")
    @classmethod
    def validate_product_id(cls, v: str) -> str:
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid product_id format. Must be a 24-character hex string.")
        return v

    @field_validator("transaction_type")
    @classmethod
    def validate_tx_type(cls, v: str) -> str:
        if v not in ["IN", "OUT", "ADJUST"]:
            raise ValueError("transaction_type must be either 'IN', 'OUT', or 'ADJUST'.")
        return v


class InventoryHistoryResponse(BaseModel):
    transaction_type: str
    quantity: int
    old_stock: int
    new_stock: int
    remarks: Optional[str] = None
    created_by: str
    created_at: datetime


class InventoryResponse(BaseModel):
    id: str
    product_id: str
    current_stock: int
    minimum_stock: int
    maximum_stock: int
    last_updated: datetime
    history: List[InventoryHistoryResponse] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def convert_id(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "_id" in data:
                data["id"] = str(data["_id"])
            elif "id" in data:
                data["id"] = str(data["id"])
            if "product_id" in data:
                data["product_id"] = str(data["product_id"])
        elif hasattr(data, "id"):
            data_dict = data.model_dump()
            data_dict["id"] = str(data.id)
            data_dict["product_id"] = str(data.product_id)
            return data_dict
        return data


class InventorySummaryMetrics(BaseModel):
    total_products: int
    total_stock_units: int
    low_stock_count: int
    out_of_stock_count: int


class InventoryItemOverview(BaseModel):
    product_id: str
    name: str
    category_id: str
    category_name: str
    price: float
    stock: int
    minimum_stock: int
    maximum_stock: int
    stock_status: str  # "IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"
    images: List[str] = Field(default_factory=list)
    last_updated: datetime


class InventoryOverviewPagination(BaseModel):
    total: int
    page: int
    limit: int
    pages: int


class InventoryOverviewResponseData(BaseModel):
    metrics: InventorySummaryMetrics
    items: List[InventoryItemOverview]
    pagination: InventoryOverviewPagination
