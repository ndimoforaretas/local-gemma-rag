"""
Gemma CogniVault — FastAPI Application Entrypoint

Run with:
    python -m backend.main
"""

import os

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.config import get_settings, logger
from backend.models.schemas import HealthResponse
from backend.routers import history, knowledge, rag
from backend.services.ingest import dbos as ingest_dbos
from backend.services.vector_db import vector_db

settings = get_settings()

# ── App factory ──────────────────────────────────────────────────────────────

app = FastAPI(
    title="Gemma CogniVault API",
    description="Local RAG pipeline powered by Gemma 4 via Ollama",
    version="1.0.0",
)

# CORS — tightened to configured origins (defaults to localhost dev ports).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────

app.include_router(rag.router)
app.include_router(knowledge.router)
app.include_router(history.router)


# ── Health check ─────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Lightweight readiness probe for the application."""
    ollama_ok = False
    try:
        import ollama as _ollama
        _ollama.list()
        ollama_ok = True
    except Exception:
        pass

    return HealthResponse(
        status="healthy" if ollama_ok else "degraded",
        ollama_connected=ollama_ok,
        vector_db_loaded=vector_db.index is not None,
        indexed_chunks=len(vector_db.metadata),
    )


# ── Static file mounts ──────────────────────────────────────────────────────
# Order matters: specific mounts before the catch-all frontend mount.

os.makedirs(settings.docs_dir, exist_ok=True)
app.mount("/docs", StaticFiles(directory=settings.docs_dir), name="docs")

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
    ingest_dbos.launch()

    logger.info("Starting Gemma CogniVault on http://0.0.0.0:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
