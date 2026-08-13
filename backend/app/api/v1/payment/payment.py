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
    RazorpayOrderCreateRequest,
    RazorpayPaymentVerifyRequest,
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
# Razorpay Test Mode Payment Endpoints
# ==========================================


@base_router.post(
    "/create-order",
    response_model=ApiResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Razorpay Test Order (Customer)",
    description="Creates a Razorpay test order. Calculates payable amount strictly server-side.",
)
async def create_razorpay_order(
    data: RazorpayOrderCreateRequest,
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends(),
) -> ApiResponse:
    res = await payment_service.create_razorpay_payment_order(
        str(current_user.id), data
    )
    return ApiResponse(
        success=True,
        message="Razorpay order created successfully",
        data=res.model_dump(),
    )


@base_router.post(
    "/verify-razorpay",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify Razorpay Payment Signature (Customer/Admin)",
    description="Verifies Razorpay HMAC SHA256 signature, updates order to Paid & Confirmed, deducts stock, and clears cart.",
)
async def verify_razorpay_payment(
    data: RazorpayPaymentVerifyRequest,
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends(),
) -> ApiResponse:
    is_admin = current_user.role == "ADMIN"
    result = await payment_service.verify_razorpay_payment(
        str(current_user.id), data, is_admin=is_admin
    )
    return ApiResponse(
        success=True,
        message="Razorpay payment verified successfully",
        data=result,
    )


@base_router.post(
    "/webhook",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Razorpay Webhook Handler",
    description="Idempotent webhook handler to process Razorpay payment events.",
)
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None, alias="X-Razorpay-Signature"),
    payment_service: PaymentService = Depends(),
) -> ApiResponse:
    raw_body = await request.body()
    res = await payment_service.handle_razorpay_webhook(
        raw_body, x_razorpay_signature
    )
    return ApiResponse(
        success=True,
        message="Webhook processed",
        data=res,
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

    # Handle Razorpay format
    if "razorpay_signature" in payload:
        data = RazorpayPaymentVerifyRequest(
            razorpay_order_id=payload.get("razorpay_order_id", ""),
            razorpay_payment_id=payload.get("razorpay_payment_id", ""),
            razorpay_signature=payload.get("razorpay_signature", ""),
        )
        result = await payment_service.verify_razorpay_payment(
            str(current_user.id), data, is_admin=is_admin
        )
        return ApiResponse(
            success=True,
            message="Razorpay payment verified successfully",
            data=result,
        )

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
