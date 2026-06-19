"""
Tests for the Study Hub Quiz mode (Step 4).

Covers:
- Quiz JSON parsing & validation (drops malformed items, accepts good ones).
- Markdown-fenced and prose-wrapped JSON extraction.
- /api/study/quiz/generate happy path (mocked Ollama).
- /api/study/quiz/generate validation rejects bad inputs.
- /api/study/quiz/submit records the attempt and unlocks badges.
- New quiz achievements (first_quiz, perfect_score, advanced_scholar, quiz_marathon).
"""

from __future__ import annotations

import json
import os
from unittest.mock import patch

import pytest

from backend.services import achievements as ach_service
from backend.services import progress_tracker, quiz_generator


@pytest.fixture(autouse=True)
def _isolate_progress_db(tmp_path, monkeypatch):
    db_path = tmp_path / "progress_test.db"
    monkeypatch.setattr(progress_tracker, "_db_path_override", str(db_path))
    yield
    if os.path.exists(db_path):
        os.remove(db_path)


# ── Parsing ──────────────────────────────────────────────────────────────────


VALID_MCQ = {
    "type": "mcq",
    "question": "What is the capital of France?",
    "options": ["Paris", "London", "Berlin", "Madrid"],
    "correct_index": 0,
    "explanation": "Paris has been the capital since 987 AD.",
}

VALID_TF = {
    "type": "true_false",
    "question": "Python is a compiled language.",
    "options": ["True", "False"],
    "correct_index": 1,
    "explanation": "Python is interpreted.",
}


def test_parse_accepts_well_formed_mcq():
    raw = json.dumps([VALID_MCQ])
    out = quiz_generator._parse_questions(raw, allowed_types=["mcq"])
    assert len(out) == 1
    assert out[0].type == "mcq"
    assert out[0].correct_index == 0


def test_parse_accepts_true_false():
    raw = json.dumps([VALID_TF])
    out = quiz_generator._parse_questions(raw, allowed_types=["true_false"])
    assert len(out) == 1
    assert out[0].type == "true_false"


def test_parse_strips_markdown_fences():
    raw = "```json\n" + json.dumps([VALID_MCQ]) + "\n```"
    out = quiz_generator._parse_questions(raw, allowed_types=["mcq"])
    assert len(out) == 1


def test_parse_handles_prose_wrapped_array():
    raw = "Here is your quiz:\n" + json.dumps([VALID_MCQ]) + "\n\nEnjoy!"
    out = quiz_generator._parse_questions(raw, allowed_types=["mcq"])
    assert len(out) == 1


def test_parse_drops_malformed_items_but_keeps_good_ones():
    bad = {"type": "mcq", "question": "x", "options": ["a", "b"], "correct_index": 0}
    raw = json.dumps([VALID_MCQ, bad, VALID_TF])
    out = quiz_generator._parse_questions(raw, allowed_types=["mcq", "true_false"])
    # MCQ-with-2-options is dropped; the valid MCQ and T/F survive.
    assert len(out) == 2


def test_parse_rejects_correct_index_out_of_range():
    bad = dict(VALID_MCQ, correct_index=5)
    out = quiz_generator._parse_questions(json.dumps([bad]), allowed_types=["mcq"])
    assert out == []


def test_parse_rejects_disallowed_type():
    out = quiz_generator._parse_questions(
        json.dumps([VALID_TF]), allowed_types=["mcq"]
    )
    assert out == []


def test_parse_returns_empty_when_no_array():
    assert quiz_generator._parse_questions("no json here", allowed_types=["mcq"]) == []


def test_parse_accepts_object_wrapped_questions():
    """`format="json"` + Gemma returns {"questions": [...]}, not a bare array."""
    raw = json.dumps({"questions": [VALID_MCQ, VALID_TF]})
    out = quiz_generator._parse_questions(raw, allowed_types=["mcq", "true_false"])
    assert len(out) == 2


def test_parse_object_wrapped_with_fence_and_trailing_comma():
    """Object shape inside a markdown fence with a trailing comma still parses."""
    raw = '```json\n{"questions": [' + json.dumps(VALID_MCQ) + ",]}\n```"
    out = quiz_generator._parse_questions(raw, allowed_types=["mcq"])
    assert len(out) == 1


