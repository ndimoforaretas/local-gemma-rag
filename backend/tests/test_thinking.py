"""
Tests for Step 1 — Thinking Mode (Gemma 4 reasoning chain).

Validates that:
- _stream_thinking() emits {"type": "thinking"} JSON Lines events when the
  Ollama model returns thinking tokens.
- _stream_thinking() yields nothing when thinking_mode is False.
- _stream_thinking() handles connection/model errors gracefully (no crash).
- run_rag_stream() includes thinking events in its output when the phase-1
  Ollama call returns thinking tokens.
- run_rag_stream() produces no thinking events when thinking_mode is False.
"""

import json
import types
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_ollama_chunk(thinking: str = "", content: str = ""):
    """Build a minimal fake Ollama streaming chunk."""
    msg = MagicMock()
    msg.thinking = thinking
    msg.content = content
    chunk = MagicMock()
    chunk.message = msg
    return chunk


async def _async_iter(items):
    """Yield items from a plain list as an async generator."""
    for item in items:
        yield item


# ── _stream_thinking unit tests ───────────────────────────────────────────────

class TestStreamThinking:
    """Unit tests for the _stream_thinking() async generator."""

    @pytest.mark.asyncio
    async def test_emits_thinking_events_when_tokens_present(self):
        """Thinking tokens from Ollama are emitted as JSON Lines events."""
        fake_chunks = [
            _make_ollama_chunk(thinking="I should "),
            _make_ollama_chunk(thinking="search the KB."),
        ]

        mock_stream = _async_iter(fake_chunks)
        mock_client = AsyncMock()
        mock_client.chat = AsyncMock(return_value=mock_stream)

        with patch("backend.services.rag_agent._ollama") as mock_ollama_mod:
            mock_ollama_mod.AsyncClient.return_value = mock_client
            from backend.services.rag_agent import _stream_thinking

            events = []
            async for line in _stream_thinking("What is the capital of France?"):
                events.append(json.loads(line.strip()))

        assert len(events) == 2
        assert all(e["type"] == "thinking" for e in events)
        assert events[0]["data"] == "I should "
        assert events[1]["data"] == "search the KB."

    @pytest.mark.asyncio
    async def test_yields_nothing_when_thinking_mode_disabled(self, monkeypatch):
        """When thinking_mode=False, _stream_thinking yields no events."""
        monkeypatch.setenv("THINKING_MODE", "false")

        # Reload settings so the env override takes effect
        from backend.config import get_settings
        get_settings.cache_clear()
        monkeypatch.setattr(
            "backend.services.rag_agent.settings",
            get_settings(),
        )

        from backend.services.rag_agent import _stream_thinking

        events = []
        async for line in _stream_thinking("Any query"):
            events.append(line)

        assert events == [], "No events expected when thinking_mode is False"

        # Restore
        get_settings.cache_clear()
        monkeypatch.setattr(
            "backend.services.rag_agent.settings",
            get_settings(),
        )

    @pytest.mark.asyncio
    async def test_skips_chunks_with_empty_thinking(self):
        """Chunks with empty thinking field are silently skipped."""
        fake_chunks = [
            _make_ollama_chunk(thinking=""),
            _make_ollama_chunk(thinking="Real reasoning here."),
            _make_ollama_chunk(thinking=""),
        ]

        mock_stream = _async_iter(fake_chunks)
        mock_client = AsyncMock()
        mock_client.chat = AsyncMock(return_value=mock_stream)

        with patch("backend.services.rag_agent._ollama") as mock_ollama_mod:
            mock_ollama_mod.AsyncClient.return_value = mock_client
            from backend.services.rag_agent import _stream_thinking

            events = []
            async for line in _stream_thinking("test query"):
                events.append(json.loads(line.strip()))

        assert len(events) == 1
        assert events[0]["data"] == "Real reasoning here."

    @pytest.mark.asyncio
    async def test_handles_connection_error_gracefully(self):
        """An Ollama connection error causes _stream_thinking to yield nothing."""
        mock_client = AsyncMock()
        mock_client.chat = AsyncMock(side_effect=ConnectionError("Ollama down"))

        with patch("backend.services.rag_agent._ollama") as mock_ollama_mod:
            mock_ollama_mod.AsyncClient.return_value = mock_client
            from backend.services.rag_agent import _stream_thinking

            events = []
            async for line in _stream_thinking("test"):
                events.append(line)

        # Must not raise; yields nothing
        assert events == []


# ── run_rag_stream integration tests ─────────────────────────────────────────

class TestRunRagStreamThinking:
    """Integration tests verifying thinking events appear in the full stream."""

    @pytest.mark.asyncio
    async def test_thinking_events_appear_before_text_events(self):
        """
        With thinking mocked, the full stream emits thinking events first,
        then text events from the agent phase.
        """
        thinking_chunks = [
            _make_ollama_chunk(thinking="Step 1: analyse the query."),
        ]
        mock_stream = _async_iter(thinking_chunks)
        mock_client = AsyncMock()
        mock_client.chat = AsyncMock(return_value=mock_stream)

        # Mock the Strands agent to emit a single text chunk
        fake_agent_event = {
            "event": {
                "contentBlockDelta": {
                    "delta": {"text": "Paris is the capital."}
                }
            }
        }

        async def _fake_agent_stream(_input):
            yield fake_agent_event

        with (
            patch("backend.services.rag_agent._ollama") as mock_ollama_mod,
            patch("backend.services.rag_agent.agent") as mock_agent,
        ):
            mock_ollama_mod.AsyncClient.return_value = mock_client
            mock_agent.stream_async = _fake_agent_stream

            from backend.services.rag_agent import run_rag_stream

            events = []
            async for line in run_rag_stream("What is the capital of France?"):
                events.append(json.loads(line.strip()))

        types_in_order = [e["type"] for e in events]
        assert "thinking" in types_in_order, "thinking event expected"
        assert "text" in types_in_order, "text event expected"

        first_thinking = types_in_order.index("thinking")
        first_text = types_in_order.index("text")
        assert first_thinking < first_text, "thinking must appear before text"

    @pytest.mark.asyncio
    async def test_no_thinking_events_when_mode_disabled(self, monkeypatch):
        """When thinking_mode=False, run_rag_stream emits only text/metadata events."""
        monkeypatch.setenv("THINKING_MODE", "false")
        from backend.config import get_settings
        get_settings.cache_clear()
        monkeypatch.setattr(
            "backend.services.rag_agent.settings",
            get_settings(),
        )

        fake_agent_event = {
            "event": {
                "contentBlockDelta": {
                    "delta": {"text": "No thinking mode."}
                }
            }
        }

        async def _fake_agent_stream(_input):
            yield fake_agent_event

        with patch("backend.services.rag_agent.agent") as mock_agent:
            mock_agent.stream_async = _fake_agent_stream

            from backend.services.rag_agent import run_rag_stream

            events = []
            async for line in run_rag_stream("test"):
                events.append(json.loads(line.strip()))

        types_seen = {e["type"] for e in events}
        assert "thinking" not in types_seen, "No thinking events expected"
        assert "text" in types_seen

        # Restore
        get_settings.cache_clear()
        monkeypatch.setattr(
            "backend.services.rag_agent.settings",
            get_settings(),
        )
