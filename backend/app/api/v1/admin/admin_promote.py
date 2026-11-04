import asyncio
import logging
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from app.core.dependencies import get_current_admin
from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User
from app.models.audit_log import AuditLog
from app.services.email_service import EmailService

logger = logging.getLogger("app.api.admin.admin_promote")

router = APIRouter(prefix="/admin/promote-admin", tags=["Admin Promotion & Demotion"])

# In-memory session stores for multi-stage admin promotion and demotion
_PROMOTION_SESSIONS: Dict[str, Dict[str, Any]] = {}
_DEMOTION_SESSIONS: Dict[str, Dict[str, Any]] = {}


class RequestPromotionPayload(BaseModel):
    candidate_email: EmailStr
    full_name: Optional[str] = None


class VerifyDualOtpPayload(BaseModel):
    session_id: str
    admin1_otp: str = Field(..., min_length=4, max_length=10)
    admin2_otp: str = Field(..., min_length=4, max_length=10)


class VerifyCandidatePayload(BaseModel):
    session_id: str
    candidate_otp: str = Field(..., min_length=4, max_length=10)
    temporary_password: Optional[str] = Field(default=None, max_length=50)


class RequestDemotionPayload(BaseModel):
    target_admin_email: EmailStr


class VerifyDemotionPayload(BaseModel):
    session_id: str
    admin1_otp: str = Field(..., min_length=4, max_length=10)
    admin2_otp: str = Field(..., min_length=4, max_length=10)


def _cleanup_expired_sessions() -> None:
    now = datetime.utcnow()
    expired_p = [k for k, v in _PROMOTION_SESSIONS.items() if v.get("expires_at", now) < now]
    for k in expired_p:
        _PROMOTION_SESSIONS.pop(k, None)

    expired_d = [k for k, v in _DEMOTION_SESSIONS.items() if v.get("expires_at", now) < now]
    for k in expired_d:
        _DEMOTION_SESSIONS.pop(k, None)


@router.get("/status")
async def get_promotion_security_status(current_admin: User = Depends(get_current_admin)):
    """Check registered active admins ready for dual approval."""
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

    can_promote = len(unique_admins) >= 2
    return {
        "success": True,
        "data": {
            "can_promote": can_promote,
            "admin_count": len(unique_admins),
            "requires_dual_otp": True,
            "registered_admins": [a.email for a in unique_admins[:4]],
        },
        "message": (
            "Dual-admin authorization ready."
            if can_promote
            else f"Requires at least 2 active administrators. Found {len(unique_admins)}."
        ),
    }


