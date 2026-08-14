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


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup tasks
    logger.info("FastAPI lifecycle startup: Connecting database client.")
    await db_manager.connect()
    yield
    # Shutdown tasks
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
                "service": "cloudcrackers-backend",
                "database": "connected",
            },
        )

    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "status": "unhealthy",
            "service": "cloudcrackers-backend",
            "database": "disconnected",
        },
    )


