from typing import Any, Dict, List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, Header, Path, Request, status

from app.core.dependencies import get_current_user
from app.exceptions import ValidationException
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.payment import (
    PaymentCreateRequest,
    PaymentResponse,
    PaymentVerifyRequest,
    UpiOrderCreateRequest,
    UpiOrderCreateResponse,
    UpiPaymentVerifyAdminRequest,
)
from app.services.payment_service import PaymentService

base_router = APIRouter()


def get_validated_payment_id(payment_id: str = Path(...)) -> str:
    """Helper path parameter validator to assert MongoDB ObjectId structure (422)."""
    if not ObjectId.is_valid(payment_id):
        raise ValidationException(
            message="Invalid ID format. Must be a 24-character hexadecimal string."
        )
    return payment_id


def get_validated_order_id(order_id: str = Path(...)) -> str:
    """Helper path parameter validator to assert MongoDB ObjectId structure (422)."""
    if not ObjectId.is_valid(order_id):
        raise ValidationException(
            message="Invalid ID format. Must be a 24-character hexadecimal string."
        )
    return order_id


# ==========================================
# UPI QR Payment Endpoints
# ==========================================

@base_router.post(
    "/upi/create",
    response_model=ApiResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create UPI QR Order (Customer)",
    description="Creates a UPI test order, calculates amount server-side, and generates QR code.",
)
async def create_upi_order(
    data: UpiOrderCreateRequest,
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends(),
) -> ApiResponse:
    res = await payment_service.create_upi_payment_order(
        str(current_user.id), data
    )
    return ApiResponse(
        success=True,
        message="UPI order and QR generated successfully",
        data=res.model_dump(),
    )


@base_router.post(
    "/admin/upi/verify/{payment_id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Admin Verify UPI Payment",
    description="Admin manually verifies a pending UPI payment using UTR.",
)
async def verify_upi_payment_admin(
    payment_id: str = Path(...),
    data: UpiPaymentVerifyAdminRequest = None,
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends(),
) -> ApiResponse:
    if current_user.role != "ADMIN":
        raise ValidationException(message="Only admins can verify UPI payments manually.")
        
    result = await payment_service.verify_upi_payment_admin(
        admin_id=str(current_user.id), payment_id=payment_id, data=data
    )
    return ApiResponse(
        success=True,
        message="UPI payment verified successfully",
        data=result,
    )


# ==========================================
# Generic / Mock / Backward-Compatible Routes
# ==========================================


@base_router.post(
    "/create",
    response_model=ApiResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create order payment transaction (Customer)",
    description="Registers a new pending payment transaction for an active order.",
)
async def create_payment(
    data: PaymentCreateRequest,
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends(),
) -> ApiResponse:
    payment = await payment_service.create_payment(str(current_user.id), data)
    return ApiResponse(
        success=True,
        message="Payment transaction initiated successfully",
        data=PaymentResponse.convert_id(payment),
    )


@base_router.post(
    "/verify",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify payment transaction (Customer/Admin)",
    description="Verifies the payment result. Accepts either Razorpay signature verification or Generic/Mock verification payload.",
)
async def verify_payment(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends(),
) -> ApiResponse:
    is_admin = current_user.role == "ADMIN"

    # Handle Razorpay legacy (ignore)
    if "razorpay_signature" in payload:
        raise ValidationException(message="Razorpay is no longer supported.")

    # Handle generic/mock format
    generic_data = PaymentVerifyRequest(**payload)
    payment = await payment_service.verify_payment(
        str(current_user.id), generic_data, is_admin=is_admin
    )
    return ApiResponse(
        success=True,
        message="Payment verified successfully",
        data=PaymentResponse.convert_id(payment),
    )


@base_router.get(
    "/history",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Get payment history (Customer/Admin)",
    description="Lists past payments. Customers see their own payments; Admins retrieve all records.",
)
async def get_payment_history(
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends(),
) -> ApiResponse:
    is_admin = current_user.role == "ADMIN"
    history = await payment_service.get_payment_history(
        str(current_user.id), is_admin=is_admin
    )
    serialized = [PaymentResponse.convert_id(p) for p in history]
    return ApiResponse(
        success=True,
        message="Payment history retrieved successfully",
        data=serialized,
    )


@base_router.get(
    "/order/{order_id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Get payment by Order ID (Customer/Admin)",
    description="Retrieves the payment details associated with a given order.",
)
async def get_payment_by_order(
    order_id: str = Depends(get_validated_order_id),
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends(),
) -> ApiResponse:
    is_admin = current_user.role == "ADMIN"
    payment = await payment_service.get_payment_by_order(
        str(current_user.id), order_id, is_admin=is_admin
    )
    return ApiResponse(
        success=True,
        message="Payment details retrieved successfully",
        data=PaymentResponse.convert_id(payment),
    )


@base_router.get(
    "/{payment_id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Get payment details (Customer/Admin)",
    description="Retrieves a single payment transaction record by its database ID.",
)
async def get_payment_details(
    payment_id: str = Depends(get_validated_payment_id),
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends(),
) -> ApiResponse:
    is_admin = current_user.role == "ADMIN"
    payment = await payment_service.get_payment_details(
        str(current_user.id), payment_id, is_admin=is_admin
    )
    return ApiResponse(
        success=True,
        message="Payment details retrieved successfully",
        data=PaymentResponse.convert_id(payment),
    )


# Routers for mounting
router = APIRouter(prefix="/payment", tags=["Payment"])
router.include_router(base_router)

payments_router = APIRouter(prefix="/payments", tags=["Payments"])
payments_router.include_router(base_router)
