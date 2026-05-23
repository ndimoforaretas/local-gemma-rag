"""
Tests for Workshop Creator (Mode 2).

Covers:
- Outline parsing & validation
- Persistence CRUD (create / get / list / save lesson / mark complete / delete)
- /api/study/workshop/* endpoints
- 4 new workshop achievements
- Full lifecycle: outline → generate lesson → mark each complete → workshop completes
"""

from __future__ import annotations

import json
import os
from unittest.mock import patch

import pytest

from backend.services import achievements as ach_service
from backend.services import progress_tracker, workshop_generator


@pytest.fixture(autouse=True)
def _isolate_progress_db(tmp_path, monkeypatch):
    db_path = tmp_path / "progress_test.db"
    monkeypatch.setattr(progress_tracker, "_db_path_override", str(db_path))
    yield
    if os.path.exists(db_path):
        os.remove(db_path)


VALID_OUTLINE_JSON = {
    "title": "Intro to Python",
    "summary": "A beginner's tour of Python's core ideas, with hands-on examples.",
    "key_points": ["Syntax", "Data types", "Control flow"],
    "objectives": ["Read Python code", "Write basic scripts", "Use lists/dicts"],
    "lessons": [
        {"title": "Variables and types", "est_minutes": 5},
        {"title": "Control flow", "est_minutes": 7},
        {"title": "Collections", "est_minutes": 10},
        {"title": "Functions", "est_minutes": 8},
        {"title": "Putting it together", "est_minutes": 10},
    ],
}


# ── Outline parsing ──────────────────────────────────────────────────────────


def test_parse_outline_accepts_well_formed():
    raw = json.dumps(VALID_OUTLINE_JSON)
    out = workshop_generator._parse_outline(raw, expected_lessons=5)
    assert out is not None
    assert out.title == "Intro to Python"
    assert len(out.lessons) == 5
    assert out.lessons[0]["est_minutes"] == 5


def test_parse_outline_strips_markdown_fences():
    raw = "```json\n" + json.dumps(VALID_OUTLINE_JSON) + "\n```"
    out = workshop_generator._parse_outline(raw, expected_lessons=5)
    assert out is not None


def test_parse_outline_pads_missing_lessons():
    bad = dict(VALID_OUTLINE_JSON, lessons=VALID_OUTLINE_JSON["lessons"][:3])
    out = workshop_generator._parse_outline(json.dumps(bad), expected_lessons=5)
    assert out is not None
    assert len(out.lessons) == 5
    assert out.lessons[4]["title"] == "Lesson 5"


def test_parse_outline_clamps_est_minutes():
    bad = dict(
        VALID_OUTLINE_JSON,
        lessons=[{"title": "T", "est_minutes": 999}, *VALID_OUTLINE_JSON["lessons"][1:]],
    )
    out = workshop_generator._parse_outline(json.dumps(bad), expected_lessons=5)
    assert out is not None
    assert out.lessons[0]["est_minutes"] == 15  # clamped to upper bound


def test_parse_outline_rejects_missing_required_fields():
    bad = dict(VALID_OUTLINE_JSON, title="")
    assert workshop_generator._parse_outline(json.dumps(bad), expected_lessons=5) is None


def test_parse_outline_rejects_no_json():
    assert workshop_generator._parse_outline("no json here", expected_lessons=5) is None


# ── Persistence CRUD ────────────────────────────────────────────────────────


def test_create_and_get_workshop_roundtrip():
    ws_id = progress_tracker.create_workshop(
        difficulty="beginner",
        scope=["a.txt", "b.txt"],
        title="T",
        summary="S",
        key_points=["k1"],
        objectives=["o1"],
        lessons=[{"title": "L1", "est_minutes": 5}, {"title": "L2", "est_minutes": 7}],
    )
    ws = progress_tracker.get_workshop(ws_id)
    assert ws is not None
    assert ws["title"] == "T"
    assert ws["scope"] == ["a.txt", "b.txt"]
    assert len(ws["lessons"]) == 2
    assert ws["lessons"][1]["est_minutes"] == 7
    assert ws["completed_at"] is None


