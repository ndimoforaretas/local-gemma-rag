"""
Gemma CogniVault — FastAPI Application Entrypoint

Run with:
    python -m backend.main
"""

import os
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.config import get_settings, logger
from backend.middleware import RequestIDMiddleware, register_exception_handlers
from backend.models.schemas import HealthResponse
from backend.routers import audio, history, knowledge, progress, rag, study
from backend.services.ingest import dbos as ingest_dbos
from backend.services.vector_db import vector_db

settings = get_settings()


# ── Lifecycle ────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup / shutdown lifecycle."""
    logger.info("═" * 60)
    logger.info("  Gemma CogniVault starting")
    logger.info("  LLM model    : %s", settings.llm_model)
    logger.info("  Embed model  : %s", settings.embedding_model)
    logger.info("  Ollama host  : %s", settings.ollama_host)
    logger.info("  Vector chunks: %d", len(vector_db.metadata))
    logger.info("═" * 60)

    yield  # Application is running

    logger.info("Gemma CogniVault shutting down")


# ── App factory ──────────────────────────────────────────────────────────────

app = FastAPI(
    title="Gemma CogniVault API",
    description="Local RAG pipeline powered by Gemma 4 via Ollama",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# ── Middleware (order matters: outermost first) ──────────────────────────────

app.add_middleware(RequestIDMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Exception handlers ──────────────────────────────────────────────────────

register_exception_handlers(app)

# ── Routers ──────────────────────────────────────────────────────────────────

app.include_router(rag.router)
app.include_router(knowledge.router)
app.include_router(history.router)
app.include_router(audio.router)
app.include_router(progress.router)
app.include_router(study.router)


# ── Health check ─────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """
    Lightweight readiness probe for the application.

    Returns:
    - status: "healthy" if Ollama is connected and vector DB is loaded
    - status: "degraded" if Ollama is down but vector DB is loaded
    - ollama_connected: true/false based on connectivity
    - vector_db_loaded: true/false based on FAISS index status
    - indexed_chunks: count of non-deleted chunks in vector store
    """
    ollama_ok = False
    try:
        import ollama as _ollama

        # Try to connect with a short timeout
        _ollama.list()
        ollama_ok = True
    except (ConnectionError, TimeoutError, Exception) as e:
        logger.debug("Ollama health check failed: %s", type(e).__name__)
        ollama_ok = False

    vector_db_loaded = vector_db.index is not None
    status = "healthy" if (ollama_ok and vector_db_loaded) else "degraded"

    return HealthResponse(
        status=status,
        ollama_connected=ollama_ok,
        vector_db_loaded=vector_db_loaded,
        indexed_chunks=len(vector_db.metadata),
    )


# ── Static file mounts ──────────────────────────────────────────────────────
# Moved to /static/docs to avoid collision with FastAPI's Swagger UI at /docs.

os.makedirs(settings.docs_dir, exist_ok=True)
app.mount("/static/docs", StaticFiles(directory=settings.docs_dir), name="uploaded_docs")

# Serve the compiled React frontend as a catch-all.
_frontend_dist = os.path.join("frontend", "dist")
if os.path.isdir(_frontend_dist):
    app.mount("/", StaticFiles(directory=_frontend_dist, html=True), name="frontend")
else:
    logger.warning(
        "Frontend dist not found at %s — run 'cd frontend && npm run build' first",
        _frontend_dist,
    )


# ── Entrypoint ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    logger.info("Launching DBOS durable workflow engine")
    try:
        ingest_dbos.launch()
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "DBOS failed to launch (durable workflows disabled): %s — "
            "check that PostgreSQL is running and DB_URL is correct.",
            exc,
        )

    logger.info("Starting Gemma CogniVault on http://0.0.0.0:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
