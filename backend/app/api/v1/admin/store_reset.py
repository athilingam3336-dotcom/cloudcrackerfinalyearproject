import asyncio
import logging
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.dependencies import get_current_admin
from app.core.config import settings
from app.models.user import User
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.payment import Payment
from app.models.cart import Cart
from app.models.wishlist import Wishlist
from app.models.audit_log import AuditLog
from app.services.email_service import EmailService
from app.services.dashboard_service import DashboardService

logger = logging.getLogger("app.api.admin.store_reset")

router = APIRouter(prefix="/admin/store-reset", tags=["Admin Store Reset"])

# In-memory session store for pending store resets
_RESET_SESSIONS: Dict[str, Dict[str, Any]] = {}


def mask_email(email: str) -> str:
    """Mask email displaying only the first letter and hiding the rest: e.g. a***@g***.com"""
    if not email or "@" not in email:
        return "****"
    user_part, domain_part = email.split("@", 1)
    masked_user = (user_part[0] + "***") if len(user_part) > 0 else "***"
    if "." in domain_part:
        parts = domain_part.split(".", 1)
        domain_name, tld = parts[0], parts[1]
        masked_domain = (domain_name[0] + "***." + tld) if len(domain_name) > 0 else "***." + tld
    else:
        masked_domain = (domain_part[0] + "***") if len(domain_part) > 0 else "***"
    return f"{masked_user}@{masked_domain}"


class VerifyResetRequest(BaseModel):
    session_id: str
    otp1: str = Field(..., min_length=4, max_length=10)
    otp2: str = Field(..., min_length=4, max_length=10)
    confirm_text: Optional[str] = Field(default="RESET")


@router.get("/status")
async def get_reset_security_status(current_admin: User = Depends(get_current_admin)):
    """Check how many active admins are registered and whether dual approval is ready."""
    admin_users = await User.find(
        {"role": {"$in": ["ADMIN", "admin"]}, "status": "active"}
    ).to_list()

    unique_admins = []
    seen = set()
    for u in admin_users:
        if u.email and u.email.lower() not in seen:
            if not settings.is_test and (
                "example.com" in u.email.lower()
                or "cloudcrackers.com" in u.email.lower()
                or "dummy" in u.email.lower()
            ):
                continue
            seen.add(u.email.lower())
            unique_admins.append(u)

    can_reset = len(unique_admins) >= 2
    return {
        "success": True,
        "data": {
            "can_reset": can_reset,
            "admin_count": len(unique_admins),
            "requires_dual_otp": True,
            "registered_admins": [a.email for a in unique_admins[:4]],
            "registered_admins_masked": [a.email for a in unique_admins[:4]],
        },
        "message": (
            "Dual-admin authorization ready."
            if can_reset
            else f"Requires at least 2 registered administrators. Current count: {len(unique_admins)}"
        ),
    }


@router.post("/request-otp")
async def request_store_reset_otp(
    current_admin: User = Depends(get_current_admin),
):
    """Initiates Dual-Admin Store Reset procedure.
    Generates 2 distinct 6-digit OTPs and emails them to 2 separate active administrators.
    """
    # 1. Fetch all active admin users from DB
    admin_users = await User.find(
        {"role": {"$in": ["ADMIN", "admin"]}, "status": "active"}
    ).to_list()

    # Filter to unique active admin emails, strictly excluding any fake/dummy accounts unless testing
    unique_admins = []
    seen = set()
    for a in admin_users:
        if a.email and a.email.lower() not in seen:
            if not settings.is_test and (
                "example.com" in a.email.lower()
                or "cloudcrackers.com" in a.email.lower()
                or "dummy" in a.email.lower()
            ):
                continue
            seen.add(a.email.lower())
            unique_admins.append(a)

    if len(unique_admins) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Store data purge requires at least 2 active administrator accounts "
                f"for dual-approval security. Found only {len(unique_admins)}."
            ),
        )

    # 2. Select Admin 1 and Admin 2 strictly from verified unique admins
    admin1 = next((a for a in unique_admins if str(a.id) == str(current_admin.id)), unique_admins[0])
    # Prefer secondary admin email if available (e.g. athilingam362@gmail.com)
    preferred_second = next(
        (a for a in unique_admins if str(a.id) != str(admin1.id) and "athilingam362" in (a.email or "").lower()),
        None
    )
    admin2 = preferred_second or next((a for a in unique_admins if str(a.id) != str(admin1.id)), None)
    if not admin2:
        admin2 = unique_admins[1]

    # 3. Generate two distinct cryptographically secure 6-digit OTPs
    otp1 = f"{secrets.randbelow(900000) + 100000}"
    otp2 = f"{secrets.randbelow(900000) + 100000}"
    while otp2 == otp1:
        otp2 = f"{secrets.randbelow(900000) + 100000}"

    session_id = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    _RESET_SESSIONS[session_id] = {
        "session_id": session_id,
        "requested_by_id": str(current_admin.id),
        "requested_by_name": current_admin.full_name or current_admin.email,
        "admin1_id": str(admin1.id),
        "admin1_email": admin1.email,
        "otp1": otp1,
        "admin2_id": str(admin2.id),
        "admin2_email": admin2.email,
        "otp2": otp2,
        "created_at": datetime.utcnow(),
        "expires_at": expires_at,
    }

    # Clean old expired sessions
    now = datetime.utcnow()
    expired_keys = [k for k, v in _RESET_SESSIONS.items() if v["expires_at"] < now]
    for k in expired_keys:
        _RESET_SESSIONS.pop(k, None)

    # 4. Dispatch verification emails to both admins asynchronously
    requester = current_admin.full_name or current_admin.email

    # Resolve delivery address
    delivery_admin1 = admin1.email
    if settings.is_test and delivery_admin1.endswith("@example.com"):
        delivery_admin1 = settings.SMTP_USER or "athilingam3336@gmail.com"

    delivery_admin2 = admin2.email
    if settings.is_test and delivery_admin2.endswith("@example.com"):
        delivery_admin2 = settings.SMTP_USER or "athilingam3336@gmail.com"

    asyncio.create_task(
        EmailService.send_dual_admin_reset_email(
            to_email=delivery_admin1,
            admin_label="Administrator 1",
            requester_name=requester,
            otp_code=otp1,
        )
    )
    asyncio.create_task(
        EmailService.send_dual_admin_reset_email(
            to_email=delivery_admin2,
            admin_label="Administrator 2",
            requester_name=requester,
            otp_code=otp2,
        )
    )

    logger.info(
        f"[DUAL ADMIN RESET REQUESTED] Session: {session_id} by {current_admin.email}. "
        f"Admin1: {admin1.email} (OTP: {otp1}), Admin2: {admin2.email} (OTP: {otp2})"
    )

    return {
        "success": True,
        "message": (
            f"Dual authorization OTP codes have been sent to 2 administrator emails: "
            f"{admin1.email} and {admin2.email}. "
            "Both OTPs must be provided to complete the deletion."
        ),
        "data": {
            "session_id": session_id,
            "admin1_email": admin1.email,
            "admin2_email": admin2.email,
            "admin1_masked": admin1.email,
            "admin2_masked": admin2.email,
            "expires_in_seconds": 600,
        },
    }


