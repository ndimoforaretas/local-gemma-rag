"""
Router for the RAG streaming chat endpoint.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from backend.config import logger
from backend.models.schemas import RagRequest
from backend.services.rag_agent import run_rag_stream

router = APIRouter(tags=["RAG"])


@router.post("/rag")
async def rag_endpoint(request: RagRequest):
    """Stream an agentic RAG response for the given query."""
    logger.info("RAG query received (%d chars)", len(request.query))
    try:
        return StreamingResponse(
            run_rag_stream(request.query),
            media_type="text/event-stream",
        )
    except Exception as e:
        logger.exception("RAG endpoint error")
        raise HTTPException(status_code=500, detail=str(e))
