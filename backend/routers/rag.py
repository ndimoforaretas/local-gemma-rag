"""
Router for the RAG streaming chat endpoint.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from backend.config import logger
from backend.models.schemas import ErrorResponse, RagRequest
from backend.services.rag_agent import run_rag_stream

router = APIRouter(tags=["RAG"])


@router.post(
    "/rag",
    responses={
        200: {"description": "Streaming RAG response (text/event-stream)"},
        422: {"model": ErrorResponse, "description": "Validation error (query too long)"},
        500: {"model": ErrorResponse, "description": "Internal error"},
    },
)
async def rag_endpoint(request: RagRequest):
    """
    Stream an agentic RAG response for the given query.

    The response is a ``text/event-stream`` containing interleaved
    text chunks and ``Metadata: {...}`` lines with source citations.

    Validates:
    - Query length (1-5000 characters per schema)

    Returns:
    - 200: Streaming response with text chunks and metadata
    - 422: Validation error (caught by Pydantic before this handler)
    - 500: Server error during streaming
    """
    logger.info("RAG query received (%d chars)", len(request.query))
    try:
        # Additional runtime validation
        query = request.query.strip()
        if not query:
            raise HTTPException(
                status_code=422,
                detail="Query cannot be empty or whitespace-only",
            )

        return StreamingResponse(
            run_rag_stream(query, request.attachments),
            media_type="text/event-stream",
        )
    except HTTPException:
        raise
    except ValueError as e:
        logger.warning("RAG validation error: %s", e)
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.exception("RAG endpoint error")
        raise HTTPException(status_code=500, detail="An error occurred while processing your query")
