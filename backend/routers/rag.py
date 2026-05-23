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
from backend.services import achievements as ach_service
from backend.services import progress_tracker
from backend.services.rag_agent import run_rag_stream
from backend.services.vector_db import vector_db

router = APIRouter(tags=["RAG"])
settings = get_settings()

_FALLBACK_SUGGESTIONS: list[SuggestionItem] = [
    SuggestionItem(label="What can you do?", prompt="What can CogniVault do? Walk me through the main features — chat, voice input, image analysis, document search, and anything else I should know about."),
    SuggestionItem(label="What files can I upload?", prompt="What types of documents and files can I add to my knowledge base? How do I upload them?"),
    SuggestionItem(label="Can you analyse images?", prompt="Can you read and analyse images or charts I share in the chat? How does that work?"),
    SuggestionItem(label="How do I use voice input?", prompt="How do I ask questions using my voice? Walk me through how the microphone feature works."),
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

        # Record learning-progress event (best-effort; never blocks the chat).
        try:
            progress_tracker.record_message(
                chat_session_id=request.session_id,
                had_scope_filter=bool(request.document_filter),
                had_attachments=bool(request.attachments),
            )
            ach_service.evaluate_and_persist()
        except Exception:
            logger.exception("Progress tracker failed (non-fatal)")

        return StreamingResponse(
            run_rag_stream(
                query,
                request.attachments,
                request.session_id,
                request.document_filter,
                request.trim_history_to_turns,
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
    # Exclude built-in app docs (GUIDE.md) — they are meta-content, not
    # user documents, so they should never drive the dynamic suggestions.
    _EXCLUDED_SOURCES = {"GUIDE.md", "guide.md"}
    titles = list(
        {
            m.get("source", "").split(" > ")[-1]
            for m in vector_db.metadata
            if not m.get("deleted")
            and m.get("source")
            and m.get("source", "").split(" > ")[-1] not in _EXCLUDED_SOURCES
        }
    )[:8]

    if not titles:
        return SuggestionsResponse(suggestions=_FALLBACK_SUGGESTIONS)

    titles_text = "\n".join(f"- {t}" for t in titles)
    prompt = (
        f"You have a knowledge base containing these documents:\n{titles_text}\n\n"
        "Generate exactly 4 practical questions a user might ask to get useful insights "
        "from these documents. Focus on content, facts, and comparisons — not on app "
        "features or technical processes.\n\n"
        "Rules:\n"
        "- label: a concise 2–5 word title for the card (e.g. \"Main findings\", \"Key dates\", \"Compare sections\")\n"
        "- prompt: the full question the user will send\n"
        "- Return ONLY a valid JSON array, no explanation, no markdown:\n"
        '[{"label": "Main findings", "prompt": "What are the main findings in these documents?"}, ...]'
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
