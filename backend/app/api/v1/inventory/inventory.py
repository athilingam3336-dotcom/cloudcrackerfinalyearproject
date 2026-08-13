from typing import List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, Path, Query, status

from app.core.dependencies import get_current_admin
from app.exceptions import ValidationException
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.inventory import (
    InventoryAdjustRequest,
    InventoryHistoryResponse,
    InventoryItemOverview,
    InventoryOverviewPagination,
    InventoryOverviewResponseData,
    InventoryResponse,
    InventorySummaryMetrics,
)
from app.services.inventory_service import InventoryService

router = APIRouter(prefix="/inventory", tags=["Inventory"])


def get_validated_product_id(product_id: str = Path(...)) -> str:
    """Helper path parameter validator to assert MongoDB ObjectId structure (422)."""
    if not ObjectId.is_valid(product_id):
        raise ValidationException(
            message="Invalid ID format. Must be a 24-character hexadecimal string."
        )
    return product_id


@router.get(
    "/overview",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Get admin inventory dashboard overview (Admin Only)",
    description="Retrieves summary metrics and paginated inventory item list with search, status, and category filtering. Requires admin role.",
)
async def get_inventory_overview(
    search: Optional[str] = Query(None, description="Search product by title"),
    status_filter: Optional[str] = Query("all", description="all, in_stock, low_stock, out_of_stock"),
    category_id: Optional[str] = Query(None, description="Filter by category ID"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    current_admin: User = Depends(get_current_admin),
    inventory_service: InventoryService = Depends(),
) -> ApiResponse:
    metrics_dict, items_raw, total = await inventory_service.get_inventory_overview(
        search=search,
        status_filter=status_filter,
        category_id=category_id,
        page=page,
        limit=limit,
    )
    pages = (total + limit - 1) // limit if total > 0 else 1

    response_data = InventoryOverviewResponseData(
        metrics=InventorySummaryMetrics(**metrics_dict),
        items=[InventoryItemOverview(**item) for item in items_raw],
        pagination=InventoryOverviewPagination(
            total=total,
            page=page,
            limit=limit,
            pages=pages,
        ),
    )
    return ApiResponse(
        success=True,
        message="Inventory overview retrieved successfully",
        data=response_data,
    )


@router.post(
    "/adjust",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Adjust product stock (Admin Only)",
    description="Logs a stock adjustment transaction (IN/OUT/ADJUST) and syncs product inventory. Requires admin role.",
)
async def adjust_stock(
    data: InventoryAdjustRequest,
    current_admin: User = Depends(get_current_admin),
    inventory_service: InventoryService = Depends(),
) -> ApiResponse:
    inventory = await inventory_service.adjust_stock(str(current_admin.id), data)
    return ApiResponse(
        success=True,
        message="Inventory stock adjusted successfully",
        data=InventoryResponse.convert_id(inventory),
    )


@router.get(
    "/low-stock",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="List low stock products (Admin Only)",
    description="Retrieves a list of all products whose stock levels are equal to or below the minimum threshold. Requires admin role.",
)
async def get_low_stock(
    current_admin: User = Depends(get_current_admin),
    inventory_service: InventoryService = Depends(),
) -> ApiResponse:
    low_stock = await inventory_service.get_low_stock_products()
    serialized = [InventoryResponse.convert_id(i) for i in low_stock]
    return ApiResponse(
        success=True,
        message="Low stock inventory records retrieved successfully",
        data=serialized,
    )


@router.get(
    "/out-of-stock",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="List out of stock products (Admin Only)",
    description="Retrieves a list of all products with 0 stock. Requires admin role.",
)
async def get_out_of_stock(
    current_admin: User = Depends(get_current_admin),
    inventory_service: InventoryService = Depends(),
) -> ApiResponse:
    out_of_stock = await inventory_service.get_out_of_stock_products()
    serialized = [InventoryResponse.convert_id(i) for i in out_of_stock]
    return ApiResponse(
        success=True,
        message="Out of stock inventory records retrieved successfully",
        data=serialized,
    )


@router.get(
    "/history/{product_id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Get product inventory history (Admin Only)",
    description="Retrieves the transaction logs (adjustment history) for a specific product. Requires admin role.",
)
async def get_inventory_history(
    product_id: str = Depends(get_validated_product_id),
    current_admin: User = Depends(get_current_admin),
    inventory_service: InventoryService = Depends(),
) -> ApiResponse:
    history = await inventory_service.get_inventory_history(product_id)
    serialized = [
        InventoryHistoryResponse(
            transaction_type=h.transaction_type,
            quantity=h.quantity,
            old_stock=h.old_stock,
            new_stock=h.new_stock,
            remarks=h.remarks,
            created_by=h.created_by,
            created_at=h.created_at,
        )
        for h in history
    ]
    return ApiResponse(
        success=True,
        message="Inventory transaction history retrieved successfully",
        data=serialized,
    )


@router.get(
    "/{product_id}",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Get product inventory details (Admin Only)",
    description="Retrieves current inventory status details of a product. Requires admin role.",
)
async def get_inventory(
    product_id: str = Depends(get_validated_product_id),
    current_admin: User = Depends(get_current_admin),
    inventory_service: InventoryService = Depends(),
) -> ApiResponse:
    inventory = await inventory_service.get_inventory_by_product(product_id)
    return ApiResponse(
        success=True,
        message="Inventory status retrieved successfully",
        data=InventoryResponse.convert_id(inventory),
    )
