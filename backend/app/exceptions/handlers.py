import logging
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.exceptions.custom_exceptions import BaseAppException
from app.schemas.common import ApiResponse

logger = logging.getLogger("app.exceptions")


async def app_exception_handler(
    request: Request, exc: BaseAppException
) -> JSONResponse:
    logger.error(
        f"Application error: {exc.message} on path {request.url.path} (status: {exc.status_code})"
    )
    response_body = ApiResponse(success=False, message=exc.message, data=exc.data)
    return JSONResponse(
        status_code=exc.status_code, content=response_body.model_dump()
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = exc.errors()
    formatted_errors = []
    for error in errors:
        loc = " -> ".join(str(loc_item) for loc_item in error.get("loc", []))
        msg = error.get("msg", "Unknown validation error")
        formatted_errors.append(f"{loc}: {msg}")

    error_msg = "Validation failed: " + ", ".join(formatted_errors)
    logger.warning(
        f"Validation error on path {request.url.path} - Details: {error_msg}"
    )

    # Sanitize errors to remove non-JSON-serializable objects (like Exception in ctx)
    sanitized_errors = []
    for err in errors:
        sanitized_err = {
            "loc": err.get("loc"),
            "msg": err.get("msg"),
            "type": err.get("type"),
        }
        if "ctx" in err:
            ctx = err["ctx"]
            sanitized_ctx = {}
            for k, val in ctx.items():
                if isinstance(val, Exception):
                    sanitized_ctx[k] = str(val)
                else:
                    sanitized_ctx[k] = val
            sanitized_err["ctx"] = sanitized_ctx
        sanitized_errors.append(sanitized_err)

    response_body = ApiResponse(
        success=False, message=error_msg, data={"errors": sanitized_errors}
    )
    return JSONResponse(status_code=422, content=response_body.model_dump())


async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    if exc.status_code < 500:
        logger.warning(
            f"HTTP exception: {exc.detail} on path {request.url.path} (status: {exc.status_code})"
        )
    else:
        logger.error(
            f"HTTP exception: {exc.detail} on path {request.url.path} (status: {exc.status_code})"
        )
    response_body = ApiResponse(success=False, message=exc.detail, data={})
    return JSONResponse(
        status_code=exc.status_code, content=response_body.model_dump()
    )



async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception(f"Unhandled error on path {request.url.path} - {str(exc)}")
    response_body = ApiResponse(
        success=False,
        message="An unexpected system error occurred. Please try again later.",
        data={},
    )
    return JSONResponse(status_code=500, content=response_body.model_dump())


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(BaseAppException, app_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)
