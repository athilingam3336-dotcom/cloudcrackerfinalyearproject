from datetime import datetime
from typing import Optional

from app.exceptions import NotFoundException, ValidationException
from app.models.coupon import Coupon
from app.repositories.coupon_repository import CouponRepository
from app.schemas.coupon import (
    CouponCreateRequest,
    CouponUpdateRequest,
    CouponValidateRequest,
    CouponValidateResponse,
)


class CouponService:
    def __init__(self) -> None:
        self.coupon_repo = CouponRepository()

    async def create_coupon(self, data: CouponCreateRequest) -> Coupon:
        """Create a new coupon, checking for duplicate codes."""
        code = data.coupon_code.strip().upper()
        existing = await self.coupon_repo.get_by_code(code)
        if existing:
            raise ValidationException(
                message=f"Coupon with code '{code}' already exists."
            )

        coupon_data = {
            "coupon_code": code,
            "description": data.description,
            "discount_type": data.discount_type,
            "percentage": data.percentage,
            "fixed_amount": data.fixed_amount,
            "minimum_order": data.minimum_order,
            "maximum_discount": data.maximum_discount,
            "start_date": data.start_date,
            "expiry_date": data.expiry_date,
            "usage_limit": data.usage_limit,
            "used_count": 0,
            "is_active": data.is_active,
            "status": "active",
        }
        return await self.coupon_repo.create(coupon_data)

    async def update_coupon(self, coupon_id: str, data: CouponUpdateRequest) -> Coupon:
        """Update fields of a coupon."""
        coupon = await self.coupon_repo.get_by_id(coupon_id)
        if not coupon:
            raise NotFoundException(message="Coupon not found.")

        update_dict = data.model_dump(exclude_unset=True)

        if "coupon_code" in update_dict and update_dict["coupon_code"]:
            code = update_dict["coupon_code"].strip().upper()
            if code != coupon.coupon_code:
                if coupon.used_count > 0:
                    raise ValidationException(
                        message="Cannot change coupon code after it has already been used in orders."
                    )
                existing = await self.coupon_repo.get_by_code(code)
                if existing:
                    raise ValidationException(
                        message=f"Coupon with code '{code}' already exists."
                    )
                update_dict["coupon_code"] = code

        return await self.coupon_repo.update(coupon, update_dict)

    async def update_coupon_status(self, coupon_id: str, is_active: bool) -> Coupon:
        """Quick status switch to activate or deactivate a coupon."""
        coupon = await self.coupon_repo.get_by_id(coupon_id)
        if not coupon:
            raise NotFoundException(message="Coupon not found.")
        return await self.coupon_repo.update(coupon, {"is_active": is_active})

    async def delete_coupon(self, coupon_id: str) -> Coupon:
        """Soft delete a coupon."""
        coupon = await self.coupon_repo.get_by_id(coupon_id)
        if not coupon:
            raise NotFoundException(message="Coupon not found.")
        return await self.coupon_repo.delete(coupon)

    async def get_coupon(self, coupon_id: str) -> Coupon:
        """Fetch a coupon by database ID."""
        coupon = await self.coupon_repo.get_by_id(coupon_id)
        if not coupon:
            raise NotFoundException(message="Coupon not found.")
        return coupon

    async def list_coupons(
        self,
        search: Optional[str] = None,
        status_filter: Optional[str] = None,
        page: int = 1,
        limit: int = 10,
    ):
        """Fetch summary metrics and paginated coupons with multi-field search and status filtering."""
        return await self.coupon_repo.list_coupons(
            search=search, status_filter=status_filter, page=page, limit=limit
        )

    async def _validate_coupon_document(
        self, coupon: Coupon, order_total: float
    ) -> float:
        """Helper to run structural validation checks and return the discount amount."""
        if not coupon.is_active or coupon.status == "deleted":
            raise ValidationException(message="Coupon is inactive or disabled.")

        now = datetime.utcnow()
        if coupon.start_date and coupon.start_date > now:
            raise ValidationException(message="Coupon promotion has not started yet.")

        if coupon.expiry_date < now:
            raise ValidationException(message="Coupon has expired.")

        if coupon.used_count >= coupon.usage_limit:
            raise ValidationException(message="Coupon usage limit has been reached.")

        if order_total < coupon.minimum_order:
            raise ValidationException(
                message=f"Order total of {order_total} is below the minimum required total ({coupon.minimum_order}) for this coupon."
            )

        # Calculate discount
        discount = 0.0
        if coupon.discount_type == "percentage":
            discount = (coupon.percentage / 100.0) * order_total
            if coupon.maximum_discount is not None and discount > coupon.maximum_discount:
                discount = coupon.maximum_discount
        else:  # "fixed"
            discount = coupon.fixed_amount
            if discount > order_total:
                discount = order_total

        return round(discount, 2)

    async def validate_coupon(
        self, data: CouponValidateRequest
    ) -> CouponValidateResponse:
        """Validates a coupon code against an order total without claiming usage."""
        code = data.coupon_code.strip().upper()
        coupon = await self.coupon_repo.get_by_code(code)
        if not coupon:
            raise NotFoundException(message="Invalid coupon code.")

        discount = await self._validate_coupon_document(coupon, data.order_total)
        final_amount = round(data.order_total - discount, 2)

        return CouponValidateResponse(
            coupon_code=coupon.coupon_code,
            discount_type=coupon.discount_type,
            discount_amount=discount,
            final_amount=final_amount,
        )

    async def apply_coupon(self, data: CouponValidateRequest) -> CouponValidateResponse:
        """Validates a coupon code and increments its used_count by 1."""
        code = data.coupon_code.strip().upper()
        coupon = await self.coupon_repo.get_by_code(code)
        if not coupon:
            raise NotFoundException(message="Invalid coupon code.")

        discount = await self._validate_coupon_document(coupon, data.order_total)
        final_amount = round(data.order_total - discount, 2)

        # Increment usage counter
        new_count = coupon.used_count + 1
        await self.coupon_repo.update(coupon, {"used_count": new_count})

        return CouponValidateResponse(
            coupon_code=coupon.coupon_code,
            discount_type=coupon.discount_type,
            discount_amount=discount,
            final_amount=final_amount,
        )

