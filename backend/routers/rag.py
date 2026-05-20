"""
Router for the RAG streaming chat endpoint.
"""

import json
import re

import ollama
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from backend.config import get_settings, logger
from backend.models.schemas import (
    ErrorResponse,
    RagRequest,
    SuggestionItem,
    SuggestionsResponse,
)
from backend.services.rag_agent import run_rag_stream
from backend.services.vector_db import vector_db

router = APIRouter(tags=["RAG"])
settings = get_settings()

_FALLBACK_SUGGESTIONS: list[SuggestionItem] = [
    SuggestionItem(label="Summarise my documents", prompt="Give me a summary of the documents in my knowledge base."),
    SuggestionItem(label="What topics are covered?", prompt="What are the main topics covered across my knowledge base?"),
    SuggestionItem(label="Find key insights", prompt="What are the most important insights or findings in my documents?"),
    SuggestionItem(label="How can you help me?", prompt="What kinds of questions can you answer about my documents?"),
]


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

        if request.attachments and len(request.attachments) > settings.max_attachments_per_message:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Maximum {settings.max_attachments_per_message} attachments per message. "
                    "Use the Knowledge Base to index larger document sets."
                ),
            )

        return StreamingResponse(
            run_rag_stream(
                query,
                request.attachments,
                request.session_id,
                request.document_filter,
            ),
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


@router.get(
    "/rag/suggestions",
    response_model=SuggestionsResponse,
    responses={200: {"description": "4 starter question cards for the chat empty state"}},
)
async def get_suggestions():
    """
    Return 4 contextual starter questions for the chat empty state.

    When the knowledge base has indexed documents the LLM generates questions
    tailored to those document titles.  Falls back to generic questions when
    the KB is empty or the LLM call fails.
    """
    # Collect unique document titles from the in-memory vector store.
    titles = list(
        {
            m.get("source", "").split(" > ")[-1]
            for m in vector_db.metadata
            if not m.get("deleted") and m.get("source")
        }
    )[:8]

    if not titles:
        return SuggestionsResponse(suggestions=_FALLBACK_SUGGESTIONS)

    titles_text = "\n".join(f"- {t}" for t in titles)
    prompt = (
        f"You have a knowledge base containing these documents:\n{titles_text}\n\n"
        "Generate exactly 4 short questions a user might ask about these documents. "
        "Respond ONLY with a valid JSON array and nothing else:\n"
        '[{"label": "up to 6 words", "prompt": "full question"}]'
    )

    try:
        response = ollama.chat(
            model=settings.llm_model,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response["message"]["content"]
        match = re.search(r"\[.*?\]", text, re.DOTALL)
        if match:
            items = json.loads(match.group())
            suggestions = [
                SuggestionItem(label=item["label"].strip(), prompt=item["prompt"].strip())
                for item in items[:4]
                if isinstance(item, dict) and "label" in item and "prompt" in item
            ]
            if suggestions:
                return SuggestionsResponse(suggestions=suggestions)
    except Exception:
        logger.warning("Failed to generate dynamic suggestions — using fallback")

    return SuggestionsResponse(suggestions=_FALLBACK_SUGGESTIONS)