def test_list_workshops_includes_progress():
    ws_id = progress_tracker.create_workshop(
        difficulty="beginner",
        scope=["a.txt"],
        title="T",
        summary="S",
        key_points=["k"],
        objectives=["o"],
        lessons=[{"title": "L1"}, {"title": "L2"}, {"title": "L3"}],
    )
    progress_tracker.mark_lesson_complete(ws_id, 0)
    items = progress_tracker.list_workshops()
    assert len(items) == 1
    assert items[0]["total_lessons"] == 3
    assert items[0]["completed_lessons"] == 1


def test_mark_lesson_complete_idempotent():
    ws_id = progress_tracker.create_workshop(
        difficulty="beginner", scope=["a.txt"], title="T", summary="S",
        key_points=["k"], objectives=["o"], lessons=[{"title": "L1"}],
    )
    first = progress_tracker.mark_lesson_complete(ws_id, 0)
    second = progress_tracker.mark_lesson_complete(ws_id, 0)
    assert first["workshop_completed"] is True
    assert second["workshop_completed"] is True
    # Workshop completion timestamp should be set.
    ws = progress_tracker.get_workshop(ws_id)
    assert ws["completed_at"] is not None


def test_save_lesson_content_caches():
    ws_id = progress_tracker.create_workshop(
        difficulty="beginner", scope=["a.txt"], title="T", summary="S",
        key_points=["k"], objectives=["o"],
        lessons=[{"title": "L1"}, {"title": "L2"}],
    )
    progress_tracker.save_lesson_content(ws_id, 0, "# Lesson 1\n\nHello.")
    ws = progress_tracker.get_workshop(ws_id)
    assert ws["lessons"][0]["content_md"] == "# Lesson 1\n\nHello."
    assert ws["lessons"][1]["content_md"] is None


def test_delete_workshop_cascades_to_lessons():
    ws_id = progress_tracker.create_workshop(
        difficulty="beginner", scope=["a.txt"], title="T", summary="S",
        key_points=["k"], objectives=["o"], lessons=[{"title": "L1"}],
    )
    assert progress_tracker.delete_workshop(ws_id) is True
    assert progress_tracker.get_workshop(ws_id) is None
    # Deleting non-existent returns False.
    assert progress_tracker.delete_workshop(999) is False


# ── Achievements ────────────────────────────────────────────────────────────


def test_workshop_outline_badge_unlocks_on_first_create():
    progress_tracker.create_workshop(
        difficulty="beginner", scope=["a.txt"], title="T", summary="S",
        key_points=["k"], objectives=["o"], lessons=[{"title": "L1"}],
    )
    earned = ach_service.evaluate_and_persist()
    assert "workshop_outline" in earned


def test_lesson_learned_badge_unlocks_on_first_lesson():
    ws_id = progress_tracker.create_workshop(
        difficulty="beginner", scope=["a.txt"], title="T", summary="S",
        key_points=["k"], objectives=["o"],
        lessons=[{"title": "L1"}, {"title": "L2"}],
    )
    progress_tracker.mark_lesson_complete(ws_id, 0)
    earned = ach_service.evaluate_and_persist()
    assert "lesson_learned" in earned


def test_workshop_graduate_badge_unlocks_on_full_completion():
    ws_id = progress_tracker.create_workshop(
        difficulty="beginner", scope=["a.txt"], title="T", summary="S",
        key_points=["k"], objectives=["o"],
        lessons=[{"title": "L1"}, {"title": "L2"}],
    )
    progress_tracker.mark_lesson_complete(ws_id, 0)
    earned_partial = ach_service.evaluate_and_persist()
    assert "workshop_graduate" not in earned_partial

    progress_tracker.mark_lesson_complete(ws_id, 1)
    earned_full = ach_service.evaluate_and_persist()
    assert "workshop_graduate" in earned_full


def test_workshop_marathon_requires_5_completed():
    for _ in range(5):
        ws_id = progress_tracker.create_workshop(
            difficulty="beginner", scope=["a.txt"], title="T", summary="S",
            key_points=["k"], objectives=["o"], lessons=[{"title": "L1"}],
        )
        progress_tracker.mark_lesson_complete(ws_id, 0)
    earned = ach_service.evaluate_and_persist()
    assert "workshop_marathon" in earned


# ── Endpoints ───────────────────────────────────────────────────────────────


