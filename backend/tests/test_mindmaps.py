"""
Tests for Mindmaps (Mode 4).

Covers:
- Tree JSON parsing + validation
- Persistence CRUD (create / get / list / increment_export / delete)
- /api/study/mindmaps/* endpoints
- 3 new mindmap achievements
"""

from __future__ import annotations

import json
import os
from unittest.mock import patch

import pytest

from backend.services import achievements as ach_service
from backend.services import mindmap_generator, progress_tracker


@pytest.fixture(autouse=True)
def _isolate_progress_db(tmp_path, monkeypatch):
    db_path = tmp_path / "progress_test.db"
    monkeypatch.setattr(progress_tracker, "_db_path_override", str(db_path))
    yield
    if os.path.exists(db_path):
        os.remove(db_path)


VALID_TREE_JSON = {
    "label": "Python Fundamentals",
    "children": [
        {
            "label": "Variables and Types",
            "children": [
                {"label": "int and float", "children": []},
                {"label": "str and bool", "children": []},
            ],
        },
        {
            "label": "Control Flow",
            "children": [
                {"label": "if / else", "children": []},
                {"label": "for / while", "children": []},
            ],
        },
        {
            "label": "Functions",
            "children": [
                {"label": "def keyword", "children": []},
                {"label": "Arguments", "children": []},
            ],
        },
        {
            "label": "Data Structures",
            "children": [
                {"label": "Lists", "children": []},
                {"label": "Dicts", "children": []},
            ],
        },
    ],
}


# ── Parsing ──────────────────────────────────────────────────────────────────


def test_parse_tree_accepts_valid():
    out = mindmap_generator._parse_tree(json.dumps(VALID_TREE_JSON))
    assert out is not None
    assert out["label"] == "Python Fundamentals"
    assert len(out["children"]) == 4


def test_parse_tree_strips_markdown_fences():
    raw = "```json\n" + json.dumps(VALID_TREE_JSON) + "\n```"
    out = mindmap_generator._parse_tree(raw)
    assert out is not None


def test_parse_tree_repairs_trailing_commas():
    raw = '{"label": "T", "children": [{"label": "A", "children": []},]}'
    out = mindmap_generator._parse_tree(raw)
    assert out is not None
    assert len(out["children"]) == 1


def test_parse_tree_rejects_missing_root_label():
    bad = dict(VALID_TREE_JSON, label="")
    assert mindmap_generator._parse_tree(json.dumps(bad)) is None


def test_parse_tree_drops_malformed_children():
    bad = dict(
        VALID_TREE_JSON,
        children=[
            {"label": "Good", "children": []},
            "not a dict",   # invalid — should be dropped
            {"label": "", "children": []},  # invalid — should be dropped
            {"label": "AlsoGood", "children": []},
        ],
    )
    out = mindmap_generator._parse_tree(json.dumps(bad))
    assert out is not None
    assert len(out["children"]) == 2


def test_parse_tree_truncates_long_labels():
    long_label = "X" * 200
    bad = {"label": long_label, "children": []}
    out = mindmap_generator._parse_tree(json.dumps(bad))
    assert out is not None
    assert len(out["label"]) <= mindmap_generator._MAX_LABEL_CHARS


def test_parse_tree_returns_none_when_no_json():
    assert mindmap_generator._parse_tree("garbage") is None


# ── Persistence CRUD ────────────────────────────────────────────────────────


def test_create_and_get_roundtrip():
    mm_id = progress_tracker.create_mindmap(
        scope=["py.txt"], depth=2, title="T", tree=VALID_TREE_JSON,
    )
    mm = progress_tracker.get_mindmap(mm_id)
    assert mm is not None
    assert mm["title"] == "T"
    assert mm["depth"] == 2
    assert mm["scope"] == ["py.txt"]
    assert mm["tree"]["label"] == "Python Fundamentals"
    assert mm["export_count"] == 0


def test_list_returns_newest_first():
    a = progress_tracker.create_mindmap(scope=["a.txt"], depth=2, title="A", tree=VALID_TREE_JSON, created_at=1000)
    b = progress_tracker.create_mindmap(scope=["b.txt"], depth=2, title="B", tree=VALID_TREE_JSON, created_at=2000)
    items = progress_tracker.list_mindmaps()
    assert [m["id"] for m in items] == [b, a]


