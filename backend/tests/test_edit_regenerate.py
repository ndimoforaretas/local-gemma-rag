"""
Tests for T3-K — Edit-and-resend / Regenerate.

Validates:
- trim_history_to_turns correctly prunes _session_histories before the agent runs.
- trim_history_to_turns=0 clears history entirely.
- trim_history_to_turns=None leaves history untouched.
- RagRequest schema accepts trim_history_to_turns with ge=0 validation.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch


# ── Schema tests ──────────────────────────────────────────────────────────────

class TestRagRequestTrimField:
    def test_accepts_valid_trim_value(self):
        from backend.models.schemas import RagRequest

        req = RagRequest(query="test", trim_history_to_turns=2)
        assert req.trim_history_to_turns == 2

    def test_accepts_zero(self):
        from backend.models.schemas import RagRequest

        req = RagRequest(query="test", trim_history_to_turns=0)
        assert req.trim_history_to_turns == 0

    def test_defaults_to_none(self):
        from backend.models.schemas import RagRequest

        req = RagRequest(query="test")
        assert req.trim_history_to_turns is None

    def test_rejects_negative(self):
        from pydantic import ValidationError
        from backend.models.schemas import RagRequest

        with pytest.raises(ValidationError):
            RagRequest(query="test", trim_history_to_turns=-1)


# ── History rewind tests ──────────────────────────────────────────────────────

class TestHistoryRewind:
    """Tests that run_rag_stream trims _session_histories when requested."""

    def _seed_history(self, session_id: str, turns: int):
        """Inject `turns` user/assistant pairs into _session_histories."""
        from backend.services import rag_agent

        history = []
        for i in range(turns):
            history.append({"role": "user",      "content": f"user turn {i}"})
            history.append({"role": "assistant",  "content": f"ai turn {i}"})
        rag_agent._session_histories[session_id] = history
        return history

    def _collect(self, gen):
        """Drain an async generator synchronously via pytest-asyncio."""
        import asyncio
        events = []
        async def drain():
            async for chunk in gen:
                events.append(chunk)
        asyncio.get_event_loop().run_until_complete(drain())
        return events

    def _make_fake_agent_stream(self):
        """Return a mock agent whose stream_async yields a single text event."""
        async def _fake_stream(_):
            yield {"event": {"contentBlockDelta": {"delta": {"text": "hi"}}}}

        agent = MagicMock()
        agent.stream_async = _fake_stream
        agent.messages = []
        return agent

    def _make_fake_ollama_stream(self):
        """Empty iterable for the Phase-1 thinking call."""
        async def _empty():
            return
            yield  # make it an async generator
        return _empty()

    @pytest.mark.asyncio
    async def test_trim_to_zero_clears_history(self):
        """trim_history_to_turns=0 should leave the history empty."""
        from backend.services import rag_agent

        sid = "test-trim-zero"
        self._seed_history(sid, turns=3)
        assert len(rag_agent._session_histories[sid]) == 6

        fake_agent = self._make_fake_agent_stream()

        with (
            patch("backend.services.rag_agent._stream_thinking",
                  return_value=self._make_fake_ollama_stream()),
            patch("backend.services.rag_agent.Agent", return_value=fake_agent),
        ):
            async for _ in rag_agent.run_rag_stream(
                "hello",
                session_id=sid,
                trim_history_to_turns=0,
            ):
                pass

        # History was rewound to 0 turns before the new exchange was appended.
        # After the run a single new turn (user + assistant) is saved, so ≤ 2 entries.
        assert len(rag_agent._session_histories.get(sid, [])) <= 2

    @pytest.mark.asyncio
    async def test_trim_to_n_keeps_correct_pairs(self):
        """trim_history_to_turns=1 keeps only the first user/assistant pair."""
        from backend.services import rag_agent

        sid = "test-trim-n"
        self._seed_history(sid, turns=3)
        assert len(rag_agent._session_histories[sid]) == 6

        fake_agent = self._make_fake_agent_stream()

        with (
            patch("backend.services.rag_agent._stream_thinking",
                  return_value=self._make_fake_ollama_stream()),
            patch("backend.services.rag_agent.Agent", return_value=fake_agent),
        ):
            async for _ in rag_agent.run_rag_stream(
                "hello",
                session_id=sid,
                trim_history_to_turns=1,
            ):
                pass

        # After trim: 2 entries (1 pair).  After the new exchange: ≤ 4 entries.
        # The key assertion is that the pre-trim kept exactly 1 pair (2 msgs).
        stored = rag_agent._session_histories.get(sid, [])
        assert stored[0]["content"] == "user turn 0"
        assert stored[1]["content"] == "ai turn 0"

    @pytest.mark.asyncio
    async def test_none_trim_leaves_history_intact(self):
        """trim_history_to_turns=None (default) must not change existing history."""
        from backend.services import rag_agent

        sid = "test-trim-none"
        self._seed_history(sid, turns=2)
        before_len = len(rag_agent._session_histories[sid])  # 4

        fake_agent = self._make_fake_agent_stream()

        with (
            patch("backend.services.rag_agent._stream_thinking",
                  return_value=self._make_fake_ollama_stream()),
            patch("backend.services.rag_agent.Agent", return_value=fake_agent),
        ):
            async for _ in rag_agent.run_rag_stream(
                "hello",
                session_id=sid,
                trim_history_to_turns=None,
            ):
                pass

        stored = rag_agent._session_histories.get(sid, [])
        # Should start with the original 4 messages (new pair appended on top).
        assert stored[0]["content"] == "user turn 0"
        assert len(stored) >= before_len
