"""
Tests for #6a — chat memory survives a backend restart.

After a restart the in-memory ``_session_histories`` dict is empty. On the first
request for a session we rebuild its agent context from the frontend-persisted
``chat_history.json`` so multi-turn memory isn't lost.

Covers:
- ``_rebuild_history_from_disk`` role mapping, empty-message skipping, and
  dropping the in-flight (trailing, unanswered) user turn.
- Missing file / unknown session → empty (graceful).
- Integration: ``run_rag_stream`` seeds history from disk when the in-memory
  bucket is cold, and leaves a warm bucket untouched.
"""

import json

import pytest
from unittest.mock import MagicMock, patch


def _write_history(path, sessions):
    path.write_text(json.dumps(sessions), encoding="utf-8")


@pytest.fixture
def _clean_sessions():
    """Ensure the in-memory session store is clean around each test."""
    from backend.services import rag_agent

    rag_agent._session_histories.clear()
    yield
    rag_agent._session_histories.clear()


# ── Unit: _rebuild_history_from_disk ──────────────────────────────────────────


def test_rebuild_maps_roles_and_drops_trailing_user(tmp_path, monkeypatch):
    from backend.services import rag_agent

    hist = tmp_path / "chat_history.json"
    _write_history(hist, [
        {"id": "s1", "title": "t", "messages": [
            {"id": "1", "role": "user", "content": "My name is Aretas"},
            {"id": "2", "role": "ai", "content": "Nice to meet you, Aretas",
             "thinking": "reasoning that must NOT leak into history"},
            {"id": "3", "role": "user", "content": "What is my name?"},
        ]},
    ])
    monkeypatch.setattr(rag_agent, "_HISTORY_FILE", str(hist))

    rebuilt = rag_agent._rebuild_history_from_disk("s1")

    # Trailing in-flight user message is dropped → only the answered pair remains.
    assert len(rebuilt) == 2
    assert rebuilt[0] == {"role": "user", "content": [{"text": "My name is Aretas"}]}
    assert rebuilt[1] == {
        "role": "assistant",
        "content": [{"text": "Nice to meet you, Aretas"}],
    }
    # The assistant's private "thinking" never makes it into history.
    assert "reasoning" not in json.dumps(rebuilt)


def test_rebuild_skips_empty_messages(tmp_path, monkeypatch):
    from backend.services import rag_agent

    hist = tmp_path / "chat_history.json"
    _write_history(hist, [
        {"id": "s1", "messages": [
            {"id": "1", "role": "user", "content": "Hello"},
            {"id": "2", "role": "ai", "content": ""},        # empty placeholder
            {"id": "3", "role": "ai", "content": "   "},      # whitespace only
        ]},
    ])
    monkeypatch.setattr(rag_agent, "_HISTORY_FILE", str(hist))

    rebuilt = rag_agent._rebuild_history_from_disk("s1")
    # "Hello" is a trailing user turn → dropped; the empty AI msgs are skipped.
    assert rebuilt == []


def test_rebuild_keeps_full_history_when_last_is_assistant(tmp_path, monkeypatch):
    from backend.services import rag_agent

    hist = tmp_path / "chat_history.json"
    _write_history(hist, [
        {"id": "s1", "messages": [
            {"id": "1", "role": "user", "content": "Q1"},
            {"id": "2", "role": "ai", "content": "A1"},
        ]},
    ])
    monkeypatch.setattr(rag_agent, "_HISTORY_FILE", str(hist))

    rebuilt = rag_agent._rebuild_history_from_disk("s1")
    assert [m["role"] for m in rebuilt] == ["user", "assistant"]


def test_rebuild_missing_file_or_session_returns_empty(tmp_path, monkeypatch):
    from backend.services import rag_agent

    monkeypatch.setattr(rag_agent, "_HISTORY_FILE", str(tmp_path / "nope.json"))
    assert rag_agent._rebuild_history_from_disk("s1") == []

    hist = tmp_path / "chat_history.json"
    _write_history(hist, [{"id": "other", "messages": []}])
    monkeypatch.setattr(rag_agent, "_HISTORY_FILE", str(hist))
    assert rag_agent._rebuild_history_from_disk("s1") == []


