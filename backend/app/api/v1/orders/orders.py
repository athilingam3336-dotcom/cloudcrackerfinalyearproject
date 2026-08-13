from typing import List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, Path, Query, status

from app.core.dependencies import get_current_admin, get_current_user
from app.exceptions import ValidationException
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.order import (
    AdminOrderStatusUpdateRequest,
    AdminPaymentStatusUpdateRequest,
    CheckoutRequest,
    OrderResponse,
    OrderSummaryResponse,
)
from app.services.order_service import OrderService

router = APIRouter(prefix="/orders", tags=["Orders"])


def get_validated_order_id(order_id: str = Path(...)) -> str:
    """Helper path parameter validator to assert MongoDB ObjectId structure (422)."""
    if not ObjectId.is_valid(order_id):
        raise ValidationException(
            message="Invalid ID format. Must be a 24-character hexadecimal string."
        )
    return order_id



@router.post(
    "/checkout",
    response_model=ApiResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Checkout cart (Customer)",
    description="Processes checkout: validates stock, creates Order, creates OrderItems, decrements product stock, clears cart.",
)
async def checkout(
    data: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    order_service: OrderService = Depends(),
) -> ApiResponse:
    order = await order_service.checkout(str(current_user.id), data)
    return ApiResponse(
        success=True,
        message="Order placed successfully",
        data=order,
    )


@router.get(
    "",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="List orders (Customer)",
    description="Returns all orders placed by the authenticated user.",
)
async def get_orders(
    current_user: User = Depends(get_current_user),
    order_service: OrderService = Depends(),
) -> ApiResponse:
    orders = await order_service.get_user_orders(str(current_user.id))
    return ApiResponse(
        success=True,
        message="Orders retrieved successfully",
        data=orders,
    )


@router.get(
    "/history",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Get orders history (Customer)",
    description="Alias to retrieve all orders placed by the authenticated user.",
)
async def get_orders_history(
    current_user: User = Depends(get_current_user),
    order_service: OrderService = Depends(),
) -> ApiResponse:
    orders = await order_service.get_user_orders(str(current_user.id))
    return ApiResponse(
        success=True,
        message="Order history retrieved successfully",
        data=orders,
    )


@router.get(
    "/summary",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Get orders summary metrics (Customer)",
    description="Retrieves totals spent, completed orders, pending counts, and total orders.",
)
async def get_orders_summary(
    current_user: User = Depends(get_current_user),
    order_service: OrderService = Depends(),
) -> ApiResponse:
    summary = await order_service.get_order_summary(str(current_user.id))
    return ApiResponse(
        success=True,
        message="Order summary retrieved successfully",
        data=summary,
    )


@router.get(
    "/{order_id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Get order details (Customer)",
    description="Retrieves a specific order and its individual line items.",
)
async def get_order_details(
    order_id: str = Depends(get_validated_order_id),
    current_user: User = Depends(get_current_user),
    order_service: OrderService = Depends(),
) -> ApiResponse:
    order = await order_service.get_order_details(
        str(current_user.id),
        order_id,
        is_admin=(current_user.role == "ADMIN"),
    )
    return ApiResponse(
        success=True,
        message="Order details retrieved successfully",
        data=order,
    )


@router.put(
    "/{order_id}/cancel",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Cancel order (Customer)",
    description="Cancels a pending order and restores its item quantities back to product stock.",
)
async def cancel_order(
    order_id: str = Depends(get_validated_order_id),
    current_user: User = Depends(get_current_user),
    order_service: OrderService = Depends(),
) -> ApiResponse:
    order = await order_service.cancel_order(str(current_user.id), order_id)
    return ApiResponse(
        success=True,
        message="Order cancelled successfully",
        data=order,
    )


# --- Admin Orders Router ---
admin_router = APIRouter(prefix="/admin/orders", tags=["Admin Orders"])


@admin_router.get(
    "",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="List all orders (Admin Only)",
    description="Retrieves a paginated list of all customer orders with database-level search and status filtering. Requires Admin role.",
)
async def list_admin_orders(
    search: Optional[str] = Query(None, description="Search by order number or customer info"),
    order_status: Optional[str] = Query(None, description="Filter by order status (Pending, Confirmed, Packed, Shipped, Delivered, Cancelled)"),
    payment_status: Optional[str] = Query(None, description="Filter by payment status (Pending, Paid, Failed, Refunded)"),
    page: int = Query(1, ge=1, description="Page index"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    current_admin: User = Depends(get_current_admin),
    order_service: OrderService = Depends(),
) -> ApiResponse:
    result = await order_service.list_admin_orders(
        search=search,
        order_status=order_status,
        payment_status=payment_status,
        page=page,
        limit=limit,
    )
    return ApiResponse(
        success=True,
        message="Admin orders list retrieved successfully",
        data=result.model_dump(),
    )


@admin_router.put(
    "/{order_id}/status",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Update order status (Admin Only)",
    description="Updates the lifecycle status of an order. Restores or manages stock appropriately. Requires Admin role.",
)
async def update_order_status_admin(
    data: AdminOrderStatusUpdateRequest,
    order_id: str = Depends(get_validated_order_id),
    current_admin: User = Depends(get_current_admin),
    order_service: OrderService = Depends(),
) -> ApiResponse:
    order = await order_service.update_order_status_admin(order_id, data.order_status)
    return ApiResponse(
        success=True,
        message=f"Order status updated to '{data.order_status}' successfully",
        data=order,
    )


@admin_router.put(
    "/{order_id}/payment-status",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Update payment status (Admin Only)",
    description="Updates the payment verification status for an order. Requires Admin role.",
)
async def update_payment_status_admin(
    data: AdminPaymentStatusUpdateRequest,
    order_id: str = Depends(get_validated_order_id),
    current_admin: User = Depends(get_current_admin),
    order_service: OrderService = Depends(),
) -> ApiResponse:
    order = await order_service.update_payment_status_admin(order_id, data.payment_status)
    return ApiResponse(
        success=True,
        message=f"Payment status updated to '{data.payment_status}' successfully",
        data=order,
    )

@router.delete(
    "/{order_id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete an order (Soft Delete)",
)
async def delete_order(
    order_id: str = Depends(get_validated_order_id),
    current_user: User = Depends(get_current_user),
    order_service: OrderService = Depends(),
) -> ApiResponse:
    await order_service.delete_order(order_id, str(current_user.id), current_user.role)
    return ApiResponse(
        success=True,
        message="Order deleted successfully",
    )
