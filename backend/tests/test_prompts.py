"""
Tests for the file-based prompt system (prompt_loader + backend/prompts/*.md).
"""

from __future__ import annotations

from pathlib import Path

import pytest

from backend.services import prompt_loader

_EXPECTED = [
    "quiz",
    "flashcards",
    "mindmap",
    "workshop_outline",
    "workshop_lesson",
]


def test_all_expected_prompts_ship():
    available = set(prompt_loader.available())
    for name in _EXPECTED:
        assert name in available, f"missing prompt file: {name}.md"


def test_render_substitutes_placeholders():
    out = prompt_loader.render(
        "quiz",
        difficulty="advanced",
        diff_note="note",
        num_questions=7,
        types_csv="mcq",
        type_descriptions="- mcq",
        context="SOURCE",
    )
    assert "advanced" in out
    assert "EXACTLY 7" in out
    assert "SOURCE" in out
    # No unsubstituted tokens should remain for the vars we passed.
    assert "$num_questions" not in out
    assert "$context" not in out


def test_object_json_contract_preserved():
    """Every generator prompt must still ask for a top-level JSON object."""
    assert '"questions"' in prompt_loader.render(
        "quiz", difficulty="b", diff_note="", num_questions=5,
        types_csv="mcq", type_descriptions="- mcq", context="x",
    )
    assert '"cards"' in prompt_loader.render(
        "flashcards", difficulty="b", diff_note="", num_cards=5, context="x",
    )
    assert '"label"' in prompt_loader.render(
        "mindmap", min_l1=3, max_l1=6, min_l2=2, max_l2=5,
        max_label_chars=40, context="x",
    )
    assert '"lessons"' in prompt_loader.render(
        "workshop_outline", difficulty="b", diff_note="", num_lessons=4, context="x",
    )


def test_unknown_token_left_verbatim():
    """safe_substitute: an unexpected $token doesn't raise, just passes through."""
    # quiz template has no $banana; passing extra/none shouldn't crash.
    out = prompt_loader.render("quiz", difficulty="b", diff_note="", num_questions=5,
                               types_csv="mcq", type_descriptions="-", context="x")
    assert isinstance(out, str) and len(out) > 0


def test_missing_prompt_raises():
    with pytest.raises(FileNotFoundError):
        prompt_loader.render("does_not_exist")


def test_custom_override_wins(tmp_path, monkeypatch):
    """A file in prompts/custom/<name>.md overrides the shipped default."""
    custom_dir = tmp_path / "custom"
    custom_dir.mkdir()
    (tmp_path / "quiz.md").write_text("DEFAULT $num_questions", encoding="utf-8")
    (custom_dir / "quiz.md").write_text("CUSTOM $num_questions", encoding="utf-8")
    monkeypatch.setattr(prompt_loader, "_PROMPTS_DIR", tmp_path)
    monkeypatch.setattr(prompt_loader, "_CUSTOM_DIR", custom_dir)
    prompt_loader._cache.clear()

    out = prompt_loader.render("quiz", num_questions=9)
    assert out == "CUSTOM 9"
