"""
Pydantic models for API request/response validation.

Centralises all data shapes in one place so routers stay slim and
the API contract is self-documenting via OpenAPI.
"""

from pydantic import BaseModel, Field
from typing import Optional


# ── Requests ─────────────────────────────────────────────────────────────────

class Attachment(BaseModel):
    mime_type: str
    data: str


class RagRequest(BaseModel):
    """Body for the /rag streaming chat endpoint."""
    query: str = Field(..., min_length=1, max_length=5000)
    attachments: Optional[list[Attachment]] = None


# ── Responses ────────────────────────────────────────────────────────────────

class StatusResponse(BaseModel):
    """Generic success envelope used across multiple endpoints."""
    status: str


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


# ── Knowledge Base ───────────────────────────────────────────────────────────

class KBFile(BaseModel):
    """A single indexed file within a KB subfolder."""
    name: str
    type: str
    size: str = "N/A"
    modified: str = "N/A"


class KBSubfolder(BaseModel):
    """A logical grouping of files within a KB folder."""
    name: str
    files: list[KBFile] = []


class KBFolder(BaseModel):
    """A top-level knowledge base category."""
    name: str
    description: str
    icon: str
    updated: str
    subfolders: list[KBSubfolder] = []


class KBResponse(BaseModel):
    """Returned by the /kb endpoint."""
    folders: list[KBFolder] = []


# ── Workflow Status ──────────────────────────────────────────────────────────

class WorkflowStep(BaseModel):
    """A single step in a DBOS workflow execution."""
    name: str
    status: str
    output: list = []


class WorkflowStatusResponse(BaseModel):
    """Returned by the /ingest/status/{workflow_id} endpoint."""
    workflow_id: str
    status: str
    steps: list[WorkflowStep] = []