@router.post("/request-promotion")
async def request_admin_promotion(
    payload: RequestPromotionPayload,
    current_admin: User = Depends(get_current_admin),
):
    """Stage 1: Validates candidate email and dispatches dual-authorization OTPs to 2 existing admins."""
    _cleanup_expired_sessions()
    candidate_email = payload.candidate_email.strip().lower()

    if not settings.is_test and ("example.com" in candidate_email or "cloudcrackers.com" in candidate_email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dummy email domains (@example.com / @cloudcrackers.com) cannot be used.",
        )

    # 1. Check if candidate is already an active admin
    existing_admin = await User.find_one(
        {"email": candidate_email, "role": {"$in": ["ADMIN", "admin"]}, "status": "active"}
    )
    if existing_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"The account '{candidate_email}' is already an active administrator.",
        )

    # 2. Gather active administrators
    admin_users = await User.find(
        {"role": {"$in": ["ADMIN", "admin"]}, "status": "active"}
    ).to_list()

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
                "Promoting a new administrator requires dual approval from at least 2 existing admins. "
                f"Found only {len(unique_admins)}."
            ),
        )

    # Select Admin 1 and Admin 2
    admin1 = next((a for a in unique_admins if str(a.id) == str(current_admin.id)), unique_admins[0])
    preferred_second = next(
        (a for a in unique_admins if str(a.id) != str(admin1.id) and "athilingam362" in (a.email or "").lower()),
        None,
    )
    admin2 = preferred_second or next((a for a in unique_admins if str(a.id) != str(admin1.id)), None)
    if not admin2:
        admin2 = unique_admins[1]

    # 3. Generate distinct OTPs for Admin 1, Admin 2, and Candidate
    admin1_otp = f"{secrets.randbelow(900000) + 100000}"
    admin2_otp = f"{secrets.randbelow(900000) + 100000}"
    while admin2_otp == admin1_otp:
        admin2_otp = f"{secrets.randbelow(900000) + 100000}"

    candidate_otp = f"{secrets.randbelow(900000) + 100000}"
    while candidate_otp in (admin1_otp, admin2_otp):
        candidate_otp = f"{secrets.randbelow(900000) + 100000}"

    session_id = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    _PROMOTION_SESSIONS[session_id] = {
        "session_id": session_id,
        "requested_by_id": str(current_admin.id),
        "requested_by_name": current_admin.full_name or current_admin.email,
        "candidate_email": candidate_email,
        "candidate_name": payload.full_name or candidate_email.split("@")[0].title(),
        "admin1_id": str(admin1.id),
        "admin1_email": admin1.email,
        "admin1_otp": admin1_otp,
        "admin2_id": str(admin2.id),
        "admin2_email": admin2.email,
        "admin2_otp": admin2_otp,
        "candidate_otp": candidate_otp,
        "dual_approved": False,
        "created_at": datetime.utcnow(),
        "expires_at": expires_at,
    }

    # 4. Dispatch dual approval emails to Admin 1 and Admin 2
    requester = current_admin.full_name or current_admin.email

    delivery_admin1 = admin1.email
    if settings.is_test and delivery_admin1.endswith("@example.com"):
        delivery_admin1 = settings.SMTP_USER or "athilingam3336@gmail.com"

    delivery_admin2 = admin2.email
    if settings.is_test and delivery_admin2.endswith("@example.com"):
        delivery_admin2 = settings.SMTP_USER or "athilingam3336@gmail.com"

    asyncio.create_task(
        EmailService.send_dual_admin_promotion_email(
            to_email=delivery_admin1,
            admin_label="Administrator 1",
            requester_name=requester,
            candidate_email=candidate_email,
            otp_code=admin1_otp,
        )
    )
    asyncio.create_task(
        EmailService.send_dual_admin_promotion_email(
            to_email=delivery_admin2,
            admin_label="Administrator 2",
            requester_name=requester,
            candidate_email=candidate_email,
            otp_code=admin2_otp,
        )
    )

    logger.info(
        f"[ADMIN PROMOTION INITIATED] Session: {session_id} for candidate '{candidate_email}'. "
        f"Admin1: {admin1.email} (OTP: {admin1_otp}), Admin2: {admin2.email} (OTP: {admin2_otp})"
    )

    return {
        "success": True,
        "message": (
            f"Dual authorization OTP codes sent to {admin1.email} and {admin2.email}. "
            f"Both codes are required to authorize granting admin role to {candidate_email}."
        ),
        "data": {
            "session_id": session_id,
            "candidate_email": candidate_email,
            "candidate_name": _PROMOTION_SESSIONS[session_id]["candidate_name"],
            "admin1_email": admin1.email,
            "admin2_email": admin2.email,
            "expires_in_seconds": 600,
        },
    }


@router.post("/resend-dual-otp")
async def resend_dual_otp(
    payload: Dict[str, str],
    current_admin: User = Depends(get_current_admin),
):
    """Resends dual authorization codes to Admin 1 and Admin 2."""
    session_id = payload.get("session_id")
    session = _PROMOTION_SESSIONS.get(session_id)
    if not session or datetime.utcnow() > session["expires_at"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Promotion session expired or invalid. Please request fresh authorization.",
        )

    requester = current_admin.full_name or current_admin.email
    asyncio.create_task(
        EmailService.send_dual_admin_promotion_email(
            to_email=session["admin1_email"],
            admin_label="Administrator 1",
            requester_name=requester,
            candidate_email=session["candidate_email"],
            otp_code=session["admin1_otp"],
        )
    )
    asyncio.create_task(
        EmailService.send_dual_admin_promotion_email(
            to_email=session["admin2_email"],
            admin_label="Administrator 2",
            requester_name=requester,
            candidate_email=session["candidate_email"],
            otp_code=session["admin2_otp"],
        )
    )
    return {"success": True, "message": "Authorization codes resent to both administrators."}