def test_outline_endpoint_happy_path(client):
    with patch.object(workshop_generator, "ollama") as mock_oll, patch.object(
        workshop_generator.vector_db, "search"
    ) as mock_search:
        mock_search.return_value = [
            {"source": "py.txt", "content": "Python is a programming language."},
        ]
        mock_oll.chat.return_value = {
            "message": {"content": json.dumps(VALID_OUTLINE_JSON)},
        }
        resp = client.post(
            "/api/study/workshop/outline",
            json={
                "difficulty": "beginner",
                "num_lessons": 5,
                "document_filter": ["py.txt"],
            },
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["title"] == "Intro to Python"
    assert len(body["lessons"]) == 5
    assert body["lessons"][0]["has_content"] is False


def test_outline_endpoint_rejects_invalid_lesson_count(client):
    resp = client.post(
        "/api/study/workshop/outline",
        json={"difficulty": "beginner", "num_lessons": 7, "document_filter": ["x.txt"]},
    )
    assert resp.status_code == 422


def test_outline_endpoint_rejects_empty_scope(client):
    resp = client.post(
        "/api/study/workshop/outline",
        json={"difficulty": "beginner", "num_lessons": 5, "document_filter": []},
    )
    assert resp.status_code == 422


def test_workshops_list_endpoint(client):
    progress_tracker.create_workshop(
        difficulty="beginner", scope=["a.txt"], title="T", summary="S",
        key_points=["k"], objectives=["o"], lessons=[{"title": "L1"}],
    )
    resp = client.get("/api/study/workshops")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["workshops"]) == 1
    assert body["workshops"][0]["title"] == "T"


def test_get_lesson_returns_cached_when_present(client):
    ws_id = progress_tracker.create_workshop(
        difficulty="beginner", scope=["a.txt"], title="T", summary="S",
        key_points=["k"], objectives=["o"],
        lessons=[{"title": "L1"}, {"title": "L2"}],
    )
    progress_tracker.save_lesson_content(ws_id, 0, "# Cached\n\nbody")
    resp = client.post(f"/api/study/workshop/{ws_id}/lesson/0")
    assert resp.status_code == 200
    assert resp.json()["content_md"] == "# Cached\n\nbody"


def test_get_lesson_generates_when_missing(client):
    ws_id = progress_tracker.create_workshop(
        difficulty="beginner", scope=["a.txt"], title="T", summary="S",
        key_points=["k"], objectives=["o"],
        lessons=[{"title": "Variables", "est_minutes": 5}],
    )
    with patch.object(workshop_generator, "ollama") as mock_oll, patch.object(
        workshop_generator.vector_db, "search"
    ) as mock_search:
        mock_search.return_value = [{"source": "x.txt", "content": "ctx"}]
        mock_oll.chat.return_value = {"message": {"content": "# Variables\n\nHello."}}
        resp = client.post(f"/api/study/workshop/{ws_id}/lesson/0")
    assert resp.status_code == 200
    assert "Variables" in resp.json()["content_md"]
    # Should now be cached.
    ws = progress_tracker.get_workshop(ws_id)
    assert ws["lessons"][0]["content_md"] is not None


def test_complete_lesson_endpoint_unlocks_badges(client):
    ws_id = progress_tracker.create_workshop(
        difficulty="beginner", scope=["a.txt"], title="T", summary="S",
        key_points=["k"], objectives=["o"], lessons=[{"title": "L1"}],
    )
    resp = client.post(f"/api/study/workshop/{ws_id}/lesson/0/complete")
    assert resp.status_code == 200
    body = resp.json()
    assert body["workshop_completed"] is True
    earned = set(body["newly_earned_achievements"])
    assert "lesson_learned" in earned
    assert "workshop_graduate" in earned


def test_delete_endpoint(client):
    ws_id = progress_tracker.create_workshop(
        difficulty="beginner", scope=["a.txt"], title="T", summary="S",
        key_points=["k"], objectives=["o"], lessons=[{"title": "L1"}],
    )
    resp = client.delete(f"/api/study/workshop/{ws_id}")
    assert resp.status_code == 200
    assert progress_tracker.get_workshop(ws_id) is None


def test_achievements_endpoint_lists_4_new_workshop_badges(client):
    body = client.get("/api/progress/achievements").json()
    codes = {a["code"] for a in body["achievements"]}
    assert {
        "workshop_outline",
        "lesson_learned",
        "workshop_graduate",
        "workshop_marathon",
    } <= codes
