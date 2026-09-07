from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, Field, model_validator

from app.schemas.product import ProductResponse


class CheckoutRequest(BaseModel):
    payment_method: str = Field(..., min_length=2, max_length=50)
    shipping_address: str = Field(..., min_length=5, max_length=500)
    coupon_code: Optional[str] = None


class OrderItemResponse(BaseModel):
    id: str
    order_id: str
    product_id: str
    quantity: int
    price: float
    product: Optional[ProductResponse] = None

    @model_validator(mode="before")
    @classmethod
    def convert_id(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "_id" in data:
                data["id"] = str(data["_id"])
            elif "id" in data:
                data["id"] = str(data["id"])
            if "order_id" in data:
                data["order_id"] = str(data["order_id"])
            if "product_id" in data:
                data["product_id"] = str(data["product_id"])
        elif hasattr(data, "id"):
            data_dict = data.model_dump()
            data_dict["id"] = str(data.id)
            data_dict["order_id"] = str(data.order_id)
            data_dict["product_id"] = str(data.product_id)
            return data_dict
        return data


class OrderResponse(BaseModel):
    id: str
    order_number: str
    user_id: str
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    subtotal: float
    discount: float
    coupon_code: Optional[str] = None
    coupon_discount: float = 0.0
    shipping: float
    tax: float
    total: float
    payment_method: str
    payment_status: str
    order_status: str
    shipping_address: str
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemResponse] = Field(default_factory=list)


    @model_validator(mode="before")
    @classmethod
    def convert_id(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "_id" in data:
                data["id"] = str(data["_id"])
            elif "id" in data:
                data["id"] = str(data["id"])
            if "user_id" in data:
                data["user_id"] = str(data["user_id"])
        elif hasattr(data, "id"):
            data_dict = data.model_dump()
            data_dict["id"] = str(data.id)
            data_dict["user_id"] = str(data.user_id)
            return data_dict
        return data


class OrderSummaryResponse(BaseModel):
    total_orders: int
    total_spent: float
    pending_orders: int
    completed_orders: int


class AdminOrderStatusUpdateRequest(BaseModel):
    order_status: str = Field(..., description="Pending, Confirmed, Packed, Shipped, Delivered, Cancelled")


class AdminPaymentStatusUpdateRequest(BaseModel):
    payment_status: str = Field(..., description="Pending, Paid, Failed, Refunded")


class AdminOrderListItem(BaseModel):
    id: str
    order_number: str
    user_id: str
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    subtotal: float
    discount: float
    shipping: float
    tax: float
    total: float
    payment_method: str
    payment_status: str
    order_status: str
    shipping_address: str
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    item_count: int = 0
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemResponse] = Field(default_factory=list)


class AdminOrderListResponseData(BaseModel):
    orders: List[AdminOrderListItem]
    total: int
    page: int
    limit: int
    total_pages: int

