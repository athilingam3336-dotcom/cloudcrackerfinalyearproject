from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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


@app.get("/", tags=["Root"])
async def root_endpoint() -> dict:
    """Standard root endpoint greeting message."""
    return {
        "success": True,
        "message": f"Welcome to the {settings.APP_NAME}. Head over to /docs or /redoc for interactive API documentation.",
        "data": {},
    }
