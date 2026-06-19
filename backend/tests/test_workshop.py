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

# A realistic lesson body — comfortably over the substantive-content floor.
SUBSTANTIVE_LESSON = (
    "# Variables\n\n"
    "## Introduction\n\n"
    "Variables are named containers for values your program works with. "
    "Choosing clear names makes code easier to read and reason about.\n\n"
    "## Core content\n\n"
    "In Python you create a variable simply by assigning to it: `x = 5`. "
    "The type is inferred from the value, and you can reassign freely. "
    "Common types include integers, floats, strings, and booleans.\n\n"
    "## Key takeaways\n\n"
    "- Variables bind names to values.\n- Names should describe intent.\n\n"
    "## Self-check\n\nWhat type does `x = 3.0` produce?"
)


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
    # Any count in 3–15 is allowed (schema-enforced); outside the bounds → 422.
    for bad in (2, 16):
        resp = client.post(
            "/api/study/workshop/outline",
            json={"difficulty": "beginner", "num_lessons": bad, "document_filter": ["x.txt"]},
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
    progress_tracker.save_lesson_content(ws_id, 0, SUBSTANTIVE_LESSON)
    resp = client.post(f"/api/study/workshop/{ws_id}/lesson/0")
    assert resp.status_code == 200
    assert resp.json()["content_md"] == SUBSTANTIVE_LESSON


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
        mock_oll.chat.return_value = {"message": {"content": SUBSTANTIVE_LESSON}}
        resp = client.post(f"/api/study/workshop/{ws_id}/lesson/0")
    assert resp.status_code == 200
    assert "Variables" in resp.json()["content_md"]
    # Should now be cached.
    ws = progress_tracker.get_workshop(ws_id)
    assert ws["lessons"][0]["content_md"] is not None


# ── Lesson content validation / self-heal (concurrency-corruption guard) ──────


def test_is_substantive_lesson_rejects_garbage():
    # The two real-world corruption shapes seen from concurrent local-Ollama runs.
    assert workshop_generator.is_substantive_lesson("#") is False
    assert workshop_generator.is_substantive_lesson(
        "# Designing Simple Objects and Interfaces\n\n## Introduction\nAs"
    ) is False
    assert workshop_generator.is_substantive_lesson("") is False
    assert workshop_generator.is_substantive_lesson(None) is False
    # Heading-only (no prose body) is rejected even when the title is long.
    assert workshop_generator.is_substantive_lesson(
        "# A Reasonably Long Lesson Title That Still Has No Body Whatsoever Here"
    ) is False
    # A real lesson passes.
    assert workshop_generator.is_substantive_lesson(SUBSTANTIVE_LESSON) is True


def test_clean_lesson_keeps_body_when_outro_is_near_start():
    # A degenerate response whose body IS an outro must NOT be gutted to a stub;
    # the greedy strip only applies once substantial content precedes the outro.
    degenerate = "# Topic\n\nIf you have any questions, let me know!"
    cleaned = workshop_generator._clean_lesson_content(degenerate)
    assert "If you have" in cleaned  # not stripped to "# Topic"
    # And a real lesson with a trailing outro DOES get the outro removed.
    trimmed = workshop_generator._clean_lesson_content(
        SUBSTANTIVE_LESSON + "\n\nIf you have any questions, feel free to ask!"
    )
    assert "feel free to ask" not in trimmed.lower()
    assert "Self-check" in trimmed


def test_generate_lesson_raises_on_truncated_output():
    with patch.object(workshop_generator, "ollama") as mock_oll, patch.object(
        workshop_generator.vector_db, "search"
    ) as mock_search:
        mock_search.return_value = [{"source": "x.txt", "content": "ctx"}]
        mock_oll.chat.return_value = {"message": {"content": "#"}}
        with pytest.raises(ValueError):
            workshop_generator.generate_lesson(
                workshop_title="T", workshop_summary="S",
                key_points=["k"], objectives=["o"],
                all_lesson_titles=["L1"], lesson_idx=0,
                difficulty="beginner", source_filter=["a.txt"],
            )


def test_generate_lesson_retries_then_succeeds():
    # First attempt degenerates to "#", second returns a real lesson → recovers.
    with patch.object(workshop_generator, "ollama") as mock_oll, patch.object(
        workshop_generator.vector_db, "search"
    ) as mock_search:
        mock_search.return_value = [{"source": "x.txt", "content": "ctx"}]
        mock_oll.chat.side_effect = [
            {"message": {"content": "#"}},
            {"message": {"content": SUBSTANTIVE_LESSON}},
        ]
        out = workshop_generator.generate_lesson(
            workshop_title="T", workshop_summary="S",
            key_points=["k"], objectives=["o"],
            all_lesson_titles=["Variables"], lesson_idx=0,
            difficulty="beginner", source_filter=["a.txt"],
        )
    assert "Variables" in out
    assert mock_oll.chat.call_count == 2


def test_get_lesson_does_not_cache_garbage(client):
    ws_id = progress_tracker.create_workshop(
        difficulty="beginner", scope=["a.txt"], title="T", summary="S",
        key_points=["k"], objectives=["o"], lessons=[{"title": "L1"}],
    )
    with patch.object(workshop_generator, "ollama") as mock_oll, patch.object(
        workshop_generator.vector_db, "search"
    ) as mock_search:
        mock_search.return_value = [{"source": "x.txt", "content": "ctx"}]
        mock_oll.chat.return_value = {"message": {"content": "#"}}
        resp = client.post(f"/api/study/workshop/{ws_id}/lesson/0")
    assert resp.status_code == 422
    # Nothing persisted → can be retried.
    ws = progress_tracker.get_workshop(ws_id)
    assert ws["lessons"][0]["content_md"] is None


def test_corrupt_cached_lesson_self_heals(client):
    """Garbage already in the DB is treated as not-generated and regenerated."""
    ws_id = progress_tracker.create_workshop(
        difficulty="beginner", scope=["a.txt"], title="T", summary="S",
        key_points=["k"], objectives=["o"], lessons=[{"title": "L1"}],
    )
    progress_tracker.save_lesson_content(ws_id, 0, "#")  # simulate prior corruption
    # has_content reflects substantive content, not mere presence.
    assert client.get(f"/api/study/workshop/{ws_id}").json()["lessons"][0]["has_content"] is False
    # Fetching regenerates instead of serving the garbage.
    with patch.object(workshop_generator, "ollama") as mock_oll, patch.object(
        workshop_generator.vector_db, "search"
    ) as mock_search:
        mock_search.return_value = [{"source": "x.txt", "content": "ctx"}]
        mock_oll.chat.return_value = {"message": {"content": SUBSTANTIVE_LESSON}}
        resp = client.post(f"/api/study/workshop/{ws_id}/lesson/0")
    assert resp.status_code == 200
    assert "Variables" in resp.json()["content_md"]


def test_force_regenerates_and_keeps_completion(client):
    ws_id = progress_tracker.create_workshop(
        difficulty="beginner", scope=["a.txt"], title="T", summary="S",
        key_points=["k"], objectives=["o"], lessons=[{"title": "Variables"}],
    )
    progress_tracker.save_lesson_content(ws_id, 0, SUBSTANTIVE_LESSON)
    client.post(f"/api/study/workshop/{ws_id}/lesson/0/complete")

    fresh = SUBSTANTIVE_LESSON.replace("named containers", "labelled boxes")
    with patch.object(workshop_generator, "ollama") as mock_oll, patch.object(
        workshop_generator.vector_db, "search"
    ) as mock_search:
        mock_search.return_value = [{"source": "x.txt", "content": "ctx"}]
        mock_oll.chat.return_value = {"message": {"content": fresh}}
        resp = client.post(f"/api/study/workshop/{ws_id}/lesson/0?force=true")
    assert resp.status_code == 200
    assert "labelled boxes" in resp.json()["content_md"]
    # Completion survives the re-roll.
    assert resp.json()["completed_at"] is not None
    # New content persisted.
    assert "labelled boxes" in progress_tracker.get_workshop(ws_id)["lessons"][0]["content_md"]


def test_force_failure_preserves_old_content(client):
    ws_id = progress_tracker.create_workshop(
        difficulty="beginner", scope=["a.txt"], title="T", summary="S",
        key_points=["k"], objectives=["o"], lessons=[{"title": "Variables"}],
    )
    progress_tracker.save_lesson_content(ws_id, 0, SUBSTANTIVE_LESSON)
    with patch.object(workshop_generator, "ollama") as mock_oll, patch.object(
        workshop_generator.vector_db, "search"
    ) as mock_search:
        mock_search.return_value = [{"source": "x.txt", "content": "ctx"}]
        mock_oll.chat.return_value = {"message": {"content": "#"}}  # both attempts degenerate
        resp = client.post(f"/api/study/workshop/{ws_id}/lesson/0?force=true")
    assert resp.status_code == 422
    # The old lesson is untouched.
    assert progress_tracker.get_workshop(ws_id)["lessons"][0]["content_md"] == SUBSTANTIVE_LESSON


# ── Outline re-roll ───────────────────────────────────────────────────────────


def test_reroll_replaces_outline_and_resets_lessons(client):
    ws_id = progress_tracker.create_workshop(
        difficulty="beginner", scope=["a.txt"], title="Old Title", summary="Old S",
        key_points=["old"], objectives=["old"],
        lessons=[{"title": "Old L1"}, {"title": "Old L2"}],
    )
    progress_tracker.save_lesson_content(ws_id, 0, SUBSTANTIVE_LESSON)
    client.post(f"/api/study/workshop/{ws_id}/lesson/0/complete")

    fresh = dict(VALID_OUTLINE_JSON, title="New Title", lessons=VALID_OUTLINE_JSON["lessons"][:2])
    with patch.object(workshop_generator, "ollama") as mock_oll, patch.object(
        workshop_generator.vector_db, "search"
    ) as mock_search:
        mock_search.return_value = [{"source": "x.txt", "content": "ctx"}]
        mock_oll.chat.return_value = {"message": {"content": json.dumps(fresh)}}
        resp = client.post(f"/api/study/workshop/{ws_id}/reroll")
    assert resp.status_code == 200
    body = resp.json()
    assert body["title"] == "New Title"
    assert len(body["lessons"]) == 2
    # All lessons are fresh stubs: no content, no completion; workshop reset.
    assert all(not l["has_content"] and l["completed_at"] is None for l in body["lessons"])
    assert body["completed_at"] is None
    # Difficulty + scope survived.
    assert body["difficulty"] == "beginner"
    assert body["scope"] == ["a.txt"]


def test_reroll_failure_leaves_workshop_untouched(client):
    ws_id = progress_tracker.create_workshop(
        difficulty="beginner", scope=["a.txt"], title="Keep Me", summary="S",
        key_points=["k"], objectives=["o"], lessons=[{"title": "L1"}],
    )
    progress_tracker.save_lesson_content(ws_id, 0, SUBSTANTIVE_LESSON)
    with patch.object(workshop_generator, "ollama") as mock_oll, patch.object(
        workshop_generator.vector_db, "search"
    ) as mock_search:
        mock_search.return_value = [{"source": "x.txt", "content": "ctx"}]
        mock_oll.chat.return_value = {"message": {"content": "not json at all"}}
        resp = client.post(f"/api/study/workshop/{ws_id}/reroll")
    assert resp.status_code == 422
    ws = progress_tracker.get_workshop(ws_id)
    assert ws["title"] == "Keep Me"
    assert ws["lessons"][0]["content_md"] == SUBSTANTIVE_LESSON


def test_reroll_404(client):
    assert client.post("/api/study/workshop/999/reroll").status_code == 404


# ── Outline editing (rename / reorder / delete) ───────────────────────────────


def _editable_workshop() -> int:
    ws_id = progress_tracker.create_workshop(
        difficulty="beginner", scope=["a.txt"], title="T", summary="S",
        key_points=["k"], objectives=["o"],
        lessons=[
            {"title": "Alpha", "est_minutes": 5},
            {"title": "Beta", "est_minutes": 7},
            {"title": "Gamma", "est_minutes": 9},
        ],
    )
    progress_tracker.save_lesson_content(ws_id, 1, SUBSTANTIVE_LESSON)  # Beta has content
    return ws_id


def test_edit_lessons_rename_keeps_content(client):
    ws_id = _editable_workshop()
    body = client.patch(
        f"/api/study/workshop/{ws_id}/lessons",
        json={"lessons": [
            {"old_idx": 0, "title": "Alpha"},
            {"old_idx": 1, "title": "Beta (renamed)"},
            {"old_idx": 2, "title": "Gamma"},
        ]},
    ).json()
    assert [l["title"] for l in body["lessons"]] == ["Alpha", "Beta (renamed)", "Gamma"]
    # Beta's generated content travelled with the rename.
    assert body["lessons"][1]["has_content"] is True
    ws = progress_tracker.get_workshop(ws_id)
    assert ws["lessons"][1]["content_md"] == SUBSTANTIVE_LESSON


def test_edit_lessons_reorder_moves_content_and_completion(client):
    ws_id = _editable_workshop()
    client.post(f"/api/study/workshop/{ws_id}/lesson/1/complete")  # Beta done
    # Move Beta (old_idx 1) to the front.
    body = client.patch(
        f"/api/study/workshop/{ws_id}/lessons",
        json={"lessons": [
            {"old_idx": 1, "title": "Beta"},
            {"old_idx": 0, "title": "Alpha"},
            {"old_idx": 2, "title": "Gamma"},
        ]},
    ).json()
    assert [l["title"] for l in body["lessons"]] == ["Beta", "Alpha", "Gamma"]
    assert body["lessons"][0]["has_content"] is True
    assert body["lessons"][0]["completed_at"] is not None
    assert body["lessons"][1]["has_content"] is False
    ws = progress_tracker.get_workshop(ws_id)
    assert ws["lessons"][0]["content_md"] == SUBSTANTIVE_LESSON
    assert ws["lessons"][1]["content_md"] is None


def test_edit_lessons_delete_can_complete_workshop(client):
    ws_id = _editable_workshop()
    client.post(f"/api/study/workshop/{ws_id}/lesson/1/complete")  # only Beta done
    assert client.get(f"/api/study/workshop/{ws_id}").json()["completed_at"] is None
    # Drop the two incomplete lessons → workshop becomes fully complete.
    body = client.patch(
        f"/api/study/workshop/{ws_id}/lessons",
        json={"lessons": [{"old_idx": 1, "title": "Beta"}]},
    ).json()
    assert len(body["lessons"]) == 1
    assert body["completed_at"] is not None


def test_edit_lessons_validation(client):
    ws_id = _editable_workshop()
    url = f"/api/study/workshop/{ws_id}/lessons"
    # Unknown old_idx.
    assert client.patch(url, json={"lessons": [{"old_idx": 9, "title": "X"}]}).status_code == 422
    # Duplicate old_idx.
    assert client.patch(url, json={"lessons": [
        {"old_idx": 0, "title": "A"}, {"old_idx": 0, "title": "B"},
    ]}).status_code == 422
    # Empty list (pydantic min_length).
    assert client.patch(url, json={"lessons": []}).status_code == 422
    # Blank title (pydantic min_length on the field).
    assert client.patch(url, json={"lessons": [{"old_idx": 0, "title": ""}]}).status_code == 422
    # Unknown workshop.
    assert client.patch(
        "/api/study/workshop/999/lessons",
        json={"lessons": [{"old_idx": 0, "title": "X"}]},
    ).status_code in (404, 422)
    # Nothing was mutated by the failed edits.
    ws = progress_tracker.get_workshop(ws_id)
    assert [l["title"] for l in ws["lessons"]] == ["Alpha", "Beta", "Gamma"]


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