def test_increment_export_count():
    mm_id = progress_tracker.create_mindmap(scope=["x.txt"], depth=2, title="T", tree=VALID_TREE_JSON)
    progress_tracker.increment_mindmap_export(mm_id)
    progress_tracker.increment_mindmap_export(mm_id)
    mm = progress_tracker.get_mindmap(mm_id)
    assert mm["export_count"] == 2


def test_delete_removes_row():
    mm_id = progress_tracker.create_mindmap(scope=["x.txt"], depth=2, title="T", tree=VALID_TREE_JSON)
    assert progress_tracker.delete_mindmap(mm_id) is True
    assert progress_tracker.get_mindmap(mm_id) is None
    assert progress_tracker.delete_mindmap(999) is False


# ── Achievements ────────────────────────────────────────────────────────────


def test_mind_mapper_badge_unlocks_on_first_create():
    progress_tracker.create_mindmap(scope=["x.txt"], depth=2, title="T", tree=VALID_TREE_JSON)
    earned = ach_service.evaluate_and_persist()
    assert "mind_mapper" in earned


def test_cartographer_badge_unlocks_on_first_export():
    mm_id = progress_tracker.create_mindmap(scope=["x.txt"], depth=2, title="T", tree=VALID_TREE_JSON)
    assert "cartographer" not in ach_service.evaluate_and_persist()
    progress_tracker.increment_mindmap_export(mm_id)
    earned = ach_service.evaluate_and_persist()
    assert "cartographer" in earned


def test_concept_network_requires_5_mindmaps():
    for _ in range(5):
        progress_tracker.create_mindmap(scope=["x.txt"], depth=2, title="T", tree=VALID_TREE_JSON)
    earned = ach_service.evaluate_and_persist()
    assert "concept_network" in earned


# ── Endpoints ───────────────────────────────────────────────────────────────


def test_create_endpoint_happy_path(client):
    with patch.object(mindmap_generator, "ollama") as mock_oll, patch.object(
        mindmap_generator.vector_db, "search"
    ) as mock_search:
        mock_search.return_value = [{"source": "py.txt", "content": "Python material."}]
        mock_oll.chat.return_value = {"message": {"content": json.dumps(VALID_TREE_JSON)}}
        resp = client.post(
            "/api/study/mindmaps/mindmap",
            json={"document_filter": ["py.txt"], "depth": 2},
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["title"] == "Python Fundamentals"
    assert len(body["tree"]["children"]) == 4


def test_create_endpoint_rejects_empty_scope(client):
    resp = client.post(
        "/api/study/mindmaps/mindmap",
        json={"document_filter": [], "depth": 2},
    )
    assert resp.status_code == 422


def test_list_endpoint(client):
    progress_tracker.create_mindmap(scope=["x.txt"], depth=2, title="T", tree=VALID_TREE_JSON)
    body = client.get("/api/study/mindmaps").json()
    assert len(body["mindmaps"]) == 1
    assert body["mindmaps"][0]["title"] == "T"


def test_get_endpoint(client):
    mm_id = progress_tracker.create_mindmap(scope=["x.txt"], depth=2, title="T", tree=VALID_TREE_JSON)
    body = client.get(f"/api/study/mindmaps/mindmap/{mm_id}").json()
    assert body["title"] == "T"
    assert body["tree"]["label"] == "Python Fundamentals"


def test_get_endpoint_404(client):
    assert client.get("/api/study/mindmaps/mindmap/999").status_code == 404


def test_export_endpoint_bumps_count_and_unlocks_badge(client):
    mm_id = progress_tracker.create_mindmap(scope=["x.txt"], depth=2, title="T", tree=VALID_TREE_JSON)
    resp = client.post(f"/api/study/mindmaps/mindmap/{mm_id}/export")
    assert resp.status_code == 200
    body = resp.json()
    assert body["export_count"] == 1
    assert "cartographer" in body["newly_earned_achievements"]


def test_delete_endpoint(client):
    mm_id = progress_tracker.create_mindmap(scope=["x.txt"], depth=2, title="T", tree=VALID_TREE_JSON)
    assert client.delete(f"/api/study/mindmaps/mindmap/{mm_id}").status_code == 200
    assert progress_tracker.get_mindmap(mm_id) is None


def test_achievements_endpoint_lists_3_mindmap_badges(client):
    body = client.get("/api/progress/achievements").json()
    codes = {a["code"] for a in body["achievements"]}
    assert {"mind_mapper", "cartographer", "concept_network"} <= codes
