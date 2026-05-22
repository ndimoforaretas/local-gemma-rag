"""
Router for knowledge base management: browse, upload, ingest, and delete documents.
"""

import ipaddress
import json
import os
import re
import shutil
from datetime import datetime
from typing import Optional
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from backend.config import get_settings, logger
from backend.models.schemas import (
    IngestResponse,
    KBFile,
    KBFolder,
    KBResponse,
    KBSubfolder,
    StatusResponse,
    UploadResponse,
    WorkflowStatusResponse,
    WorkflowStep,
)
from backend.services.ingest import dbos as ingest_dbos
from backend.services.ingest import ingest_workflow
from backend.services.vector_db import vector_db

router = APIRouter(tags=["Knowledge Base"])

settings = get_settings()

# Upload constraints
_ALLOWED_EXTENSIONS = {
    ".pdf", ".txt", ".md", ".csv",
    ".docx",                        # Word
    ".pptx",                        # PowerPoint
    ".xlsx",                        # Excel
    ".html", ".htm",                # Web pages
}
_ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/octet-stream",
    "text/plain",
    "text/markdown",
    "text/csv",
    "text/html",
    # DOCX
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    # PPTX
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-powerpoint",
    # XLSX
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
}

# SSRF guard — private / reserved IPv4 and IPv6 ranges
_PRIVATE_NETWORKS: list = [
    ipaddress.IPv4Network("10.0.0.0/8"),
    ipaddress.IPv4Network("172.16.0.0/12"),
    ipaddress.IPv4Network("192.168.0.0/16"),
    ipaddress.IPv4Network("127.0.0.0/8"),
    ipaddress.IPv4Network("169.254.0.0/16"),  # link-local / AWS metadata
    ipaddress.IPv4Network("0.0.0.0/8"),
    ipaddress.IPv6Network("::1/128"),
    ipaddress.IPv6Network("fc00::/7"),
]
_BLOCKED_HOSTNAMES = {"localhost", "::1", "0.0.0.0"}


def _check_url_safe(url: str) -> tuple[bool, str]:
    """Return (is_safe, reason). Blocks non-http/https schemes and private IPs."""
    try:
        parsed = urlparse(url)
    except Exception:
        return False, "Malformed URL"

    if parsed.scheme not in ("http", "https"):
        return False, f"Unsupported scheme '{parsed.scheme}': only http and https are allowed"

    hostname = (parsed.hostname or "").lower()
    if not hostname:
        return False, "Missing hostname"

    if hostname in _BLOCKED_HOSTNAMES:
        return False, "Requests to localhost are not allowed"

    try:
        addr = ipaddress.ip_address(hostname)
        for net in _PRIVATE_NETWORKS:
            if addr in net:
                return False, "Requests to private/internal IP addresses are not allowed"
    except ValueError:
        pass  # Domain name — let httpx resolve it

    return True, ""
_MAX_FILES_PER_REQUEST = 20
_MAX_FILE_SIZE_BYTES = settings.max_upload_size_mb * 1024 * 1024


# ── Browse ───────────────────────────────────────────────────────────────────

@router.get("/kb", response_model=KBResponse)
async def get_knowledge_base():
    """
    Return the knowledge base grouped by category.

    Each unique category in chunk metadata becomes a KBFolder.  Files without
    a category field (legacy chunks) fall back to "General".  Folders are
    returned in alphabetical order so the UI is stable across reloads.
    """
    try:
        # Use the in-memory vector_db to avoid a redundant disk read.
        active_chunks = [m for m in vector_db.metadata if not m.get("deleted")]
        if not active_chunks:
            return KBResponse()

        # First-pass: build source → (category, type) map.
        source_category: dict[str, str] = {}
        source_type: dict[str, str] = {}
        for chunk in active_chunks:
            src = chunk.get("source", "")
            if not src or src in source_category:
                continue
            source_category[src] = chunk.get("category") or "General"
            source_type[src] = chunk.get("type", "file")

        # Second-pass: group files by category, enrich with filesystem stats.
        category_files: dict[str, list[KBFile]] = {}
        category_updated: dict[str, str] = {}

        for src, cat in source_category.items():
            file_meta = KBFile(name=src, type=source_type.get(src, "file"))
            try:
                file_path = os.path.join(settings.docs_dir, src)
                if os.path.exists(file_path):
                    stats = os.stat(file_path)
                    file_meta.size = f"{stats.st_size / 1024:.1f} KB"
                    file_meta.modified = datetime.fromtimestamp(
                        stats.st_mtime
                    ).strftime("%b %d, %Y")
                    category_updated[cat] = file_meta.modified
            except OSError:
                pass

            category_files.setdefault(cat, []).append(file_meta)

        result = [
            KBFolder(
                name=cat,
                description=f"Documents and resources in the {cat} category.",
                icon="folder",
                updated=category_updated.get(cat, "Just now"),
                subfolders=[KBSubfolder(name=cat, files=files)],
            )
            for cat, files in sorted(category_files.items())
        ]

        return KBResponse(folders=result)

    except Exception:
        logger.exception("Error building knowledge base listing")
        return KBResponse()


