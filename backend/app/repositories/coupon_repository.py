from datetime import datetime
from typing import Any, Dict, Optional
from beanie import PydanticObjectId

from app.models.coupon import Coupon


class CouponRepository:
    async def create(self, coupon_data: Dict[str, Any]) -> Coupon:
        """Insert a new Coupon document."""
        coupon = Coupon(**coupon_data)
        await coupon.insert()
        return coupon

    async def get_by_id(self, coupon_id: str) -> Optional[Coupon]:
        """Fetch coupon by database ID, ignoring soft deleted ones."""
        try:
            cid = PydanticObjectId(coupon_id)
        except Exception:
            return None
        coupon = await Coupon.get(cid)
        if coupon and coupon.status != "deleted":
            return coupon
        return None

    async def get_by_code(self, coupon_code: str) -> Optional[Coupon]:
        """Fetch active coupon by its code string, ignoring soft deleted ones."""
        return await Coupon.find_one(
            Coupon.coupon_code == coupon_code, Coupon.status != "deleted"
        )

    async def update(self, coupon: Coupon, update_data: Dict[str, Any]) -> Coupon:
        """Update coupon fields and save changes."""
        for key, value in update_data.items():
            setattr(coupon, key, value)
        coupon.updated_at = datetime.utcnow()
        await coupon.save()
        return coupon

    async def delete(self, coupon: Coupon) -> Coupon:
        """Soft delete a coupon."""
        coupon.status = "deleted"
        coupon.is_active = False
        coupon.updated_at = datetime.utcnow()
        await coupon.save()
        return coupon

    async def list_coupons(
        self,
        search: Optional[str] = None,
        status_filter: Optional[str] = None,
        page: int = 1,
        limit: int = 10,
    ):
        """Fetch summary metrics and paginated coupons with multi-field search and status filtering."""
        all_coupons = await Coupon.find(Coupon.status != "deleted").to_list()
        now = datetime.utcnow()

        total_coupons = len(all_coupons)
        active_coupons = sum(
            1
            for c in all_coupons
            if c.is_active
            and c.expiry_date >= now
            and (not c.start_date or c.start_date <= now)
            and c.used_count < c.usage_limit
        )
        expiring_soon_count = sum(
            1
            for c in all_coupons
            if c.is_active
            and now <= c.expiry_date <= now.replace(day=now.day + 7 if now.day <= 21 else now.day)
        )
        total_redemptions = sum(c.used_count for c in all_coupons)

        metrics = {
            "total_coupons": total_coupons,
            "active_coupons": active_coupons,
            "expiring_soon_count": expiring_soon_count,
            "total_redemptions": total_redemptions,
        }

        filtered = []
        for c in all_coupons:
            if search and search.strip():
                s = search.strip().lower()
                desc = (c.description or "").lower()
                if s not in c.coupon_code.lower() and s not in desc:
                    continue

            if status_filter and status_filter.lower() not in ["all", ""]:
                sf = status_filter.lower()
                if sf == "active":
                    if not (
                        c.is_active
                        and c.expiry_date >= now
                        and (not c.start_date or c.start_date <= now)
                        and c.used_count < c.usage_limit
                    ):
                        continue
                elif sf == "inactive":
                    if c.is_active:
                        continue
                elif sf == "expired":
                    if c.expiry_date >= now:
                        continue
                elif sf == "upcoming":
                    if not (c.start_date and c.start_date > now):
                        continue
                elif sf in ["usage_limit_reached", "usage limit reached"]:
                    if c.used_count < c.usage_limit:
                        continue

            filtered.append(c)

        filtered.sort(key=lambda x: x.created_at, reverse=True)

        total_matched = len(filtered)
        skip = (page - 1) * limit
        paginated_coupons = filtered[skip : skip + limit]

        return metrics, paginated_coupons, total_matched