@router.post("/verify-dual-otp")
async def verify_dual_otp(
    payload: VerifyDualOtpPayload,
    current_admin: User = Depends(get_current_admin),
):
    """Stage 2: Verifies BOTH existing admin OTPs.
    If valid: sets dual_approved=True and dispatches verification OTP to candidate_email.
    """
    session = _PROMOTION_SESSIONS.get(payload.session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired promotion session. Please request new authorization OTPs.",
        )

    if datetime.utcnow() > session["expires_at"]:
        _PROMOTION_SESSIONS.pop(payload.session_id, None)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authorization window expired (10-minute limit). Please request fresh OTPs.",
        )

    input1 = payload.admin1_otp.strip()
    input2 = payload.admin2_otp.strip()
    valid1 = secrets.compare_digest(input1, session["admin1_otp"].strip())
    valid2 = secrets.compare_digest(input2, session["admin2_otp"].strip())

    if not valid1 and not valid2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both Admin 1 and Admin 2 OTP codes are invalid. Please enter valid codes sent to each email.",
        )
    if not valid1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Administrator 1 ({session['admin1_email']}) OTP is invalid. Both admin codes must be valid.",
        )
    if not valid2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Administrator 2 ({session['admin2_email']}) OTP is invalid. Both admin codes must be valid.",
        )

    # Both valid! Mark dual approval complete
    session["dual_approved"] = True

    # Dispatch verification OTP to candidate email
    candidate_email = session["candidate_email"]
    candidate_name = session["candidate_name"]
    candidate_otp = session["candidate_otp"]

    delivery_candidate = candidate_email
    if settings.is_test and delivery_candidate.endswith("@example.com"):
        delivery_candidate = settings.SMTP_USER or "athilingam3336@gmail.com"

    asyncio.create_task(
        EmailService.send_candidate_admin_otp_email(
            to_email=delivery_candidate,
            candidate_name=candidate_name,
            otp_code=candidate_otp,
        )
    )

    logger.info(
        f"[DUAL APPROVAL VERIFIED] Session {payload.session_id}. "
        f"Verification OTP ({candidate_otp}) sent to candidate: {candidate_email}"
    )

    return {
        "success": True,
        "stage": "candidate_verification",
        "message": (
            f"Dual admin approval verified successfully! A 6-digit activation code has been sent "
            f"to the candidate email: {candidate_email}."
        ),
        "data": {
            "session_id": payload.session_id,
            "candidate_email": candidate_email,
            "candidate_name": candidate_name,
            "dual_approved": True,
            "expires_in_seconds": max(1, int((session["expires_at"] - datetime.utcnow()).total_seconds())),
        },
    }


@router.post("/resend-candidate-otp")
async def resend_candidate_otp(
    payload: Dict[str, str],
    current_admin: User = Depends(get_current_admin),
):
    """Resends verification code to candidate email."""
    session_id = payload.get("session_id")
    session = _PROMOTION_SESSIONS.get(session_id)
    if not session or not session.get("dual_approved") or datetime.utcnow() > session["expires_at"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session invalid or dual approval not yet completed.",
        )

    candidate_email = session["candidate_email"]
    delivery_candidate = candidate_email
    if settings.is_test and delivery_candidate.endswith("@example.com"):
        delivery_candidate = settings.SMTP_USER or "athilingam3336@gmail.com"

    asyncio.create_task(
        EmailService.send_candidate_admin_otp_email(
            to_email=delivery_candidate,
            candidate_name=session["candidate_name"],
            otp_code=session["candidate_otp"],
        )
    )
    return {"success": True, "message": f"Activation code resent to {candidate_email}."}


