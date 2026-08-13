import logging
import time
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("app.middleware")


class RequestLoggerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.perf_counter()

        logger.info(
            f"Request: {request.method} {request.url.path} from client {request.client.host if request.client else 'unknown'}"
        )

        try:
            response = await call_next(request)
            duration = time.perf_counter() - start_time

            # Add process duration header
            response.headers["X-Process-Time"] = f"{duration:.4f}s"

            logger.info(
                f"Response: {request.method} {request.url.path} - Status: {response.status_code} - Duration: {duration:.4f}s"
            )
            return response
        except Exception as e:
            duration = time.perf_counter() - start_time
            logger.error(
                f"Error processing {request.method} {request.url.path} after {duration:.4f}s - {str(e)}"
            )
            raise e