def test_parse_object_wrapped_alternate_key():
    """Defensive: model uses a different key but still a list of question objects."""
    raw = json.dumps({"quiz": [VALID_MCQ]})
    out = quiz_generator._parse_questions(raw, allowed_types=["mcq"])
    assert len(out) == 1


def test_generate_endpoint_happy_path_object_shape(client):
    """End-to-end: model returns object-wrapped questions → 200 + parsed."""
    payload = {"questions": [VALID_MCQ, VALID_TF]}
    with patch.object(quiz_generator, "ollama") as mock_oll, patch.object(
        quiz_generator.vector_db, "search"
    ) as mock_search:
        mock_search.return_value = [{"source": "g.md", "content": "Paris is the capital."}]
        mock_oll.chat.return_value = {"message": {"content": json.dumps(payload)}}
        resp = client.post(
            "/api/study/quiz/generate",
            json={
                "difficulty": "advanced",
                "num_questions": 5,
                "question_types": ["mcq", "true_false"],
            },
        )
    assert resp.status_code == 200
    assert len(resp.json()["questions"]) == 2


def test_parse_rejects_tf_with_non_truefalse_options():
    bad = dict(VALID_TF, options=["Yes", "No"])
    out = quiz_generator._parse_questions(
        json.dumps([bad]), allowed_types=["true_false"]
    )
    assert out == []


# ── /api/study/quiz/generate endpoint ────────────────────────────────────────


def test_generate_endpoint_happy_path(client):
    """Mock Ollama to return a valid quiz; expect 200 + parsed questions."""
    quiz = [VALID_MCQ, VALID_TF, dict(VALID_MCQ, question="Q3", correct_index=2)]
    with patch.object(quiz_generator, "ollama") as mock_oll, patch.object(
        quiz_generator.vector_db, "search"
    ) as mock_search:
        mock_search.return_value = [
            {"source": "test.txt", "content": "Paris is the capital of France."},
        ]
        mock_oll.chat.return_value = {
            "message": {"content": json.dumps(quiz)},
        }

        resp = client.post(
            "/api/study/quiz/generate",
            json={
                "difficulty": "beginner",
                "num_questions": 5,
                "question_types": ["mcq", "true_false"],
            },
        )

    assert resp.status_code == 200
    body = resp.json()
    assert len(body["questions"]) == 3
    assert body["source_chunks_used"] == 1


def test_generate_saves_quiz_and_roundtrips(client):
    """Generating a quiz auto-saves it; it can be listed, fetched, and deleted."""
    quiz = [VALID_MCQ, VALID_TF]
    with patch.object(quiz_generator, "ollama") as mock_oll, patch.object(
        quiz_generator.vector_db, "search"
    ) as mock_search:
        mock_search.return_value = [{"source": "py.txt", "content": "Paris."}]
        mock_oll.chat.return_value = {"message": {"content": json.dumps({"questions": quiz})}}
        gen = client.post(
            "/api/study/quiz/generate",
            json={
                "difficulty": "beginner",
                "num_questions": 5,
                "question_types": ["mcq", "true_false"],
                "document_filter": ["py.txt"],
            },
        )
    assert gen.status_code == 200
    quiz_id = gen.json()["quiz_id"]
    assert quiz_id > 0

    # Appears in the list with a derived title.
    lst = client.get("/api/study/quiz/list").json()["quizzes"]
    assert any(q["id"] == quiz_id for q in lst)
    saved = next(q for q in lst if q["id"] == quiz_id)
    assert saved["title"] == "Py Quiz"
    assert saved["question_count"] == 2

    # Full fetch returns the questions verbatim.
    full = client.get(f"/api/study/quiz/saved/{quiz_id}").json()
    assert len(full["questions"]) == 2
    assert full["questions"][0]["question"] == VALID_MCQ["question"]
    assert full["scope"] == ["py.txt"]

    # Delete removes it.
    assert client.delete(f"/api/study/quiz/saved/{quiz_id}").status_code == 200
    assert all(q["id"] != quiz_id for q in client.get("/api/study/quiz/list").json()["quizzes"])


