"""
Prompt template loader — keeps generator prompts in editable files instead of
hard-coded in Python.

Templates live in ``backend/prompts/<name>.md`` and use ``string.Template``
``$placeholder`` syntax (so the JSON ``{ }`` braces in the prompts are left
untouched). A user can override any prompt without touching code by dropping a
file at ``backend/prompts/custom/<name>.md`` — that wins over the shipped
default. Files are re-read when their mtime changes, so edits take effect on the
next request (no full restart needed for prompt tweaks).

Usage:
    from backend.services import prompt_loader
    prompt = prompt_loader.render("quiz", difficulty=..., context=..., ...)
"""

from __future__ import annotations

import logging
from pathlib import Path
from string import Template

logger = logging.getLogger("cognivault.prompts")

_PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"
_CUSTOM_DIR = _PROMPTS_DIR / "custom"

# path-string -> (mtime, text)
_cache: dict[str, tuple[float, str]] = {}


def _resolve(name: str) -> Path:
    """Custom override wins over the shipped default. Raises if neither exists."""
    custom = _CUSTOM_DIR / f"{name}.md"
    if custom.is_file():
        return custom
    base = _PROMPTS_DIR / f"{name}.md"
    if base.is_file():
        return base
    raise FileNotFoundError(
        f"No prompt template '{name}.md' found in {_PROMPTS_DIR} (or its custom/ dir)."
    )


def _read(name: str) -> str:
    path = _resolve(name)
    key = str(path)
    mtime = path.stat().st_mtime
    cached = _cache.get(key)
    if cached and cached[0] == mtime:
        return cached[1]
    text = path.read_text(encoding="utf-8")
    _cache[key] = (mtime, text)
    return text


def render(name: str, **variables: object) -> str:
    """
    Load prompt ``name`` and substitute ``$placeholder`` variables.

    Uses ``safe_substitute`` so an unknown ``$token`` in a (possibly custom)
    template is left verbatim rather than raising — a bad template degrades
    gracefully instead of breaking generation.
    """
    template = _read(name)
    return Template(template).safe_substitute(variables)


def available() -> list[str]:
    """List shipped prompt names (without extension) — handy for diagnostics."""
    if not _PROMPTS_DIR.is_dir():
        return []
    return sorted(p.stem for p in _PROMPTS_DIR.glob("*.md"))