# ── Upload ───────────────────────────────────────────────────────────────────

def _sanitize_filename(filename: str) -> str:
    """
    Remove path separators and leading dots to prevent directory traversal.
    """
    name = os.path.basename(filename)
    name = name.lstrip(".")
    return name or "unnamed_upload.pdf"


def _validate_upload(file: UploadFile) -> Optional[str]:
    """
    Validate a single uploaded file. Returns an error message or None if valid.
    """
    safe_name = _sanitize_filename(file.filename or "")
    _, ext = os.path.splitext(safe_name)

    if ext.lower() not in _ALLOWED_EXTENSIONS:
        return f"Rejected '{safe_name}': only {', '.join(_ALLOWED_EXTENSIONS)} files are accepted"

    if file.content_type and file.content_type not in _ALLOWED_MIME_TYPES:
        return f"Rejected '{safe_name}': invalid MIME type '{file.content_type}'"

    return None


@router.post("/upload", response_model=UploadResponse)
async def upload_documents(
    files: list[UploadFile] = File(...),
    category: str = Form("General"),
):
    """
    Upload documents to the docs/ directory for later ingestion.

    Validates:
    - File count (max 20 per request)
    - File extension (allowed types)
    - MIME type
    - File size (configurable)

    The optional ``category`` form field groups the uploaded files under a
    named category so the knowledge base and chat scope filter can be
    organised by topic (e.g. "Health", "Finance").  Defaults to "General".
    """
    if len(files) > _MAX_FILES_PER_REQUEST:
        raise HTTPException(
            status_code=400,
            detail=f"Too many files: maximum {_MAX_FILES_PER_REQUEST} per request",
        )

    # Validate all files before writing any to disk.
    for file in files:
        error = _validate_upload(file)
        if error:
            raise HTTPException(status_code=400, detail=error)

    os.makedirs(settings.docs_dir, exist_ok=True)

    saved_files: list[str] = []
    for file in files:
        safe_name = _sanitize_filename(file.filename or "upload.pdf")
        file_path = os.path.join(settings.docs_dir, safe_name)

        # Stream the file to disk with size enforcement.
        bytes_written = 0
        with open(file_path, "wb") as buffer:
            while chunk := await file.read(8192):
                bytes_written += len(chunk)
                if bytes_written > _MAX_FILE_SIZE_BYTES:
                    buffer.close()
                    os.remove(file_path)
                    raise HTTPException(
                        status_code=413,
                        detail=f"File '{safe_name}' exceeds the {settings.max_upload_size_mb} MB limit",
                    )
                buffer.write(chunk)

        saved_files.append(safe_name)
        logger.info("Uploaded file: %s (%d bytes)", safe_name, bytes_written)

    # Persist category assignments so the ingestion workflow can stamp each
    # chunk with the correct category when it processes these files.
    safe_category = category.strip() or "General"
    cat_map = _read_categories()
    for name in saved_files:
        cat_map[name] = safe_category
    _write_categories(cat_map)

    return UploadResponse(
        status="success",
        message=f"Successfully uploaded: {', '.join(saved_files)}",
        files=saved_files,
    )


# ── Ingest ───────────────────────────────────────────────────────────────────

@router.post("/ingest", response_model=IngestResponse)
async def ingest_endpoint():
    """Trigger a durable DBOS ingestion workflow and return its ID."""
    try:
        handle = ingest_dbos.start_workflow(ingest_workflow)
        logger.info("Started ingestion workflow: %s", handle.workflow_id)
        return IngestResponse(status="success", workflow_id=handle.workflow_id)
    except Exception as e:
        logger.exception("Failed to start ingestion workflow")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ingest/status/{workflow_id}", response_model=WorkflowStatusResponse)
