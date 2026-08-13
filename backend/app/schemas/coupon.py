from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, Field, model_validator


class CouponCreateRequest(BaseModel):
    coupon_code: str = Field(..., min_length=2, max_length=50)
    description: Optional[str] = None
    discount_type: str = Field(..., description="Either 'percentage' or 'fixed'")
    percentage: Optional[float] = Field(None, ge=0.0, le=100.0)
    fixed_amount: Optional[float] = Field(None, ge=0.0)
    minimum_order: float = Field(0.0, ge=0.0)
    maximum_discount: Optional[float] = Field(None, ge=0.0)
    start_date: Optional[datetime] = None
    expiry_date: datetime
    usage_limit: int = Field(1, ge=1)
    is_active: bool = True

    @model_validator(mode="after")
    def validate_discount(self) -> "CouponCreateRequest":
        if self.discount_type == "percentage":
            if self.percentage is None or not (0 < self.percentage <= 100):
                raise ValueError("Percentage must be strictly between 0 and 100 for percentage discount type.")
        elif self.discount_type == "fixed":
            if self.fixed_amount is None or self.fixed_amount <= 0:
                raise ValueError("Fixed amount must be strictly greater than 0 for fixed discount type.")
        else:
            raise ValueError("discount_type must be either 'percentage' or 'fixed'.")

        if self.start_date and self.expiry_date and self.expiry_date < self.start_date:
            raise ValueError("Expiry date cannot be earlier than the start date.")
        return self


class CouponUpdateRequest(BaseModel):
    coupon_code: Optional[str] = Field(None, min_length=2, max_length=50)
    description: Optional[str] = None
    discount_type: Optional[str] = None
    percentage: Optional[float] = Field(None, ge=0.0, le=100.0)
    fixed_amount: Optional[float] = Field(None, ge=0.0)
    minimum_order: Optional[float] = Field(None, ge=0.0)
    maximum_discount: Optional[float] = Field(None, ge=0.0)
    start_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    usage_limit: Optional[int] = Field(None, ge=1)
    is_active: Optional[bool] = None

    @model_validator(mode="after")
    def validate_discount(self) -> "CouponUpdateRequest":
        dtype = self.discount_type
        if dtype is not None:
            if dtype == "percentage":
                if self.percentage is None or not (0 < self.percentage <= 100):
                    raise ValueError("Percentage must be strictly between 0 and 100.")
            elif dtype == "fixed":
                if self.fixed_amount is None or self.fixed_amount <= 0:
                    raise ValueError("Fixed amount must be strictly greater than 0.")
            else:
                raise ValueError("discount_type must be either 'percentage' or 'fixed'.")

        if self.start_date and self.expiry_date and self.expiry_date < self.start_date:
            raise ValueError("Expiry date cannot be earlier than the start date.")
        return self


class CouponStatusUpdateRequest(BaseModel):
    is_active: bool


class CouponResponse(BaseModel):
    id: str
    coupon_code: str
    description: Optional[str] = None
    discount_type: str
    percentage: Optional[float] = None
    fixed_amount: Optional[float] = None
    minimum_order: float
    maximum_discount: Optional[float] = None
    start_date: Optional[datetime] = None
    expiry_date: datetime
    usage_limit: int
    used_count: int
    is_active: bool
    coupon_status: str = "ACTIVE"
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
        elif hasattr(data, "id"):
            data_dict = data.model_dump()
            data_dict["id"] = str(data.id)
            # Compute coupon_status
            now = datetime.utcnow()
            if not data.is_active or getattr(data, "status", "active") == "deleted":
                data_dict["coupon_status"] = "INACTIVE"
            elif data.expiry_date < now:
                data_dict["coupon_status"] = "EXPIRED"
            elif getattr(data, "start_date", None) and data.start_date > now:
                data_dict["coupon_status"] = "UPCOMING"
            elif data.used_count >= data.usage_limit:
                data_dict["coupon_status"] = "USAGE_LIMIT_REACHED"
            else:
                data_dict["coupon_status"] = "ACTIVE"
            return data_dict
        return data


class CouponValidateRequest(BaseModel):
    coupon_code: str = Field(..., min_length=1)
    order_total: float = Field(..., gt=0)


class CouponValidateResponse(BaseModel):
    coupon_code: str
    discount_type: str
    discount_amount: float
    final_amount: float


class CouponSummaryMetrics(BaseModel):
    total_coupons: int
    active_coupons: int
    expiring_soon_count: int
    total_redemptions: int


class CouponOverviewPagination(BaseModel):
    total: int
    page: int
    limit: int
    pages: int


class CouponOverviewResponseData(BaseModel):
    metrics: CouponSummaryMetrics
    items: List[CouponResponse]
    pagination: CouponOverviewPagination
