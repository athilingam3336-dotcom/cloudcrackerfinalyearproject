from datetime import datetime
from typing import Any, Dict, List, Optional
from bson import ObjectId
from pydantic import BaseModel, Field, field_validator, model_validator


class PaymentCreateRequest(BaseModel):
    order_id: str
    payment_method: str = Field(..., min_length=2, max_length=50)
    gateway: str = Field(..., min_length=2, max_length=50)
    amount: float = Field(..., gt=0)
    currency: str = "USD"

    @field_validator("order_id")
    @classmethod
    def validate_order_id(cls, v: str) -> str:
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid order_id format. Must be a 24-character hex string.")
        return v


class PaymentVerifyRequest(BaseModel):
    transaction_id: str
    verification_status: str = Field(..., min_length=2, max_length=20)  # "Success" or "Failed"
    gateway_response: Optional[Dict[str, Any]] = None
    failure_reason: Optional[str] = None

    @field_validator("verification_status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in ["Success", "Failed"]:
            raise ValueError("verification_status must be either 'Success' or 'Failed'.")
        return v


class PaymentResponse(BaseModel):
    id: str
    order_id: str
    user_id: str
    payment_method: str
    payment_status: str
    transaction_id: str
    gateway: str
    amount: float
    currency: str
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None
    payment_created_at: Optional[datetime] = None
    payment_completed_at: Optional[datetime] = None
    payment_date: Optional[datetime] = None
    gateway_response: Optional[Dict[str, Any]] = None
    failure_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

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
            if "user_id" in data:
                data["user_id"] = str(data["user_id"])
        elif hasattr(data, "id"):
            data_dict = data.model_dump()
            data_dict["id"] = str(data.id)
            data_dict["order_id"] = str(data.order_id)
            data_dict["user_id"] = str(data.user_id)
            return data_dict
        return data


class RazorpayOrderCreateRequest(BaseModel):
    order_id: Optional[str] = None
    shipping_address: Optional[str] = None
    coupon_code: Optional[str] = None
    delivery_method: Optional[str] = "standard"


class RazorpayOrderCreateResponse(BaseModel):
    razorpay_order_id: str
    razorpay_key_id: str
    amount: int  # in paise
    currency: str = "INR"
    order_id: str
    order_number: str
    subtotal: float
    discount: float
    coupon_discount: float
    shipping: float
    tax: float
    total: float


class RazorpayPaymentVerifyRequest(BaseModel):
    razorpay_order_id: str = Field(..., min_length=1)
    razorpay_payment_id: str = Field(..., min_length=1)
    razorpay_signature: str = Field(..., min_length=1)


class PaymentStatusResponse(BaseModel):
    transaction_id: str
    payment_status: str


class PaymentHistoryResponse(BaseModel):
    payments: List[PaymentResponse]
    total: int

