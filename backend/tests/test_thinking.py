"""
Tests for the Thinking Mode (Gemma 4 reasoning chain).

P0 fixes tested here:
1. _stream_thinking() now sends the system prompt as the first message
   so the model knows it is CogniVault, not a generic assistant.
2. _stream_thinking() receives images when the user attaches one, so the
   reasoning panel reflects what the model will actually see.
3. run_rag_stream() creates per-session agents — sessions are isolated and
   do not bleed history into each other.

Also validates the original behaviours:
- thinking tokens are emitted as JSON Lines events.
- empty/missing thinking tokens are skipped.
- connection errors are handled gracefully (no crash, no events).
- thinking_mode=False suppresses all thinking events.
"""

import json
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


def _make_agent_mock(text_chunk: str = "Paris is the capital."):
    """Return a mock Agent instance that yields a single text event."""
    fake_event = {
        "event": {
            "contentBlockDelta": {
                "delta": {"text": text_chunk}
            }
        }
    }

    async def _fake_stream(_input):
        yield fake_event

    mock_agent = MagicMock()
    mock_agent.stream_async = _fake_stream
    mock_agent.messages = []
    return mock_agent


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
    async def test_system_prompt_is_sent_to_ollama(self):
        """
        Phase 1 must include the system prompt so the model knows it is
        CogniVault — not a generic assistant (Bug 1 fix).
        """
        mock_stream = _async_iter([_make_ollama_chunk(thinking="reasoning")])
        mock_client = AsyncMock()
        mock_client.chat = AsyncMock(return_value=mock_stream)

        with patch("backend.services.rag_agent._ollama") as mock_ollama_mod:
            mock_ollama_mod.AsyncClient.return_value = mock_client
            from backend.services.rag_agent import _stream_thinking, settings

            async for _ in _stream_thinking("test query"):
                pass

        call_kwargs = mock_client.chat.call_args
        messages_sent = call_kwargs.kwargs.get("messages") or call_kwargs.args[1]
        roles = [m["role"] for m in messages_sent]
        assert "system" in roles, "system message must be included in Phase 1 call"

        system_msg = next(m for m in messages_sent if m["role"] == "system")
        assert "CogniVault" in system_msg["content"] or len(system_msg["content"]) > 10

    @pytest.mark.asyncio
    async def test_images_are_passed_to_thinking_call(self):
        """
        When image bytes are provided, they must be forwarded to the Ollama
        thinking call so the reasoning matches Phase 2 (Bug 2 fix).
        """
        fake_image_bytes = b"\x89PNG\r\n..."  # minimal fake PNG bytes

        mock_stream = _async_iter([_make_ollama_chunk(thinking="I see an image")])
        mock_client = AsyncMock()
        mock_client.chat = AsyncMock(return_value=mock_stream)

        with patch("backend.services.rag_agent._ollama") as mock_ollama_mod:
            mock_ollama_mod.AsyncClient.return_value = mock_client
            from backend.services.rag_agent import _stream_thinking

            async for _ in _stream_thinking("What is in this image?", [fake_image_bytes]):
                pass

        call_kwargs = mock_client.chat.call_args
        messages_sent = call_kwargs.kwargs.get("messages") or call_kwargs.args[1]
        user_msgs = [m for m in messages_sent if m["role"] == "user"]
        assert len(user_msgs) == 1
        assert "images" in user_msgs[0], "images key must be present in user message"
        assert fake_image_bytes in user_msgs[0]["images"]

    @pytest.mark.asyncio
    async def test_yields_nothing_when_thinking_mode_disabled(self, monkeypatch):
        """When thinking_mode=False, _stream_thinking yields no events."""
        monkeypatch.setenv("THINKING_MODE", "false")

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
        monkeypatch.setattr("backend.services.rag_agent.settings", get_settings())

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

        assert events == []


# ── Session isolation tests ───────────────────────────────────────────────────