@router.post("/verify-candidate-and-promote")
async def verify_candidate_and_promote(
    payload: VerifyCandidatePayload,
    current_admin: User = Depends(get_current_admin),
):
    """Stage 3: Verifies candidate email OTP and grants full ADMIN privileges."""
    session = _PROMOTION_SESSIONS.get(payload.session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired promotion session. Please restart authorization.",
        )

    if not session.get("dual_approved"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dual administrator consent has not been verified yet for this session.",
        )

    if datetime.utcnow() > session["expires_at"]:
        _PROMOTION_SESSIONS.pop(payload.session_id, None)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authorization window expired (10-minute limit). Please request fresh OTPs.",
        )

    input_otp = payload.candidate_otp.strip()
    if not secrets.compare_digest(input_otp, session["candidate_otp"].strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Candidate OTP is invalid. Please check '{session['candidate_email']}' and enter the correct 6-digit code.",
        )

    candidate_email = session["candidate_email"]
    candidate_name = session["candidate_name"]

    # Check if user already exists
    user = await User.find_one({"email": candidate_email})
    default_pw = payload.temporary_password or "AdminPassword123!"

    if user:
        user.role = "ADMIN"
        user.status = "active"
        user.is_active = True
        user.is_verified = True
        if payload.temporary_password:
            user.password_hash = hash_password(payload.temporary_password)
        elif not user.password_hash:
            user.password_hash = hash_password(default_pw)
        user.updated_at = datetime.utcnow()
        await user.save()
    else:
        user = User(
            email=candidate_email,
            full_name=candidate_name,
            role="ADMIN",
            status="active",
            is_active=True,
            is_verified=True,
            password_hash=hash_password(default_pw),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        await user.insert()

    # Dispatch confirmation email
    delivery_candidate = candidate_email
    if settings.is_test and delivery_candidate.endswith("@example.com"):
        delivery_candidate = settings.SMTP_USER or "athilingam3336@gmail.com"

    asyncio.create_task(
        EmailService.send_admin_role_granted_confirmation(
            to_email=delivery_candidate,
            user_name=candidate_name,
        )
    )

    # Audit Log
    try:
        await AuditLog(
            user_id=current_admin.id,
            action="ADMIN_ROLE_PROMOTED",
            resource="users",
            resource_id=str(user.id),
            details={
                "candidate_email": candidate_email,
                "promoted_by": current_admin.email,
                "admin1_approved": session["admin1_email"],
                "admin2_approved": session["admin2_email"],
                "promoted_at": datetime.utcnow().isoformat(),
            },
        ).insert()
    except Exception as e:
        logger.warning(f"Failed to record AuditLog for admin promotion: {e}")

    # Pop session
    _PROMOTION_SESSIONS.pop(payload.session_id, None)

    logger.info(
        f"[ADMIN PROMOTION COMPLETE] Successfully promoted '{candidate_email}' to ADMIN. "
        f"Authorized by {session['admin1_email']} and {session['admin2_email']}."
    )

    return {
        "success": True,
        "message": f"Successfully granted Administrator role to {candidate_email}.",
        "data": {
            "email": candidate_email,
            "full_name": user.full_name,
            "role": "ADMIN",
            "status": "active",
            "is_active": True,
            "is_verified": True,
        },
    }


# ============================================================================
# ADMINISTRATOR DEMOTION / REMOVAL FLOW (DUAL-ADMIN SECURITY APPROVAL)
# ============================================================================


@router.get("/admins-list")
async def get_active_admins_list(current_admin: User = Depends(get_current_admin)):
    """Lists current active administrators and indicates if admin removal is allowed."""
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

    can_demote = len(unique_admins) >= 3
    return {
        "success": True,
        "data": {
            "admin_count": len(unique_admins),
            "can_demote": can_demote,
            "admins": [
                {
                    "id": str(u.id),
                    "email": u.email,
                    "full_name": u.full_name or u.email.split("@")[0].title(),
                    "is_current_user": str(u.id) == str(current_admin.id),
                }
                for u in unique_admins
            ],
            "min_required_for_removal": 3,
        },
        "message": (
            "Admin removal ready (Dual-Admin approval supported)."
            if can_demote
            else f"Requires at least 3 administrators to remove one (preserving dual-admin security). Currently: {len(unique_admins)}."
        ),
    }


@router.post("/request-demotion")
async def request_admin_demotion(
    payload: RequestDemotionPayload,
    current_admin: User = Depends(get_current_admin),
):
    """Stage 1 of Demotion: Validates target admin and dispatches dual OTPs to the OTHER 2 active administrators.

    CRITICAL SECURITY RULE: The admin being removed (target_admin_email) NEVER receives an approval OTP!
    """
    _cleanup_expired_sessions()
    target_email = payload.target_admin_email.strip().lower()

    # 1. Target admin must exist and be active
    target_user = await User.find_one(
        {"email": target_email, "role": {"$in": ["ADMIN", "admin"]}, "status": "active"}
    )
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No active administrator found with email '{target_email}'.",
        )

    # 2. Gather all active administrators
    admin_users = await User.find(
        {"role": {"$in": ["ADMIN", "admin"]}, "status": "active"}
    ).to_list()

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

    if len(unique_admins) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Removing an administrator requires dual-admin authorization from 2 OTHER administrators. "
                f"There must be at least 3 active admins in total. Found only {len(unique_admins)}."
            ),
        )

    # 3. Select 2 approving admins strictly EXCLUDING target_admin
    eligible_approvers = [a for a in unique_admins if a.email.lower() != target_email]
    if len(eligible_approvers) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not enough remaining administrators to form a dual authorization quorum.",
        )

    # Prefer current_admin if they are not the target
    admin1 = next((a for a in eligible_approvers if str(a.id) == str(current_admin.id)), eligible_approvers[0])
    admin2 = next((a for a in eligible_approvers if str(a.id) != str(admin1.id)), eligible_approvers[1])

    # 4. Generate distinct 6-digit OTPs for Admin 1 and Admin 2
    admin1_otp = f"{secrets.randbelow(900000) + 100000}"
    admin2_otp = f"{secrets.randbelow(900000) + 100000}"
    while admin2_otp == admin1_otp:
        admin2_otp = f"{secrets.randbelow(900000) + 100000}"

    session_id = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    _DEMOTION_SESSIONS[session_id] = {
        "session_id": session_id,
        "requested_by_id": str(current_admin.id),
        "requested_by_name": current_admin.full_name or current_admin.email,
        "target_admin_id": str(target_user.id),
        "target_admin_email": target_email,
        "target_admin_name": target_user.full_name or target_email.split("@")[0].title(),
        "admin1_id": str(admin1.id),
        "admin1_email": admin1.email,
        "admin1_otp": admin1_otp,
        "admin2_id": str(admin2.id),
        "admin2_email": admin2.email,
        "admin2_otp": admin2_otp,
        "created_at": datetime.utcnow(),
        "expires_at": expires_at,
    }

    # 5. Dispatch dual approval emails to Admin 1 and Admin 2 (TARGET ADMIN GETS NO OTP)
    requester = current_admin.full_name or current_admin.email

    delivery_admin1 = admin1.email
    if settings.is_test and delivery_admin1.endswith("@example.com"):
        delivery_admin1 = settings.SMTP_USER or "athilingam3336@gmail.com"

    delivery_admin2 = admin2.email
    if settings.is_test and delivery_admin2.endswith("@example.com"):
        delivery_admin2 = settings.SMTP_USER or "athilingam3336@gmail.com"

    asyncio.create_task(
        EmailService.send_dual_admin_demotion_email(
            to_email=delivery_admin1,
            admin_label="Administrator 1",
            requester_name=requester,
            target_admin_email=target_email,
            otp_code=admin1_otp,
        )
    )
    asyncio.create_task(
        EmailService.send_dual_admin_demotion_email(
            to_email=delivery_admin2,
            admin_label="Administrator 2",
            requester_name=requester,
            target_admin_email=target_email,
            otp_code=admin2_otp,
        )
    )

    logger.info(
        f"[ADMIN DEMOTION INITIATED] Session: {session_id} for target '{target_email}'. "
        f"Admin1: {admin1.email} (OTP: {admin1_otp}), Admin2: {admin2.email} (OTP: {admin2_otp}). Target received NO OTP."
    )

    return {
        "success": True,
        "message": (
            f"Dual authorization OTP codes dispatched to {admin1.email} and {admin2.email}. "
            f"Both codes are required to authorize revoking admin privileges for {target_email}."
        ),
        "data": {
            "session_id": session_id,
            "target_admin_email": target_email,
            "target_admin_name": _DEMOTION_SESSIONS[session_id]["target_admin_name"],
            "admin1_email": admin1.email,
            "admin2_email": admin2.email,
            "expires_in_seconds": 600,
        },
    }


