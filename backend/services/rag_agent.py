"""
RAG Agent — Strands SDK agent with streaming support.

Configures the Gemma model via Ollama and exposes an async generator
that yields text chunks and metadata events for the frontend.
"""

import base64
import json
from typing import AsyncGenerator, Optional, List

from strands import Agent
from strands.models.ollama import OllamaModel

from backend.config import get_settings, logger
from backend.tools.agent_tools import (
    calculator,
    current_time,
    search_knowledge_base,
)

settings = get_settings()

ollama_model = OllamaModel(
    host=settings.ollama_host,
    model_id=settings.llm_model,
)

agent = Agent(
    model=ollama_model,
    tools=[search_knowledge_base, calculator, current_time],
    system_prompt=settings.agent_system_prompt,
)


def _mime_to_format(mime_type: str) -> str:
    """Convert a MIME type like 'image/png' to a format string like 'png'."""
    mapping = {
        "image/jpeg": "jpeg",
        "image/jpg": "jpeg",
        "image/png": "png",
        "image/gif": "gif",
        "image/webp": "webp",
    }
    return mapping.get(mime_type, mime_type.split("/")[-1])


async def run_rag_stream(query: str, attachments: Optional[list] = None) -> AsyncGenerator[str, None]:
    """
    Stream agentic RAG responses using JSON Lines format.

    Yields one JSON object per line:
    - {"type": "text", "data": "text chunk"}
    - {"type": "metadata", "data": {source document metadata}}

    This ensures unambiguous parsing and resilience against response
    content containing special delimiters.
    """
    search_knowledge_base.last_doc = {}  # type: ignore[attr-defined]

    try:
        # Build the prompt: plain string for text-only, list[ContentBlock] for multimodal
        user_input: any = query
        if attachments:
            content_blocks = []
            if query:
                content_blocks.append({"text": query})
            for att in attachments:
                if att.mime_type.startswith("image/"):
                    image_bytes = base64.b64decode(att.data)
                    content_blocks.append({
                        "image": {
                            "format": _mime_to_format(att.mime_type),
                            "source": {"bytes": image_bytes},
                        }
                    })
            if content_blocks:
                user_input = content_blocks

        async for event in agent.stream_async(user_input):
            ev = event.get("event", {})

            # Tool-call detection: emit metadata when knowledge base is queried.
            c_start = ev.get("contentBlockStart", {}).get("start", {})
            tool_name = c_start.get("toolUse", {}).get("name")
            if tool_name == "search_knowledge_base":
                last_doc = getattr(search_knowledge_base, "last_doc", {})
                if last_doc:
                    yield f'{json.dumps({"type": "metadata", "data": last_doc})}\n'

            # Text chunk from the model response.
            delta_text = (
                ev.get("contentBlockDelta", {}).get("delta", {}).get("text")
            )
            if delta_text:
                yield f'{json.dumps({"type": "text", "data": delta_text})}\n'

    except Exception:
        logger.exception("Error in RAG stream for query: %s", query[:200])
        yield f'{json.dumps({"type": "error", "data": "An internal error occurred while processing your query."})}\n'
