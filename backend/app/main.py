from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_v1_router
from app.core.config import settings
from app.core.database import db_manager
from app.core.logging_config import logger, setup_logging
from app.exceptions.handlers import register_exception_handlers
from app.middleware.request_logger import RequestLoggerMiddleware

# Initialize system logger
setup_logging()


import asyncio
from datetime import datetime, timedelta

async def schedule_midnight_admin_email_task():
    """Background task running continuously: triggers daily sales & stock report email to all admins at 12:00 AM midnight."""
    logger.info("Initializing Midnight 12:00 AM Automated Admin Report Scheduler...")
    while True:
        try:
            now = datetime.now()
            tomorrow = now + timedelta(days=1)
            midnight = datetime(year=tomorrow.year, month=tomorrow.month, day=tomorrow.day, hour=0, minute=0, second=0)
            seconds_until_midnight = (midnight - now).total_seconds()
            
            logger.info(f"Next automated 12:00 AM Admin Email Report scheduled in {seconds_until_midnight:.0f} seconds.")
            await asyncio.sleep(seconds_until_midnight)

            from app.api.v1.admin.reports import dispatch_daily_report_to_all_admins
            result = await dispatch_daily_report_to_all_admins(requested_by_email="Automated 12:00 AM Midnight Cron")
            logger.info(f"[12:00 AM MIDNIGHT CRON] Automated Daily Report emailed to {len(result.get('admin_emails_notified', []))} admins!")

            await asyncio.sleep(60)
        except asyncio.CancelledError:
            logger.info("Midnight Admin Report Scheduler task cancelled.")
            break
        except Exception as e:
            logger.error(f"Error in midnight admin report scheduler: {e}")
            await asyncio.sleep(300)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup tasks
    logger.info("FastAPI lifecycle startup: Connecting database client.")
    await db_manager.connect()
    cron_task = asyncio.create_task(schedule_midnight_admin_email_task())
    yield
    # Shutdown tasks
    cron_task.cancel()
    logger.info("FastAPI lifecycle shutdown: Disconnecting database client.")
    await db_manager.disconnect()


app = FastAPI(
    title=settings.APP_NAME,
    description="AI Powered E-Commerce Platform Backend API",
    version="1.0.0",
    debug=settings.DEBUG,
    lifespan=lifespan,
)

# Order of middleware: Request logger executes around all incoming logic.
app.add_middleware(RequestLoggerMiddleware)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_origin_regex=r"^https?://([\w-]+\.vercel\.app|[\w-]+\.netlify\.app|[\w-]+\.pages\.dev|[\w-]+\.onrender\.com|localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register custom exception handlers
register_exception_handlers(app)

# Register router
app.include_router(api_v1_router, prefix="/api/v1")


@app.api_route("/", methods=["GET", "HEAD"], tags=["Root"])
async def root_endpoint() -> dict:
    """Standard root endpoint greeting message."""
    return {
        "success": True,
        "message": f"Welcome to the {settings.APP_NAME}. Head over to /docs or /redoc for interactive API documentation.",
        "data": {},
    }


@app.get(
    "/health",
    tags=["Health"],
    summary="Production Health Check",
    responses={
        200: {
            "description": "Service is healthy and database is connected",
            "content": {
                "application/json": {
                    "example": {
                        "status": "ok",
                        "service": "cloudcrackers-backend",
                        "database": "connected",
                    }
                }
            },
        },
        503: {
            "description": "Service is unavailable or database is disconnected",
            "content": {
                "application/json": {
                    "example": {
                        "status": "unhealthy",
                        "service": "cloudcrackers-backend",
                        "database": "disconnected",
                    }
                }
            },
        },
    },
)
async def health_check() -> JSONResponse:
    """Production-ready health check verifying service status and MongoDB connectivity."""
    db_connected = False
    try:
        if db_manager.client is not None and db_manager.db is not None:
            await db_manager.db.command("ping")
            db_connected = True
    except Exception as exc:
        logger.warning(f"Health check MongoDB ping failed: {exc}")
        db_connected = False

    if db_connected:
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "status": "ok",
                "db_connected": True,
            },
        )

    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "status": "unhealthy",
            "db_connected": False,
        },
    )