@router.post("/resend-demotion-otp")
async def resend_demotion_otp(
    payload: Dict[str, str],
    current_admin: User = Depends(get_current_admin),
):
    """Resends dual authorization codes to Admin 1 and Admin 2 for demotion."""
    session_id = payload.get("session_id")
    session = _DEMOTION_SESSIONS.get(session_id)
    if not session or datetime.utcnow() > session["expires_at"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Demotion session expired or invalid. Please request fresh authorization.",
        )

    requester = current_admin.full_name or current_admin.email
    asyncio.create_task(
        EmailService.send_dual_admin_demotion_email(
            to_email=session["admin1_email"],
            admin_label="Administrator 1",
            requester_name=requester,
            target_admin_email=session["target_admin_email"],
            otp_code=session["admin1_otp"],
        )
    )
    asyncio.create_task(
        EmailService.send_dual_admin_demotion_email(
            to_email=session["admin2_email"],
            admin_label="Administrator 2",
            requester_name=requester,
            target_admin_email=session["target_admin_email"],
            otp_code=session["admin2_otp"],
        )
    )
    return {"success": True, "message": "Authorization codes resent to both administrators."}


@router.post("/verify-demotion")
async def verify_demotion_and_revoke(
    payload: VerifyDemotionPayload,
    current_admin: User = Depends(get_current_admin),
):
    """Stage 2 of Demotion: Verifies BOTH existing admin OTPs, revokes ADMIN role, and emails target admin."""
    session = _DEMOTION_SESSIONS.get(payload.session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired demotion session. Please restart authorization.",
        )

    if datetime.utcnow() > session["expires_at"]:
        _DEMOTION_SESSIONS.pop(payload.session_id, None)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authorization window expired (10-minute limit). Please request fresh OTPs.",
        )

    input1 = payload.admin1_otp.strip()
    input2 = payload.admin2_otp.strip()
    valid1 = secrets.compare_digest(input1, session["admin1_otp"].strip())
    valid2 = secrets.compare_digest(input2, session["admin2_otp"].strip())

    if not valid1 and not valid2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both Admin 1 and Admin 2 OTP codes are invalid. Please check codes sent to each email.",
        )
    if not valid1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Administrator 1 ({session['admin1_email']}) OTP is invalid.",
        )
    if not valid2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Administrator 2 ({session['admin2_email']}) OTP is invalid.",
        )

    target_email = session["target_admin_email"]
    target_user = await User.find_one({"email": target_email})
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Target administrator '{target_email}' was not found in the database.",
        )

    # Revoke Admin Role -> Revert to USER / Customer
    target_user.role = "USER"
    target_user.updated_at = datetime.utcnow()
    await target_user.save()

    # Dispatch official notification email to the removed admin
    delivery_target = target_email
    if settings.is_test and delivery_target.endswith("@example.com"):
        delivery_target = settings.SMTP_USER or "athilingam3336@gmail.com"

    asyncio.create_task(
        EmailService.send_admin_role_revoked_notification(
            to_email=delivery_target,
            user_name=target_user.full_name or target_email.split("@")[0].title(),
            requester_name=session["requested_by_name"],
            admin1_email=session["admin1_email"],
            admin2_email=session["admin2_email"],
        )
    )

    # Record Audit Log
    try:
        await AuditLog(
            user_id=current_admin.id,
            action="ADMIN_ROLE_REVOKED",
            resource="users",
            resource_id=str(target_user.id),
            details={
                "target_email": target_email,
                "revoked_by": current_admin.email,
                "admin1_approved": session["admin1_email"],
                "admin2_approved": session["admin2_email"],
                "revoked_at": datetime.utcnow().isoformat(),
            },
        ).insert()
    except Exception as e:
        logger.warning(f"Failed to record AuditLog for admin demotion: {e}")

    # Pop session
    _DEMOTION_SESSIONS.pop(payload.session_id, None)

    logger.info(
        f"[ADMIN DEMOTION COMPLETE] Successfully revoked Administrator privileges from '{target_email}'. "
        f"Authorized by {session['admin1_email']} and {session['admin2_email']}. Notification sent to target email."
    )

    return {
        "success": True,
        "message": f"Successfully revoked Administrator privileges for {target_email}. Account reverted to customer status.",
        "data": {
            "email": target_email,
            "full_name": target_user.full_name,
            "role": "USER",
            "revoked_by": current_admin.email,
        },
    }

