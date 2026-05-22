"""
Tests for the Learning Progress Tracker (Step 3).

Covers:
- Study-session open vs. extend logic with the configurable idle gap.
- Daily breakdown aggregation and zero-fill for inactive days.
- Achievement criteria for each of the 10 seeded badges.
- Read API endpoints return the expected shape.
"""

from __future__ import annotations

import datetime as _dt
import os

import pytest

from backend.services import achievements as ach_service
from backend.services import progress_tracker


@pytest.fixture(autouse=True)
def _isolate_progress_db(tmp_path, monkeypatch):
    """Each test gets its own fresh SQLite DB."""
    db_path = tmp_path / "progress_test.db"
    monkeypatch.setattr(progress_tracker, "_db_path_override", str(db_path))
    yield
    if os.path.exists(db_path):
        os.remove(db_path)


# ── Session logic ────────────────────────────────────────────────────────────


def test_first_message_opens_new_session():
    res = progress_tracker.record_message(sent_at=1_700_000_000.0)
    assert res["newly_opened"] is True
    assert res["message_count"] == 1
    assert res["started_at"] == res["ended_at"]


def test_messages_within_gap_extend_session(monkeypatch):
    """Two messages 10 min apart (< 15 min gap) belong to the same session."""
    monkeypatch.setattr(
        progress_tracker._settings, "study_session_idle_gap_seconds", 15 * 60
    )
    t0 = 1_700_000_000.0
    progress_tracker.record_message(sent_at=t0)
    res = progress_tracker.record_message(sent_at=t0 + 600)  # +10 min

    assert res["newly_opened"] is False
    assert res["message_count"] == 2
    assert res["ended_at"] == t0 + 600

    summary = progress_tracker.get_summary()
    assert summary["total_sessions"] == 1
    assert summary["total_messages"] == 2
    assert summary["total_seconds"] == 600


def test_idle_gap_starts_new_session(monkeypatch):
    monkeypatch.setattr(
        progress_tracker._settings, "study_session_idle_gap_seconds", 15 * 60
    )
    t0 = 1_700_000_000.0
    progress_tracker.record_message(sent_at=t0)
    res = progress_tracker.record_message(sent_at=t0 + 16 * 60)  # >15 min

    assert res["newly_opened"] is True
    assert progress_tracker.get_summary()["total_sessions"] == 2


# ── Daily breakdown ──────────────────────────────────────────────────────────


def test_daily_breakdown_zero_fills_inactive_days():
    days = progress_tracker.get_daily(days=7)
    assert len(days) == 7
    today = _dt.date.today().isoformat()
    assert days[-1]["date"] == today
    assert all(d["seconds"] == 0 for d in days)


def test_daily_breakdown_includes_today_activity():
    progress_tracker.record_message()
    days = progress_tracker.get_daily(days=7)
    today = _dt.date.today().isoformat()
    today_row = next(d for d in days if d["date"] == today)
    assert today_row["message_count"] == 1
    assert today_row["session_count"] == 1


# ── Achievement criteria ─────────────────────────────────────────────────────


def test_first_question_unlocks_on_first_message():
    progress_tracker.record_message()
    earned = ach_service.evaluate_and_persist()
    assert "first_question" in earned


def test_achievement_not_unlocked_twice():
    progress_tracker.record_message()
    first = ach_service.evaluate_and_persist()
    second = ach_service.evaluate_and_persist()
    assert "first_question" in first
    assert "first_question" not in second  # already earned


def test_conversationalist_requires_10_today():
    for _ in range(9):
        progress_tracker.record_message()
    earned_after_9 = ach_service.evaluate_and_persist()
    assert "conversationalist" not in earned_after_9

    progress_tracker.record_message()
    earned_after_10 = ach_service.evaluate_and_persist()
    assert "conversationalist" in earned_after_10


def test_curious_mind_requires_scope_filter():
    progress_tracker.record_message(had_scope_filter=False)
    assert "curious_mind" not in ach_service.evaluate_and_persist()

    progress_tracker.record_message(had_scope_filter=True)
    assert "curious_mind" in ach_service.evaluate_and_persist()