@router.post("/verify-and-reset")
async def verify_and_reset_store(
    payload: VerifyResetRequest,
    current_admin: User = Depends(get_current_admin),
):
    """Verifies BOTH Admin OTPs.
    If BOTH are 100% correct: Permanently purges all orders, payments, order items,
    and carts/wishlists, resetting store analytics to 0.
    If either OTP is invalid or missing, REJECTS without deleting any data.
    """
    session = _RESET_SESSIONS.get(payload.session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset session. Please request new authorization OTPs.",
        )

    if datetime.utcnow() > session["expires_at"]:
        _RESET_SESSIONS.pop(payload.session_id, None)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authorization codes have expired (10-minute limit exceeded). Please request fresh OTPs.",
        )

    # Normalize inputs
    input_otp1 = payload.otp1.strip()
    input_otp2 = payload.otp2.strip()
    expected_otp1 = session["otp1"].strip()
    expected_otp2 = session["otp2"].strip()

    valid_1 = secrets.compare_digest(input_otp1, expected_otp1)
    valid_2 = secrets.compare_digest(input_otp2, expected_otp2)

    # STRICT DUAL VERIFICATION: Both must be valid
    if not valid_1 and not valid_2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both Admin 1 and Admin 2 OTP codes are invalid. Please enter the valid codes sent to each email.",
        )
    if not valid_1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Administrator 1 ({session['admin1_email']}) OTP is invalid. "
                "Both admin OTPs must be valid to authorize deletion. No data was deleted."
            ),
        )
    if not valid_2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Administrator 2 ({session['admin2_email']}) OTP is invalid. "
                "Both admin OTPs must be valid to authorize deletion. No data was deleted."
            ),
        )

    # BOTH OTPS ARE VALID! Perform atomic/batch purge of transaction records
    orders_col = Order.get_pymongo_collection()
    order_items_col = OrderItem.get_pymongo_collection()
    payments_col = Payment.get_pymongo_collection()
    cart_col = Cart.get_pymongo_collection()
    wishlist_col = Wishlist.get_pymongo_collection()

    orders_res = await orders_col.delete_many({})
    order_items_res = await order_items_col.delete_many({})
    payments_res = await payments_col.delete_many({})
    await cart_col.delete_many({})
    await wishlist_col.delete_many({})

    # Clear memory cache in DashboardService so dashboard recalculates from 0 immediately
    DashboardService.clear_cache()

    # Log audit entry
    try:
        await AuditLog(
            user_id=current_admin.id,
            action="STORE_DATA_PURGED",
            resource="store_analytics",
            resource_id="all",
            details={
                "deleted_orders_count": orders_res.deleted_count,
                "deleted_order_items_count": order_items_res.deleted_count,
                "deleted_payments_count": payments_res.deleted_count,
                "admin1": session["admin1_email"],
                "admin2": session["admin2_email"],
                "authorized_by": current_admin.email,
                "purged_at": datetime.utcnow().isoformat(),
            },
        ).insert()
    except Exception as e:
        logger.error(f"Failed to record audit log for store reset: {e}")

    # Remove used session immediately to prevent replay attacks
    _RESET_SESSIONS.pop(payload.session_id, None)

    logger.info(
        f"[STORE RESET COMPLETE] Purged {orders_res.deleted_count} orders, "
        f"{payments_res.deleted_count} payments. Authorized by {current_admin.email}."
    )

    return {
        "success": True,
        "message": (
            "Store orders, customer payments, and transaction history have been permanently purged. "
            "All real-time financial analytics have been reset to ₹0.00."
        ),
        "data": {
            "deleted_orders": orders_res.deleted_count,
            "deleted_order_items": order_items_res.deleted_count,
            "deleted_payments": payments_res.deleted_count,
            "purged_at": datetime.utcnow().isoformat(),
        },
    }