def test_quiz_progress_save_resume_clear(client):
    qid = progress_tracker.create_quiz(
        difficulty="beginner", scope=["x.txt"], title="X Quiz",
        questions=[dict(VALID_MCQ), dict(VALID_TF), dict(VALID_MCQ)],
    )
    # Initially not in progress.
    item = next(q for q in client.get("/api/study/quiz/list").json()["quizzes"] if q["id"] == qid)
    assert item["in_progress"] is False and item["answered_count"] == 0

    # Save progress: answered 2 of 3, on question index 2.
    r = client.put(
        f"/api/study/quiz/saved/{qid}/progress",
        json={"current": 2, "correct_count": 1, "answers": [0, 1, None]},
    )
    assert r.status_code == 200

    # List reflects in-progress + answered count.
    item = next(q for q in client.get("/api/study/quiz/list").json()["quizzes"] if q["id"] == qid)
    assert item["in_progress"] is True and item["answered_count"] == 2

    # Full fetch returns the progress for resume.
    full = client.get(f"/api/study/quiz/saved/{qid}").json()
    assert full["progress"]["current"] == 2
    assert full["progress"]["correct_count"] == 1
    assert full["progress"]["answers"] == [0, 1, None]

    # Clear on finish.
    assert client.delete(f"/api/study/quiz/saved/{qid}/progress").status_code == 200
    full = client.get(f"/api/study/quiz/saved/{qid}").json()
    assert full["progress"] is None


def test_quiz_completed_state_is_revisitable(client):
    qid = progress_tracker.create_quiz(
        difficulty="beginner", scope=["x.txt"], title="X Quiz",
        questions=[dict(VALID_MCQ), dict(VALID_TF)],
    )
    # Mark completed with a score.
    r = client.put(
        f"/api/study/quiz/saved/{qid}/progress",
        json={"current": 1, "correct_count": 2, "answers": [0, 1],
              "completed": True, "score_pct": 100},
    )
    assert r.status_code == 200

    item = next(q for q in client.get("/api/study/quiz/list").json()["quizzes"] if q["id"] == qid)
    assert item["completed"] is True
    assert item["last_score"] == 100
    assert item["in_progress"] is False  # completed != in-progress

    full = client.get(f"/api/study/quiz/saved/{qid}").json()
    assert full["progress"]["completed"] is True
    assert full["progress"]["score_pct"] == 100

    # Retake clears it → back to fresh.
    client.delete(f"/api/study/quiz/saved/{qid}/progress")
    item = next(q for q in client.get("/api/study/quiz/list").json()["quizzes"] if q["id"] == qid)
    assert item["completed"] is False and item["in_progress"] is False


def test_quiz_progress_save_404(client):
    r = client.put(
        "/api/study/quiz/saved/9999/progress",
        json={"current": 0, "correct_count": 0, "answers": []},
    )
    assert r.status_code == 404


def test_get_saved_quiz_404(client):
    assert client.get("/api/study/quiz/saved/9999").status_code == 404


def test_delete_saved_quiz_404(client):
    assert client.delete("/api/study/quiz/saved/9999").status_code == 404


def test_quiz_tracker_crud_direct():
    qs = [
        {"type": "mcq", "question": "Q1", "options": ["a", "b", "c", "d"],
         "correct_index": 1, "explanation": "because"},
    ]
    qid = progress_tracker.create_quiz(
        difficulty="advanced", scope=["a.txt", "b.txt"], title="Two Quiz", questions=qs
    )
    got = progress_tracker.get_quiz(qid)
    assert got is not None
    assert got["difficulty"] == "advanced"
    assert got["scope"] == ["a.txt", "b.txt"]
    assert got["questions"][0]["options"] == ["a", "b", "c", "d"]
    assert got["questions"][0]["correct_index"] == 1
    assert progress_tracker.delete_quiz(qid) is True
    assert progress_tracker.get_quiz(qid) is None


def test_generate_endpoint_rejects_invalid_count(client):
    resp = client.post(
        "/api/study/quiz/generate",
        json={
            "difficulty": "beginner",
            "num_questions": 7,  # not in {5, 10, 20}
            "question_types": ["mcq"],
        },
    )
    assert resp.status_code == 422


def test_generate_endpoint_rejects_invalid_difficulty(client):
    resp = client.post(
        "/api/study/quiz/generate",
        json={
            "difficulty": "expert",
            "num_questions": 5,
            "question_types": ["mcq"],
        },
    )
    assert resp.status_code == 422


def test_generate_endpoint_rejects_unknown_question_type(client):
    resp = client.post(
        "/api/study/quiz/generate",
        json={
            "difficulty": "beginner",
            "num_questions": 5,
            "question_types": ["essay"],
        },
    )
    assert resp.status_code == 422


