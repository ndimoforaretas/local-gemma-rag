"""
Pydantic models for API request/response validation.

Centralises all data shapes in one place so routers stay slim and
the API contract is self-documenting via OpenAPI.
"""

from pydantic import BaseModel, Field
from typing import Optional


# ── Requests ─────────────────────────────────────────────────────────────────

class RagRequest(BaseModel):
    """Body for the /rag streaming chat endpoint."""
    query: str = Field(..., min_length=1, max_length=5000)


# ── Responses ────────────────────────────────────────────────────────────────

class IngestResponse(BaseModel):
    """Returned when a new ingestion workflow is started."""
    status: str
    workflow_id: Optional[str] = None


class UploadResponse(BaseModel):
    """Returned after files are uploaded to the docs/ directory."""
    status: str
    message: str
    files: list[str]


class HealthResponse(BaseModel):
    """Returned by the /health endpoint."""
    status: str
    ollama_connected: bool
    vector_db_loaded: bool
    indexed_chunks: int


class ErrorResponse(BaseModel):
    """Standard error envelope for non-200 responses."""
    error: str
    detail: Optional[str] = None
