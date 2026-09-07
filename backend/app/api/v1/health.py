import time
from fastapi import APIRouter

from app.core.constants import ResponseMessages
from app.core.database import db_manager
from app.schemas.common import ApiResponse

router = APIRouter()


@router.get("/health", response_model=ApiResponse)
async def check_health() -> ApiResponse:
    """Verifies backend database connection health and system status."""
    db_ok = False
    details = {}

    start_time = time.perf_counter()
    try:
        if db_manager.client is not None and db_manager.db is not None:
            # Run the command 'ping' on the database admin or current database
            await db_manager.db.command("ping")
            db_ok = True
            details["database"] = "connected"
        else:
            details["database"] = "disconnected"
    except Exception as e:
        details["database"] = f"unhealthy: {str(e)}"

    latency = time.perf_counter() - start_time
    details["latency_sec"] = round(latency, 5)
    details["status"] = "operational" if db_ok else "degraded"

    message = (
        ResponseMessages.HEALTH_OK
        if db_ok
        else "System is in a degraded state due to database connectivity issues."
    )

    return ApiResponse(success=db_ok, message=message, data=details)