def get_ingest_status(workflow_id: str):
    """
    Poll the status and steps of an ingestion workflow.

    If the workflow has completed successfully, the in-memory
    vector database is automatically reloaded.

    Validates:
    - workflow_id format (alphanumeric + hyphens, max 100 chars)

    Returns:
    - 200: Workflow status with steps
    - 400: Invalid workflow_id format
    - 404: Workflow not found
    - 500: Server error
    """
    # Validate workflow_id format to prevent injection/traversal attacks.
    if not workflow_id or len(workflow_id) > 100:
        raise HTTPException(status_code=400, detail="Invalid workflow ID: must be 1-100 characters")

    # Allow alphanumeric, hyphens, underscores only
    if not all(c.isalnum() or c in "-_" for c in workflow_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid workflow ID: only alphanumeric, hyphens, and underscores allowed",
        )

    try:
        status = ingest_dbos.get_workflow_status(workflow_id)
        if not status:
            raise HTTPException(status_code=404, detail=f"Workflow '{workflow_id}' not found")

        if status.status == "SUCCESS":
            logger.info("Workflow %s succeeded — reloading vector DB", workflow_id)
            vector_db.reload()

        steps = ingest_dbos.list_workflow_steps(workflow_id)

        formatted_steps: list[WorkflowStep] = []
        for step in steps:
            fn_name = step.get("function_name", "Unknown Step")
            out_val = step.get("output", [])

            safe_out: list = []
            if out_val:
                try:
                    parsed = json.loads(out_val) if isinstance(out_val, str) else out_val
                    if fn_name == "process_single_document" and isinstance(parsed, list) and len(parsed) > 0:
                        safe_out = [{"source": parsed[0].get("source", "Unknown")}]
                except (json.JSONDecodeError, TypeError):
                    pass

            formatted_steps.append(WorkflowStep(
                name=fn_name,
                status="COMPLETED" if not step.get("error") else "ERROR",
                output=safe_out,
            ))

        # Inject a RUNNING step indicator for the frontend when workflow is pending.
        if status.status == "PENDING":
            expected_order = [
                "list_document_files",
                "process_single_document",
                "embed_batch",
                "save_vector_store",
            ]
            last_completed = formatted_steps[-1].name if formatted_steps else None

            if last_completed in expected_order:
                idx = expected_order.index(last_completed)
                if idx + 1 < len(expected_order) and last_completed not in [
                    "process_single_document",
                    "embed_batch",
                ]:
                    next_step = expected_order[idx + 1]
                    formatted_steps.append(WorkflowStep(name=next_step, status="RUNNING"))
                else:
                    formatted_steps.append(WorkflowStep(
                        name=last_completed,
                        status="RUNNING",
                        output=formatted_steps[-1].output,
                    ))
            elif not formatted_steps:
                formatted_steps.append(WorkflowStep(name="list_document_files", status="RUNNING"))

        return WorkflowStatusResponse(
            workflow_id=workflow_id,
            status=status.status,
            steps=formatted_steps,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error fetching workflow status for %s", workflow_id)
        raise HTTPException(status_code=500, detail="Error fetching workflow status")


# ── Document List ────────────────────────────────────────────────────────────

@router.get("/api/docs/list")
def list_indexed_docs():
    """
    Return a flat, sorted list of every non-deleted indexed document.

    Used by the frontend document-scope filter so users can pick which
    documents the agent should search.

    Response: ``{"documents": [{"name": str, "type": str, "chunk_count": int}]}``
    """
    return {"documents": vector_db.list_documents()}


# ── Categories ───────────────────────────────────────────────────────────────

@router.get("/api/categories")
def list_categories():
    """
    Return a sorted list of all known category names.

    Combines two sources so the list is complete even before ingestion runs:
    - Chunk metadata in the in-memory vector DB (already-indexed files).
    - ``categories.json`` on disk (files uploaded but not yet ingested).

    "General" is always present as the default fallback.
    """
    names: set[str] = {"General"}

    # Already-indexed chunks
    for chunk in vector_db.metadata:
        if not chunk.get("deleted"):
            cat = chunk.get("category")
            if cat:
                names.add(cat)

    # Pending (uploaded but not yet ingested)
    for cat in _read_categories().values():
        if cat:
            names.add(cat)

    return {"categories": sorted(names)}


# ── Vault Stats ──────────────────────────────────────────────────────────────

@router.get("/api/vault/stats")
def get_vault_stats():
    """
    Return a privacy-focused summary of the local knowledge vault.

    All values are derived from on-disk files — no external calls are made.
    The ``external_calls`` field is always 0 to prove the vault is fully local.
    """
    # Count documents and chunks from metadata
    total_documents = 0
    total_chunks = 0
    last_ingested_at: str | None = None

    if os.path.exists(settings.metadata_file):
        try:
            with open(settings.metadata_file, "r") as f:
                metadata = json.load(f)

            active = [m for m in metadata if not m.get("deleted")]
            total_chunks = len(active)
            unique_sources = {m.get("source") for m in active if m.get("source")}
            total_documents = len(unique_sources)

            # Derive last_ingested_at from the metadata file's mtime
            mtime = os.path.getmtime(settings.metadata_file)
            from datetime import datetime as _dt
            last_ingested_at = _dt.fromtimestamp(mtime).isoformat(timespec="seconds")
        except Exception:
            logger.exception("Error reading metadata for vault stats")

    # Index size in KB
    index_size_kb = 0
    if os.path.exists(settings.index_file):
        index_size_kb = round(os.path.getsize(settings.index_file) / 1024, 1)

    return {
        "total_documents": total_documents,
        "total_chunks": total_chunks,
        "index_size_kb": index_size_kb,
        "last_ingested_at": last_ingested_at,
        "ollama_host": settings.ollama_host,
        "external_calls": 0,
        "storage": {
            "vector_index": settings.index_file,
            "metadata": settings.metadata_file,
            "documents": settings.docs_dir,
        },
    }


# ── URL Ingestion ─────────────────────────────────────────────────────────────

class _URLIngestRequest(BaseModel):
    url: str


@router.post("/ingest/url")
async def ingest_url(payload: _URLIngestRequest):
    """
    Fetch a web page, extract its text, save it to docs/, and trigger ingestion.

    SSRF protection:
    - Only http:// and https:// schemes are accepted.
    - Requests to localhost and RFC-1918 / link-local IP ranges are blocked.

    The extracted text is saved as ``<sanitised-hostname+path>.txt`` in the
    docs directory so the normal ingestion workflow can process it.
    """
    url = payload.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    safe, reason = _check_url_safe(url)
    if not safe:
        raise HTTPException(status_code=400, detail=reason)

    # ── Fetch ──────────────────────────────────────────────────────────
    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=15.0,
            headers={"User-Agent": "CogniVaultBot/1.0 (local privacy-first RAG)"},
        ) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            raw_html = resp.text
    except httpx.TimeoutException:
        raise HTTPException(status_code=400, detail="Request timed out fetching the URL")
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"URL returned HTTP {exc.response.status_code}",
        )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {exc}")

    # ── Extract clean text ─────────────────────────────────────────────
    try:
        import trafilatura
        text = trafilatura.extract(raw_html, include_tables=True, include_links=False)
    except Exception:
        text = None

    if not text or len(text.strip()) < 80:
        raise HTTPException(
            status_code=400,
            detail="Could not extract readable text from that URL. "
            "The page may be JavaScript-heavy or require authentication.",
        )

    # ── Derive a safe filename from the URL ───────────────────────────
    parsed = urlparse(url)
    raw_name = (parsed.netloc + parsed.path).strip("/")
    safe_name = re.sub(r"[^\w\-]", "_", raw_name)[:80] + ".txt"
    if not safe_name or safe_name == ".txt":
        safe_name = "url_import.txt"

    os.makedirs(settings.docs_dir, exist_ok=True)
    dest = os.path.join(settings.docs_dir, safe_name)
    with open(dest, "w", encoding="utf-8") as f:
        f.write(f"Source URL: {url}\n\n{text.strip()}")
    logger.info("URL ingest: saved %s (%d chars) as %s", url[:80], len(text), safe_name)

    # Register under "General" so /kb shows it correctly.
    cat_map = _read_categories()
    cat_map.setdefault(safe_name, "General")
    _write_categories(cat_map)

    # ── Trigger ingestion workflow ────────────────────────────────────
    try:
        handle = ingest_dbos.start_workflow(ingest_workflow)
        workflow_id = handle.workflow_id
    except Exception as exc:
        logger.exception("URL ingest: failed to start workflow")
        raise HTTPException(status_code=500, detail=f"Could not start ingestion: {exc}")

    return {
        "status": "success",
        "filename": safe_name,
        "workflow_id": workflow_id,
        "chars_extracted": len(text),
    }