class TestSessionIsolation:
    """
    Validate that per-session agent creation prevents history from bleeding
    between chat sessions (Bug 3 fix).
    """

    @pytest.mark.asyncio
    async def test_different_sessions_get_independent_histories(self):
        """
        Two requests with different session_ids must not share conversation
        history — each starts from an empty state.
        """
        from backend.services.rag_agent import _session_histories

        # Pre-poison session A's history with fake messages.
        _session_histories["session-A"] = [
            {"role": "user", "content": [{"text": "Tell me about X"}]},
            {"role": "assistant", "content": [{"text": "X is ..."}]},
        ]

        mock_stream = _async_iter([])
        mock_client = AsyncMock()
        mock_client.chat = AsyncMock(return_value=mock_stream)

        captured_history_lengths = {}

        def make_agent_spy(sid: str):
            agent_mock = _make_agent_mock("answer")
            original_messages = []

            def get_messages():
                return original_messages

            def set_messages(v):
                nonlocal original_messages
                original_messages = list(v)
                captured_history_lengths[sid] = len(original_messages)

            type(agent_mock).messages = property(get_messages, set_messages)
            return agent_mock

        with (
            patch("backend.services.rag_agent._ollama") as mock_ollama_mod,
            patch("backend.services.rag_agent.Agent") as MockAgent,
        ):
            mock_ollama_mod.AsyncClient.return_value = mock_client

            MockAgent.side_effect = lambda **kw: make_agent_spy("session-B")

            from backend.services.rag_agent import run_rag_stream

            async for _ in run_rag_stream("Hello", session_id="session-B"):
                pass

        # session-B must NOT have inherited session-A's 2-message history
        assert captured_history_lengths.get("session-B", 0) == 0, (
            "session-B should start with empty history, not session-A's messages"
        )

    @pytest.mark.asyncio
    async def test_same_session_accumulates_history(self):
        """
        Successive calls with the same session_id should build up history,
        allowing multi-turn conversation.
        """
        from backend.services.rag_agent import _session_histories

        sid = "session-C"
        _session_histories.pop(sid, None)

        mock_stream = _async_iter([])
        mock_client = AsyncMock()
        mock_client.chat = AsyncMock(return_value=mock_stream)

        with (
            patch("backend.services.rag_agent._ollama") as mock_ollama_mod,
            patch("backend.services.rag_agent.Agent") as MockAgent,
        ):
            mock_ollama_mod.AsyncClient.return_value = mock_client

            # First call: agent ends with 2 messages in history.
            agent1 = _make_agent_mock("first answer")
            agent1.messages = [
                {"role": "user", "content": [{"text": "Q1"}]},
                {"role": "assistant", "content": [{"text": "A1"}]},
            ]
            MockAgent.return_value = agent1

            from backend.services.rag_agent import run_rag_stream
            async for _ in run_rag_stream("Q1", session_id=sid):
                pass

        # After first call, the session history should have been saved.
        assert sid in _session_histories
        assert len(_session_histories[sid]) == 2


# ── run_rag_stream integration tests ─────────────────────────────────────────

class TestRunRagStreamThinking:
    """Integration tests verifying thinking events appear in the full stream."""

    @pytest.mark.asyncio
    async def test_thinking_events_appear_before_text_events(self):
        """
        With thinking mocked, the full stream emits thinking events first,
        then text events from the agent phase.
        """
        thinking_chunks = [_make_ollama_chunk(thinking="Step 1: analyse.")]
        mock_stream = _async_iter(thinking_chunks)
        mock_client = AsyncMock()
        mock_client.chat = AsyncMock(return_value=mock_stream)

        with (
            patch("backend.services.rag_agent._ollama") as mock_ollama_mod,
            patch("backend.services.rag_agent.Agent") as MockAgent,
        ):
            mock_ollama_mod.AsyncClient.return_value = mock_client
            MockAgent.return_value = _make_agent_mock("Paris is the capital.")

            from backend.services.rag_agent import run_rag_stream

            events = []
            async for line in run_rag_stream("What is the capital of France?",
                                             session_id="test-thinking-order"):
                events.append(json.loads(line.strip()))

        types_in_order = [e["type"] for e in events]
        assert "thinking" in types_in_order, "thinking event expected"
        assert "text" in types_in_order, "text event expected"
        assert types_in_order.index("thinking") < types_in_order.index("text")

    @pytest.mark.asyncio
    async def test_no_thinking_events_when_mode_disabled(self, monkeypatch):
        """When thinking_mode=False, run_rag_stream emits only text/metadata events."""
        monkeypatch.setenv("THINKING_MODE", "false")
        from backend.config import get_settings
        get_settings.cache_clear()
        monkeypatch.setattr("backend.services.rag_agent.settings", get_settings())

        with patch("backend.services.rag_agent.Agent") as MockAgent:
            MockAgent.return_value = _make_agent_mock("No thinking mode.")

            from backend.services.rag_agent import run_rag_stream

            events = []
            async for line in run_rag_stream("test", session_id="test-no-think"):
                events.append(json.loads(line.strip()))

        types_seen = {e["type"] for e in events}
        assert "thinking" not in types_seen, "No thinking events expected"
        assert "text" in types_seen

        # Restore
        get_settings.cache_clear()
        monkeypatch.setattr("backend.services.rag_agent.settings", get_settings())
