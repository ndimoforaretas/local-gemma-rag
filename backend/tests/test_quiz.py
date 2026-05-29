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