def test_generate_endpoint_502_when_empty_quiz(client):
    """If the model returns garbage and parsing yields zero questions, return 502."""
    with patch.object(quiz_generator, "ollama") as mock_oll, patch.object(
        quiz_generator.vector_db, "search"
    ) as mock_search:
        mock_search.return_value = [{"source": "x.txt", "content": "hello"}]
        mock_oll.chat.return_value = {"message": {"content": "no json at all"}}
        resp = client.post(
            "/api/study/quiz/generate",
            json={
                "difficulty": "beginner",
                "num_questions": 5,
                "question_types": ["mcq"],
            },
        )
    assert resp.status_code == 502


def test_generate_endpoint_422_when_scope_empty(client):
    """No chunks retrieved → can't build a quiz → 422 with helpful message."""
    with patch.object(quiz_generator.vector_db, "search", return_value=[]):
        resp = client.post(
            "/api/study/quiz/generate",
            json={
                "difficulty": "beginner",
                "num_questions": 5,
                "question_types": ["mcq"],
                "document_filter": ["nonexistent.txt"],
            },
        )
    assert resp.status_code == 422


# ── /api/study/quiz/submit endpoint + new achievements ─────────────────────


def test_submit_endpoint_records_attempt_and_unlocks_first_quiz(client):
    resp = client.post(
        "/api/study/quiz/submit",
        json={
            "difficulty": "beginner",
            "num_questions": 5,
            "correct_count": 3,
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["score_pct"] == 60
    assert "first_quiz" in body["newly_earned_achievements"]


def test_submit_endpoint_rejects_correct_count_above_total(client):
    resp = client.post(
        "/api/study/quiz/submit",
        json={
            "difficulty": "beginner",
            "num_questions": 5,
            "correct_count": 10,
        },
    )
    assert resp.status_code == 422


def test_perfect_score_unlocks_on_100_percent():
    progress_tracker.record_quiz_attempt(
        difficulty="beginner", num_questions=5, correct_count=5, score_pct=100
    )
    earned = ach_service.evaluate_and_persist()
    assert "perfect_score" in earned


def test_perfect_score_does_not_unlock_below_100():
    progress_tracker.record_quiz_attempt(
        difficulty="beginner", num_questions=5, correct_count=4, score_pct=80
    )
    earned = ach_service.evaluate_and_persist()
    assert "perfect_score" not in earned


def test_advanced_scholar_requires_advanced_difficulty_and_80pct():
    # Intermediate at 100% does not unlock advanced_scholar.
    progress_tracker.record_quiz_attempt(
        difficulty="intermediate", num_questions=5, correct_count=5, score_pct=100
    )
    assert "advanced_scholar" not in ach_service.evaluate_and_persist()

    # Advanced at 60% does not unlock either.
    progress_tracker.record_quiz_attempt(
        difficulty="advanced", num_questions=5, correct_count=3, score_pct=60
    )
    assert "advanced_scholar" not in ach_service.evaluate_and_persist()

    # Advanced at 80% does.
    progress_tracker.record_quiz_attempt(
        difficulty="advanced", num_questions=5, correct_count=4, score_pct=80
    )
    assert "advanced_scholar" in ach_service.evaluate_and_persist()


def test_quiz_marathon_requires_10_attempts():
    for _ in range(9):
        progress_tracker.record_quiz_attempt(
            difficulty="beginner", num_questions=5, correct_count=3, score_pct=60
        )
    assert "quiz_marathon" not in ach_service.evaluate_and_persist()

    progress_tracker.record_quiz_attempt(
        difficulty="beginner", num_questions=5, correct_count=3, score_pct=60
    )
    assert "quiz_marathon" in ach_service.evaluate_and_persist()


def test_achievements_endpoint_includes_4_new_quiz_badges(client):
    resp = client.get("/api/progress/achievements")
    assert resp.status_code == 200
    codes = {a["code"] for a in resp.json()["achievements"]}
    assert {
        "first_quiz",
        "perfect_score",
        "advanced_scholar",
        "quiz_marathon",
    } <= codes
    # 10 chat-progress + 4 quiz + 4 workshop = 18 (≥18 leaves room for future badges).
    assert len(resp.json()["achievements"]) >= 14