# ── Integration: run_rag_stream rebuilds cold sessions ────────────────────────


def _fake_agent():
    async def _fake_stream(_):
        yield {"event": {"contentBlockDelta": {"delta": {"text": "hi"}}}}

    agent = MagicMock()
    agent.stream_async = _fake_stream
    agent.messages = []
    return agent


def _empty_thinking():
    async def _empty():
        return
        yield
    return _empty()


@pytest.mark.asyncio
async def test_cold_session_rebuilt_from_disk(tmp_path, monkeypatch, _clean_sessions):
    from backend.services import rag_agent

    hist = tmp_path / "chat_history.json"
    _write_history(hist, [
        {"id": "sess-cold", "messages": [
            {"id": "1", "role": "user", "content": "My name is Aretas"},
            {"id": "2", "role": "ai", "content": "Hello Aretas"},
        ]},
    ])
    monkeypatch.setattr(rag_agent, "_HISTORY_FILE", str(hist))

    with (
        patch("backend.services.rag_agent._stream_thinking",
              return_value=_empty_thinking()),
        patch("backend.services.rag_agent.Agent", return_value=_fake_agent()),
    ):
        async for _ in rag_agent.run_rag_stream(
            "What is my name?", session_id="sess-cold"
        ):
            pass

    stored = rag_agent._session_histories.get("sess-cold", [])
    # The prior turn (from disk) is now part of the session's agent context.
    flat = json.dumps(stored)
    assert "My name is Aretas" in flat
    assert "Hello Aretas" in flat


@pytest.mark.asyncio
async def test_stream_emits_memory_event(monkeypatch, _clean_sessions):
    """run_rag_stream reports a working-memory usage event at the end."""
    from backend.services import rag_agent

    events = []
    with (
        patch("backend.services.rag_agent._stream_thinking",
              return_value=_empty_thinking()),
        patch("backend.services.rag_agent.Agent", return_value=_fake_agent()),
    ):
        async for chunk in rag_agent.run_rag_stream("hi", session_id="sess-mem"):
            events.append(chunk)

    mem = [json.loads(e) for e in events if '"memory"' in e]
    assert len(mem) == 1
    data = mem[0]["data"]
    assert set(data) == {"used_chars", "budget_chars", "trimmed"}
    assert data["budget_chars"] == rag_agent._MAX_HISTORY_CHARS
    assert isinstance(data["trimmed"], bool)


@pytest.mark.asyncio
async def test_warm_session_not_overwritten_by_disk(tmp_path, monkeypatch, _clean_sessions):
    from backend.services import rag_agent

    # Disk has one thing; memory already has another → memory wins (no rebuild).
    hist = tmp_path / "chat_history.json"
    _write_history(hist, [
        {"id": "sess-warm", "messages": [
            {"id": "1", "role": "user", "content": "FROM_DISK"},
            {"id": "2", "role": "ai", "content": "disk answer"},
        ]},
    ])
    monkeypatch.setattr(rag_agent, "_HISTORY_FILE", str(hist))
    rag_agent._session_histories["sess-warm"] = [
        {"role": "user", "content": [{"text": "FROM_MEMORY"}]},
        {"role": "assistant", "content": [{"text": "memory answer"}]},
    ]

    with (
        patch("backend.services.rag_agent._stream_thinking",
              return_value=_empty_thinking()),
        patch("backend.services.rag_agent.Agent", return_value=_fake_agent()),
    ):
        async for _ in rag_agent.run_rag_stream(
            "next question", session_id="sess-warm"
        ):
            pass

    flat = json.dumps(rag_agent._session_histories.get("sess-warm", []))
    assert "FROM_MEMORY" in flat
    assert "FROM_DISK" not in flat