def test_hour_of_power_requires_3600_seconds(monkeypatch):
    """One long session of 1 hour should unlock Hour of Power."""
    monkeypatch.setattr(
        progress_tracker._settings, "study_session_idle_gap_seconds", 24 * 3600
    )
    t0 = 1_700_000_000.0
    progress_tracker.record_message(sent_at=t0)
    progress_tracker.record_message(sent_at=t0 + 3600)  # 1h later, same session
    assert "hour_of_power" in ach_service.evaluate_and_persist()


def test_deep_diver_requires_30_min_single_session(monkeypatch):
    monkeypatch.setattr(
        progress_tracker._settings, "study_session_idle_gap_seconds", 24 * 3600
    )
    t0 = 1_700_000_000.0
    progress_tracker.record_message(sent_at=t0)
    progress_tracker.record_message(sent_at=t0 + 29 * 60)
    assert "deep_diver" not in ach_service.evaluate_and_persist()

    progress_tracker.record_message(sent_at=t0 + 30 * 60)
    assert "deep_diver" in ach_service.evaluate_and_persist()


def test_centurion_requires_100_messages():
    for _ in range(100):
        progress_tracker.record_message()
    assert "centurion" in ach_service.evaluate_and_persist()


def test_night_owl_unlocks_on_late_hour(monkeypatch):
    """The check_fn reads local_hour from stats — force it to 23 directly."""
    progress_tracker.record_message()
    # Force the eval to think it's 11pm.
    monkeypatch.setattr(
        progress_tracker, "stats_for_eval",
        lambda now_ts=None: {
            "total_seconds": 0, "total_messages": 1, "longest_session_seconds": 0,
            "messages_today": 1, "scope_filter_uses": 0, "current_streak_days": 1,
            "local_hour": 23,
        },
    )
    earned = ach_service.evaluate_and_persist()
    assert "night_owl" in earned


def test_early_bird_unlocks_at_6am(monkeypatch):
    progress_tracker.record_message()
    monkeypatch.setattr(
        progress_tracker, "stats_for_eval",
        lambda now_ts=None: {
            "total_seconds": 0, "total_messages": 1, "longest_session_seconds": 0,
            "messages_today": 1, "scope_filter_uses": 0, "current_streak_days": 1,
            "local_hour": 6,
        },
    )
    assert "early_bird" in ach_service.evaluate_and_persist()


def test_streak_3_requires_3_consecutive_days(monkeypatch):
    today = _dt.date.today()
    for i in (2, 1, 0):
        ts = _dt.datetime.combine(today - _dt.timedelta(days=i), _dt.time(12, 0)).timestamp()
        progress_tracker.record_message(sent_at=ts)

    earned = ach_service.evaluate_and_persist()
    assert "streak_3" in earned
    assert "streak_7" not in earned


# ── API endpoints ────────────────────────────────────────────────────────────


def test_summary_endpoint_returns_zeros_initially(client):
    res = client.get("/api/progress/summary")
    assert res.status_code == 200
    body = res.json()
    assert body == {
        "total_seconds": 0,
        "total_sessions": 0,
        "total_messages": 0,
        "current_streak_days": 0,
    }


def test_daily_endpoint_returns_requested_window(client):
    res = client.get("/api/progress/daily?days=7")
    assert res.status_code == 200
    body = res.json()
    assert "days" in body
    assert len(body["days"]) == 7


def test_daily_endpoint_validates_range(client):
    assert client.get("/api/progress/daily?days=0").status_code == 422
    assert client.get("/api/progress/daily?days=400").status_code == 422


def test_achievements_endpoint_lists_all_10_badges(client):
    res = client.get("/api/progress/achievements")
    assert res.status_code == 200
    body = res.json()
    assert len(body["achievements"]) == 10
    # All locked initially.
    assert all(a["earned_at"] is None for a in body["achievements"])
    assert all(a["is_earned"] is False for a in body["achievements"])
    # Each has the expected fields.
    sample = body["achievements"][0]
    assert {"code", "name", "description", "icon", "earned_at", "is_earned"} <= set(sample)


def test_achievements_endpoint_reflects_earned_state(client):
    progress_tracker.record_message()
    ach_service.evaluate_and_persist()
    res = client.get("/api/progress/achievements")
    body = res.json()
    earned = [a for a in body["achievements"] if a["is_earned"]]
    earned_codes = {a["code"] for a in earned}
    assert "first_question" in earned_codes
