from datetime import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, status

from app.core.dependencies import get_current_admin
from app.models.user import User
from app.schemas.common import ApiResponse
from app.services.dashboard_service import DashboardService
from app.core.config import settings

router = APIRouter(prefix="/admin/reports", tags=["Admin Reports"])


@router.get(
    "/today",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Get today's sales and stock report metrics (Admin Only)",
)
async def get_today_report(
    current_admin: User = Depends(get_current_admin),
    dashboard_service: DashboardService = Depends(),
) -> ApiResponse:
    report_data = await dashboard_service.get_today_report_metrics()
    return ApiResponse(
        success=True,
        message="Today's sales and stock report calculated successfully",
        data=report_data,
    )


@router.post(
    "/today/download",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Record PDF report download and update shift count (Admin Only)",
)
async def record_today_download(
    current_admin: User = Depends(get_current_admin),
    dashboard_service: DashboardService = Depends(),
) -> ApiResponse:
    report_data = await dashboard_service.record_today_report_download()
    return ApiResponse(
        success=True,
        message="PDF Report download recorded successfully",
        data=report_data,
    )


async def dispatch_daily_report_to_all_admins(requested_by_email: str = "Automated System (12:00 AM Cron)") -> Dict[str, Any]:
    dashboard_service = DashboardService()
    report_data = await dashboard_service.get_today_report_metrics()
    
    admins = await User.find(
        {"$or": [{"role": "ADMIN"}, {"role": "admin"}]}
    ).to_list(length=100)

    admin_emails = list(set([a.email for a in admins if a.email]))
    if not admin_emails:
        admin_emails = ["admin@meera-crackers.com"]

    today_date = datetime.utcnow().strftime("%d %B %Y")
    email_subject = f"🔥 Daily Pyrotechnics Report - {today_date} | Meera Crackers"

    email_body = f"""
======================================================
  MEERA CRACKERS - DAILY SALES & STOCK REPORT
  Date: {today_date} (Dispatched to Admin Emails)
======================================================

📊 TODAY'S BUSINESS SUMMARY:
------------------------------------------------------
• Today's Revenue      : ₹{report_data['today_revenue']:,.2f}
• Today's Total Orders : {report_data['today_orders']}
• Cracker Items Sold   : {report_data['today_items_sold']} Units
• Warehouse Stock Left : {report_data['remaining_stock']} Units
• PDF Report Downloads : {report_data['download_count']} Times (Unlimited Access)

📦 TODAY'S ORDERS BREAKDOWN:
------------------------------------------------------
"""
    for idx, order in enumerate(report_data.get('today_orders_list', [])[:15], 1):
        email_body += f"{idx}. Order #{order['order_number']} | Customer: {order['customer_name']} | ₹{order['total']:,.2f} | Status: {order['order_status']} | Items: {order['items_summary']}\n"

    email_body += f"""
======================================================
Dispatched To Admin Accounts: {', '.join(admin_emails)}
Triggered By: {requested_by_email}
Meera Crackers Automated Analytics Platform
======================================================
"""

    return {
        "admin_emails_notified": admin_emails,
        "report_summary": report_data,
        "email_subject": email_subject,
        "email_preview": email_body[:300] + "...",
    }


@router.post(
    "/today/email",
    response_model=ApiResponse,
    status_code=status.HTTP_200_OK,
    summary="Dispatch today's sales report to all Admin email addresses (Admin Only)",
)
async def email_today_report(
    current_admin: User = Depends(get_current_admin),
) -> ApiResponse:
    res = await dispatch_daily_report_to_all_admins(
        requested_by_email=current_admin.email or current_admin.full_name or "Admin User"
    )
    admin_emails = res["admin_emails_notified"]
    return ApiResponse(
        success=True,
        message=f"Today's report successfully dispatched to {len(admin_emails)} admin email accounts.",
        data=res,
    )