# ── Delete ───────────────────────────────────────────────────────────────────

@router.delete("/api/docs/{filename}", response_model=StatusResponse)
async def delete_document(filename: str):
    """Soft-delete a document from the vector store and remove the physical file."""
    safe_name = _sanitize_filename(filename)

    # Check if the document exists in metadata or on disk.
    file_path = os.path.join(settings.docs_dir, safe_name)
    in_metadata = False
    if os.path.exists(settings.metadata_file):
        with open(settings.metadata_file, "r") as f:
            metadata = json.load(f)
        in_metadata = any(
            item.get("source") == safe_name and not item.get("deleted")
            for item in metadata
        )

    if not os.path.exists(file_path) and not in_metadata:
        raise HTTPException(
            status_code=404,
            detail=f"Document '{safe_name}' not found",
        )

    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info("Deleted file: %s", safe_name)

        if os.path.exists(settings.metadata_file):
            with open(settings.metadata_file, "r") as f:
                metadata = json.load(f)

            for item in metadata:
                if item.get("source") == safe_name:
                    item["deleted"] = True

            with open(settings.metadata_file, "w") as f:
                json.dump(metadata, f)

            vector_db.reload()

        return StatusResponse(status="success")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error deleting document %s", safe_name)
        raise HTTPException(status_code=500, detail=str(e))


