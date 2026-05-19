"""
RAG Agent — Strands SDK agent with streaming support.

Configures the Gemma model via Ollama and exposes an async generator
that yields text chunks and metadata events for the frontend.
"""

import base64
import json
import os
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

# Shared agent instance — preserves conversation context within a session.
# History is trimmed when it grows too large (see _trim_history).
agent = Agent(
    model=ollama_model,
    tools=[search_knowledge_base, calculator, current_time],
    system_prompt=settings.agent_system_prompt,
)

# Maximum conversation turns to retain (each turn = 1 user + 1 assistant msg).
_MAX_HISTORY_TURNS = 10
_TEXT_MIME_TYPES = {
    "application/json",
    "application/xml",
    "application/yaml",
    "application/x-yaml",
    "application/javascript",
    "application/typescript",
    "application/csv",
}
_TEXT_FILE_EXTENSIONS = {
    ".txt",
    ".md",
    ".markdown",
    ".csv",
    ".json",
    ".xml",
    ".yaml",
    ".yml",
    ".log",
    ".py",
    ".js",
    ".ts",
    ".tsx",
    ".jsx",
    ".sql",
}


def _trim_history() -> None:
    """Keep agent memory bounded to prevent context-window overflow."""
    try:
        messages = getattr(agent, "messages", None)
        if messages is not None and len(messages) > _MAX_HISTORY_TURNS * 2:
            # Keep only the most recent turns.
            del messages[: len(messages) - _MAX_HISTORY_TURNS * 2]
    except Exception:
        pass  # Agent internals may vary; never crash the request.


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


def _is_text_attachment(att: any) -> bool:
    """Treat common text-like files as text even when browser MIME is generic."""
    mime_type = (getattr(att, "mime_type", "") or "").lower()
    if mime_type.startswith("text/") or mime_type in _TEXT_MIME_TYPES:
        return True

    name = getattr(att, "name", None) or ""
    _, ext = os.path.splitext(name.lower())
    return ext in _TEXT_FILE_EXTENSIONS


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
    _trim_history()

    try:
        # Build the prompt: plain string for text-only, list[ContentBlock] for multimodal
        user_input: any = query
        if attachments:
            # Separate text files and images.
            image_blocks = []
            text_files: list[tuple[str, str]] = []  # (label, content)
            for att in attachments:
                if att.mime_type.startswith("image/"):
                    image_bytes = base64.b64decode(att.data)
                    image_blocks.append({
                        "image": {
                            "format": _mime_to_format(att.mime_type),
                            "source": {"bytes": image_bytes},
                        }
                    })
                elif _is_text_attachment(att):
                    try:
                        file_text = base64.b64decode(att.data).decode("utf-8", errors="replace")
                        file_label = att.name or "attached file"
                        text_files.append((file_label, file_text))
                    except Exception:
                        logger.warning("Failed to decode text attachment")

            # Build a self-contained prompt with all file content inline.
            if text_files:
                parts = []
                parts.append(query)
                parts.append("")
                parts.append(f"[{len(text_files)} attached file(s) follow — "
                             "analyze and respond to each one]")
                parts.append("")
                for i, (label, content) in enumerate(text_files, 1):
                    parts.append(f"=== FILE {i}/{len(text_files)}: {label} ===")
                    parts.append(content)
                    parts.append(f"=== END FILE {i} ===")
                    parts.append("")
                combined_text = "\n".join(parts)
            else:
                combined_text = query or ""

            if image_blocks:
                # Gemma4 best practice #4: modalities before text for optimal performance
                content_blocks = image_blocks + [{"text": combined_text}]
                user_input = content_blocks
            elif text_files:
                # Text-only with file attachments: send as plain string
                user_input = combined_text

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
