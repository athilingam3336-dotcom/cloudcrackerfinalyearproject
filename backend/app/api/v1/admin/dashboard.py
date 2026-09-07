from fastapi import APIRouter, Depends, status

from app.core.dependencies import get_current_admin
from app.models.user import User
from app.schemas.common import ApiResponse
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/admin", tags=["Admin Dashboard"])


@router.get(
    "/dashboard",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Get admin dashboard analytics (Admin Only)",
    description="Calculates e-commerce overview statistics (users, revenue, sales, monthly metrics, stock alerts) using MongoDB aggregations. Requires admin role.",
)
async def get_dashboard(
    current_admin: User = Depends(get_current_admin),
    dashboard_service: DashboardService = Depends(),
) -> ApiResponse:
    metrics = await dashboard_service.get_admin_dashboard_metrics()
    return ApiResponse(
        success=True,
        message="Admin analytics dashboard data retrieved successfully",
        data=metrics,
    )


@router.get(
    "/sales-summary",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Get real-time today's sales summary and BI analytics (Admin Only)",
    description="Returns real-time sales overview, top products bar chart, category share donut chart, hourly trend line chart, and BI insights.",
)
async def get_sales_summary(
    current_admin: User = Depends(get_current_admin),
    dashboard_service: DashboardService = Depends(),
) -> ApiResponse:
    summary_data = await dashboard_service.get_sales_summary()
    return ApiResponse(
        success=True,
        message="Today's sales summary analytics retrieved successfully",
        data=summary_data,
    )
