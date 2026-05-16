"""
RAG Agent — Strands SDK agent with streaming support.

Configures the Gemma model via Ollama and exposes an async generator
that yields text chunks and metadata events for the frontend.
"""

import json
from typing import AsyncGenerator

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
    system_prompt=(
        "You are Gemma CogniVault AI, a precise technical librarian and research assistant.\n"
        "You have access to a vast corporate knowledge base.\n\n"
        "FOLLOW THESE RULES STRICTLY:\n"
        "1. ALWAYS use the 'search_knowledge_base' tool if the user asks about ANY document, person, or technical topic.\n"
        "2. Even if you think you know the answer, verify it using the tools first to ensure accuracy.\n"
        "3. If the user mentions a specific file or name, immediately search for that specific term.\n"
        "4. Your responses must be grounded in the facts retrieved from the tool.\n"
        "5. Refer to yourself as 'Gemma CogniVault AI'.\n\n"
        "VERY IMPORTANT: When providing code examples, ALWAYS use triple backticks with the language identifier\n"
        "(e.g., ```python) and put each code block on its own line. Never write code as plain text."
    ),
)


async def run_rag_stream(query: str) -> AsyncGenerator[str, None]:
    """
    Stream agentic RAG responses.

    Yields plain-text chunks for the response body and special
    ``Metadata: {...}`` lines when the agent retrieves a source document.
    """
    search_knowledge_base.last_doc = {}  # type: ignore[attr-defined]

    try:
        async for event in agent.stream_async(query):
            ev = event.get("event", {})

            # Tool-call detection: emit metadata when knowledge base is queried.
            c_start = ev.get("contentBlockStart", {}).get("start", {})
            tool_name = c_start.get("toolUse", {}).get("name")
            if tool_name == "search_knowledge_base":
                last_doc = getattr(search_knowledge_base, "last_doc", {})
                if last_doc:
                    yield f"Metadata: {json.dumps(last_doc)}\n"

            # Text chunk from the model response.
            delta_text = (
                ev.get("contentBlockDelta", {}).get("delta", {}).get("text")
            )
            if delta_text:
                yield delta_text

    except Exception:
        logger.exception("Error in RAG stream for query: %s", query[:200])
        yield "Error: An internal error occurred while processing your query."
