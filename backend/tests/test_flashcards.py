"""
Tests for Flashcards (Mode 3).

Covers:
- Deck JSON parsing + validation
- Persistence CRUD (create / get / list / status / flip / delete)
- /api/study/flashcards/* endpoints
- 4 new flashcard achievements
- Study-time tracking on flip
"""

from __future__ import annotations

import json
import os
from unittest.mock import patch

import pytest

from backend.services import achievements as ach_service
from backend.services import flashcard_generator, progress_tracker


@pytest.fixture(autouse=True)
def _isolate_progress_db(tmp_path, monkeypatch):
    db_path = tmp_path / "progress_test.db"
    monkeypatch.setattr(progress_tracker, "_db_path_override", str(db_path))
    yield
    if os.path.exists(db_path):
        os.remove(db_path)


VALID_DECK_JSON = {
    "cards": [
        {"front": "What does PEP stand for?", "back": "Python Enhancement Proposal."},
        {"front": "List a benefit of duck typing.", "back": "Flexible polymorphism without rigid type hierarchies."},
        {"front": "Mutable default argument pitfall?", "back": "The same list is shared across all calls."},
    ],
}


# ── Parsing ──────────────────────────────────────────────────────────────────


def test_parse_deck_accepts_well_formed():
    out = flashcard_generator._parse_deck(json.dumps(VALID_DECK_JSON), expected=3)
    assert len(out) == 3
    assert out[0].front.startswith("What does")


def test_parse_deck_strips_fences():
    raw = "```json\n" + json.dumps(VALID_DECK_JSON) + "\n```"
    out = flashcard_generator._parse_deck(raw, expected=3)
    assert len(out) == 3


def test_parse_deck_skips_malformed_items():
    bad = {"cards": [{"front": "F1", "back": "B1"}, {"front": "", "back": "B2"}, {"front": "F3", "back": "B3"}]}
    out = flashcard_generator._parse_deck(json.dumps(bad), expected=3)
    # The empty-front entry is dropped; 2 valid ones remain.
    assert len(out) == 2


def test_parse_deck_handles_trailing_comma():
    # Trailing comma in array; the repair pass should recover.
    raw = '{"cards":[{"front":"a","back":"b"},]}'
    out = flashcard_generator._parse_deck(raw, expected=1)
    assert len(out) == 1


def test_parse_deck_returns_empty_when_no_json():
    assert flashcard_generator._parse_deck("nothing here", expected=5) == []


# ── Persistence CRUD ────────────────────────────────────────────────────────


def test_create_and_get_deck_roundtrip():
    deck_id = progress_tracker.create_flashcard_deck(
        difficulty="beginner",
        scope=["py.txt"],
        title="T",
        cards=[{"front": "F1", "back": "B1"}, {"front": "F2", "back": "B2"}],
    )
    deck = progress_tracker.get_flashcard_deck(deck_id)
    assert deck is not None
    assert deck["card_count"] == 2
    assert len(deck["cards"]) == 2
    assert deck["cards"][0]["status"] is None
    assert deck["cards"][0]["flip_count"] == 0


def test_list_decks_shows_mastered_count():
    deck_id = progress_tracker.create_flashcard_deck(
        difficulty="beginner", scope=["x.txt"], title="T",
        cards=[{"front": "F1", "back": "B1"}, {"front": "F2", "back": "B2"}],
    )
    progress_tracker.set_flashcard_status(deck_id, 0, "mastered")
    items = progress_tracker.list_flashcard_decks()
    assert len(items) == 1
    assert items[0]["mastered_count"] == 1
    assert items[0]["card_count"] == 2


def test_set_status_rejects_invalid():
    deck_id = progress_tracker.create_flashcard_deck(
        difficulty="beginner", scope=["x.txt"], title="T",
        cards=[{"front": "F", "back": "B"}],
    )
    with pytest.raises(ValueError):
        progress_tracker.set_flashcard_status(deck_id, 0, "bogus")


def test_increment_flip_count():
    deck_id = progress_tracker.create_flashcard_deck(
        difficulty="beginner", scope=["x.txt"], title="T",
        cards=[{"front": "F", "back": "B"}],
    )
    progress_tracker.increment_flashcard_flip(deck_id, 0)
    progress_tracker.increment_flashcard_flip(deck_id, 0)
    deck = progress_tracker.get_flashcard_deck(deck_id)
    assert deck["cards"][0]["flip_count"] == 2


def test_delete_cascades_to_cards():
    deck_id = progress_tracker.create_flashcard_deck(
        difficulty="beginner", scope=["x.txt"], title="T",
        cards=[{"front": "F", "back": "B"}],
    )
    assert progress_tracker.delete_flashcard_deck(deck_id) is True
    assert progress_tracker.get_flashcard_deck(deck_id) is None


# ── Achievements ────────────────────────────────────────────────────────────


def test_first_deck_badge_unlocks():
    progress_tracker.create_flashcard_deck(
        difficulty="beginner", scope=["x.txt"], title="T",
        cards=[{"front": "F", "back": "B"}],
    )
    earned = ach_service.evaluate_and_persist()
    assert "first_deck" in earned


