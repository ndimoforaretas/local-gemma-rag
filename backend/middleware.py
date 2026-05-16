"""
Application middleware for request tracing and global error handling.
"""

import time
import uuid

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from backend.config import logger


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Injects a unique ``X-Request-ID`` header into every request/response
    and logs the request lifecycle with timing information.
    """

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])
        start = time.perf_counter()

        # Attach ID to request state so routers can access it.
        request.state.request_id = request_id

        logger.info(
            "[%s] %s %s",
            request_id,
            request.method,
            request.url.path,
        )

        try:
            response = await call_next(request)
        except Exception:
            logger.exception("[%s] Unhandled exception", request_id)
            response = JSONResponse(
                status_code=500,
                content={"error": "Internal server error", "request_id": request_id},
            )

        elapsed_ms = (time.perf_counter() - start) * 1000
        response.headers["X-Request-ID"] = request_id

        logger.info(
            "[%s] %s %s → %d (%.1fms)",
            request_id,
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
        )

        return response


def register_exception_handlers(app: FastAPI) -> None:
    """
    Register global exception handlers that return consistent JSON
    error envelopes instead of raw HTML or plain-text tracebacks.
    """

    @app.exception_handler(404)
    async def not_found_handler(request: Request, _exc):
        return JSONResponse(
            status_code=404,
            content={"error": "Not found", "detail": str(request.url.path)},
        )

    @app.exception_handler(422)
    async def validation_error_handler(request: Request, exc):
        return JSONResponse(
            status_code=422,
            content={
                "error": "Validation error",
                "detail": str(exc.detail) if hasattr(exc, "detail") else str(exc),
            },
        )

    @app.exception_handler(500)
    async def internal_error_handler(request: Request, _exc):
        request_id = getattr(request.state, "request_id", "unknown")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal server error",
                "request_id": request_id,
            },
        )