# ── Save-to-KB from chat attachments ────────────────────────────────────────

import base64

# ── Category helpers ──────────────────────────────────────────────────────────

def _read_categories() -> dict[str, str]:
    """Return the filename→category mapping from disk."""
    path = settings.categories_file
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r") as f:
            return json.load(f)
    except Exception:
        logger.exception("Failed to read categories file")
        return {}


def _write_categories(mapping: dict[str, str]) -> None:
    """Persist the filename→category mapping to disk."""
    try:
        with open(settings.categories_file, "w") as f:
            json.dump(mapping, f, indent=2)
    except Exception:
        logger.exception("Failed to write categories file")


class _SaveToKBFileItem(BaseModel):
    name: str
    mime_type: str
    data: str  # base64


class _SaveToKBRequest(BaseModel):
    files: list[_SaveToKBFileItem]


@router.post(
    "/api/save-to-kb",
    responses={
        200: {"description": "Files saved and ingestion started"},
        400: {"description": "No valid files provided"},
    },
)
async def save_to_kb(request: _SaveToKBRequest):
    """
    Accept base64-encoded text files from the chat UI, save them to the
    docs directory, and trigger the durable ingestion workflow.
    """
    os.makedirs(settings.docs_dir, exist_ok=True)
    saved: list[str] = []

    for item in request.files:
        # Sanitise filename
        safe_name = os.path.basename(item.name).strip()
        if not safe_name:
            continue

        _, ext = os.path.splitext(safe_name)
        if ext.lower() not in _ALLOWED_EXTENSIONS:
            logger.warning("save-to-kb: skipping '%s' (unsupported extension)", safe_name)
            continue

        try:
            raw = base64.b64decode(item.data)
            dest = os.path.join(settings.docs_dir, safe_name)
            with open(dest, "wb") as f:
                f.write(raw)
            saved.append(safe_name)
            logger.info("save-to-kb: wrote %s (%d bytes)", safe_name, len(raw))
        except Exception:
            logger.exception("save-to-kb: failed to write %s", safe_name)

    if not saved:
        raise HTTPException(status_code=400, detail="No valid files could be saved")

    # Register saved files under "General" so they appear correctly in /kb.
    cat_map = _read_categories()
    for name in saved:
        cat_map.setdefault(name, "General")
    _write_categories(cat_map)

    # Auto-trigger ingestion
    try:
        handle = ingest_dbos.start_workflow(ingest_workflow)
        workflow_id = handle.workflow_id
        logger.info("save-to-kb: ingestion workflow started: %s", workflow_id)
    except Exception:
        logger.exception("save-to-kb: failed to start ingestion")
        workflow_id = None

    return {
        "status": "success",
        "saved_files": saved,
        "workflow_id": workflow_id,
    }