def test_card_reviewer_badge_needs_50_flips():
    deck_id = progress_tracker.create_flashcard_deck(
        difficulty="beginner", scope=["x.txt"], title="T",
        cards=[{"front": "F", "back": "B"}],
    )
    for _ in range(49):
        progress_tracker.increment_flashcard_flip(deck_id, 0)
    assert "card_reviewer" not in ach_service.evaluate_and_persist()
    progress_tracker.increment_flashcard_flip(deck_id, 0)
    assert "card_reviewer" in ach_service.evaluate_and_persist()


def test_deck_master_badge_requires_all_mastered():
    deck_id = progress_tracker.create_flashcard_deck(
        difficulty="beginner", scope=["x.txt"], title="T",
        cards=[{"front": "F1", "back": "B1"}, {"front": "F2", "back": "B2"}],
    )
    progress_tracker.set_flashcard_status(deck_id, 0, "mastered")
    assert "deck_master" not in ach_service.evaluate_and_persist()
    progress_tracker.set_flashcard_status(deck_id, 1, "mastered")
    assert "deck_master" in ach_service.evaluate_and_persist()


def test_deck_collector_requires_5_decks():
    for _ in range(5):
        progress_tracker.create_flashcard_deck(
            difficulty="beginner", scope=["x.txt"], title="T",
            cards=[{"front": "F", "back": "B"}],
        )
    earned = ach_service.evaluate_and_persist()
    assert "deck_collector" in earned


# ── Endpoints ───────────────────────────────────────────────────────────────


def test_deck_create_endpoint_happy_path(client):
    with patch.object(flashcard_generator, "ollama") as mock_oll, patch.object(
        flashcard_generator.vector_db, "search"
    ) as mock_search:
        mock_search.return_value = [{"source": "py.txt", "content": "Python material."}]
        mock_oll.chat.return_value = {"message": {"content": json.dumps(VALID_DECK_JSON)}}
        resp = client.post(
            "/api/study/flashcards/deck",
            json={"difficulty": "beginner", "num_cards": 10, "document_filter": ["py.txt"]},
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["card_count"] == 3
    assert len(body["cards"]) == 3


def test_deck_create_endpoint_rejects_invalid_count(client):
    resp = client.post(
        "/api/study/flashcards/deck",
        json={"difficulty": "beginner", "num_cards": 7, "document_filter": ["x.txt"]},
    )
    assert resp.status_code == 422


def test_deck_create_endpoint_rejects_empty_scope(client):
    resp = client.post(
        "/api/study/flashcards/deck",
        json={"difficulty": "beginner", "num_cards": 10, "document_filter": []},
    )
    assert resp.status_code == 422


def test_decks_list_endpoint(client):
    progress_tracker.create_flashcard_deck(
        difficulty="beginner", scope=["x.txt"], title="T",
        cards=[{"front": "F", "back": "B"}],
    )
    body = client.get("/api/study/flashcards/decks").json()
    assert len(body["decks"]) == 1
    assert body["decks"][0]["title"] == "T"


def test_status_endpoint_records_flip_and_unlocks_badges(client):
    deck_id = progress_tracker.create_flashcard_deck(
        difficulty="beginner", scope=["x.txt"], title="T",
        cards=[{"front": "F", "back": "B"}],
    )
    resp = client.post(
        f"/api/study/flashcards/deck/{deck_id}/card/0/status",
        json={"status": "mastered", "record_flip": True},
    )
    assert resp.status_code == 200
    earned = set(resp.json()["newly_earned_achievements"])
    assert "deck_master" in earned
    # Verify flip recorded.
    deck = progress_tracker.get_flashcard_deck(deck_id)
    assert deck["cards"][0]["flip_count"] == 1


def test_status_endpoint_rejects_bad_status(client):
    deck_id = progress_tracker.create_flashcard_deck(
        difficulty="beginner", scope=["x.txt"], title="T",
        cards=[{"front": "F", "back": "B"}],
    )
    # Bad value is rejected by Pydantic pattern, before reaching tracker.
    resp = client.post(
        f"/api/study/flashcards/deck/{deck_id}/card/0/status",
        json={"status": "bogus", "record_flip": False},
    )
    assert resp.status_code == 422


def test_delete_endpoint(client):
    deck_id = progress_tracker.create_flashcard_deck(
        difficulty="beginner", scope=["x.txt"], title="T",
        cards=[{"front": "F", "back": "B"}],
    )
    assert client.delete(f"/api/study/flashcards/deck/{deck_id}").status_code == 200
    assert progress_tracker.get_flashcard_deck(deck_id) is None


def test_achievements_endpoint_includes_4_flashcard_badges(client):
    body = client.get("/api/progress/achievements").json()
    codes = {a["code"] for a in body["achievements"]}
    assert {"first_deck", "card_reviewer", "deck_master", "deck_collector"} <= codes
