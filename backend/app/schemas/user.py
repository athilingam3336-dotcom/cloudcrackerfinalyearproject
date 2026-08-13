from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, EmailStr, Field, model_validator


class UserSummaryMetrics(BaseModel):
    total_users: int = 0
    active_users: int = 0
    inactive_users: int = 0
    blocked_users: int = 0
    customer_count: int = 0
    admin_count: int = 0


class AdminUserListItem(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    phone: Optional[str] = ""
    role: str
    is_verified: bool
    is_active: bool
    status: str
    created_at: datetime
    updated_at: datetime
    order_count: int = 0
    total_spent: float = 0.0

    @model_validator(mode="before")
    @classmethod
    def convert_id(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "_id" in data:
                data["id"] = str(data["_id"])
            elif "id" in data:
                data["id"] = str(data["id"])
            if data.get("phone") is None:
                data["phone"] = ""
        elif hasattr(data, "id"):
            data_dict = data.model_dump()
            data_dict["id"] = str(data.id)
            if data_dict.get("phone") is None:
                data_dict["phone"] = ""
            return data_dict
        return data


class AdminUserListResponseData(BaseModel):
    users: List[AdminUserListItem]
    total: int
    page: int
    limit: int
    total_pages: int
    metrics: UserSummaryMetrics


class AdminUserDetailResponseData(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    phone: Optional[str] = ""
    role: str
    is_verified: bool
    is_active: bool
    status: str
    created_at: datetime
    updated_at: datetime
    order_summary: Dict[str, Any] = Field(default_factory=dict)
    recent_orders: List[Dict[str, Any]] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def convert_id(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "_id" in data:
                data["id"] = str(data["_id"])
            elif "id" in data:
                data["id"] = str(data["id"])
            if data.get("phone") is None:
                data["phone"] = ""
        elif hasattr(data, "id"):
            data_dict = data.model_dump()
            data_dict["id"] = str(data.id)
            if data_dict.get("phone") is None:
                data_dict["phone"] = ""
            return data_dict
        return data


class CustomerOrderItemData(BaseModel):
    id: str
    product_id: str
    product_name: str
    product_image: Optional[str] = None
    category: Optional[str] = None
    quantity: int
    unit_price: float
    price: float
    subtotal: float
    total: float


class CustomerOrderDetailData(BaseModel):
    id: str
    order_number: str
    user_id: str
    date: str
    created_at: str
    order_status: str
    payment_status: str
    payment_method: str
    subtotal: float
    discount: float = 0.0
    shipping: float = 0.0
    tax: float = 0.0
    total: float
    coupon_code: Optional[str] = None
    coupon_discount: float = 0.0
    shipping_address: str = ""
    item_count: int = 0
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    payment_completed_at: Optional[str] = None
    items: List[CustomerOrderItemData] = Field(default_factory=list)


class UserStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="Account status: active, inactive, or blocked")
    is_active: Optional[bool] = None


class UserRoleUpdateRequest(BaseModel):
    role: str = Field(..., description="User role: CUSTOMER or ADMIN")


class UserOrdersResponseData(BaseModel):
    orders: List[CustomerOrderDetailData]
    total: int
    page: int
    limit: int
    total_pages: int
    order_summary: Dict[str, Any] = Field(default_factory=dict)
