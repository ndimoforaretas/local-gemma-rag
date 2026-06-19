"""
Workshop generator — two-pass LLM generation for Mode 2.

Pass 1 (cheap, fast): ``generate_outline()``
    Retrieves scoped chunks and asks Gemma for a structured outline
    (title, summary, key points, objectives, lesson titles + reading-time
    estimates). Returns parsed Python dicts ready to persist.

Pass 2 (per-lesson, on-demand): ``generate_lesson()``
    Asked when the user clicks a lesson card. Receives the workshop's
    full context (theme, key points, objectives, all lesson titles) plus
    the index of the target lesson, and returns a well-structured
    Markdown lesson body. Markdown — not JSON — because lessons are
    meant to be read, and `marked` already renders Markdown in the chat.

The split lets us keep latency low on the initial generation while
producing rich content lazily, exactly when the user wants to read it.
"""

from __future__ import annotations

import json
import logging
import re
import threading
from dataclasses import dataclass
from typing import Literal, Optional

import ollama

from backend.config import get_settings
from backend.services import prompt_loader
from backend.services.vector_db import vector_db

logger = logging.getLogger("cognivault.workshop")

Difficulty = Literal["beginner", "intermediate", "advanced"]

_MAX_CHUNKS = 20             # outlines benefit from wider material than quizzes
# The lesson pass uses far fewer chunks: ~20 chunks (≈24k chars) of context
# overwhelms the model and triggers degenerate single-token (`#`) output. 8 is
# ample grounding and generates reliably across lesson topics.
_MAX_LESSON_CHUNKS = 8
_MAX_CHUNK_CHARS = 1200
_RETRIEVAL_PROBE = "key concepts, definitions, important facts, main ideas, examples"

# A real lesson body is well over 1k chars (Intro/Core/Takeaways/Self-check).
# These floors reject empty/heading-only/truncated generations so they're never
# cached — and let us self-heal any garbage already in the DB.
_MIN_LESSON_CHARS = 200
_MIN_BODY_CHARS = 120

# The local Ollama serializes poorly under concurrent generation (truncated /
# garbage output). One in-flight generation at a time across the whole module
# — prefetch and user-clicks queue rather than racing.
_GENERATION_LOCK = threading.Lock()


def is_substantive_lesson(text: Optional[str]) -> bool:
    """
    True if `text` is a real lesson body — not empty, a bare heading, or a
    truncated stub. Used both to reject bad generations before caching and to
    self-heal corrupt content already persisted (treat it as not-yet-generated).
    """
    if not text:
        return False
    text = text.strip()
    if len(text) < _MIN_LESSON_CHARS:
        return False
    prose = "\n".join(
        ln for ln in text.splitlines() if not ln.lstrip().startswith("#")
    ).strip()
    return len(prose) >= _MIN_BODY_CHARS


@dataclass
class WorkshopOutline:
    title: str
    summary: str
    key_points: list[str]
    objectives: list[str]
    lessons: list[dict]  # [{"title": str, "est_minutes": int}, ...]


# ── Pass 1: outline ─────────────────────────────────────────────────────────


_DIFF_NOTE = {
    "beginner": "Assume the reader is new to this material. Lessons explain "
                "foundations and define terms.",
    "intermediate": "Assume the reader has core background. Lessons compare "
                    "approaches, explain trade-offs, and connect concepts.",
    "advanced": "Assume strong fluency. Lessons explore edge cases, design "
                "decisions, and synthesis across the material.",
}


def generate_outline(
    difficulty: Difficulty,
    num_lessons: int,
    source_filter: list[str],
) -> WorkshopOutline:
    """Pass-1 generation. Raises ValueError on empty scope / bad output."""
    if not source_filter:
        raise ValueError("Workshops require a non-empty source scope.")

    chunks = vector_db.search(
        query=_RETRIEVAL_PROBE,
        top_k=_MAX_CHUNKS,
        source_filter=source_filter,
    )
    if not chunks:
        raise ValueError(
            "No content available for the selected scope. "
            "Add documents to the knowledge base or widen the scope."
        )

    prompt = _build_outline_prompt(chunks, difficulty, num_lessons)
    settings = get_settings()

    # Two attempts: first with `format="json"` (Ollama grammar-constrained
    # generation — guarantees syntactically valid JSON). If that still fails
    # parsing for some reason, retry once with a stronger reminder appended.
    for attempt in range(2):
        retry_prompt = (
            prompt
            if attempt == 0
            else prompt + "\n\nIMPORTANT: Your previous response was unparseable. "
                          "Output ONLY a single valid JSON object — no prose, no fences, "
                          "no trailing commas."
        )
        with _GENERATION_LOCK:
            try:
                response = ollama.chat(
                    model=settings.llm_model,
                    messages=[{"role": "user", "content": retry_prompt}],
                    options={"thinking": False, "temperature": 0.3 if attempt else 0.4},
                    format="json",
                )
            except TypeError:
                # Older ollama-python without `format` kwarg — fall back without it.
                response = ollama.chat(
                    model=settings.llm_model,
                    messages=[{"role": "user", "content": retry_prompt}],
                    options={"thinking": False, "temperature": 0.3 if attempt else 0.4},
                )
        raw = response["message"]["content"]
        parsed = _parse_outline(raw, num_lessons)
        if parsed is not None:
            return parsed
        logger.warning(
            "Workshop outline parse failed on attempt %d; retrying with stronger prompt",
            attempt + 1,
        )

    raise ValueError(
        "Model returned an unparseable workshop outline after 2 attempts. "
        "Try a narrower scope or a different difficulty."
    )


def _build_outline_prompt(
    chunks: list[dict],
    difficulty: Difficulty,
    num_lessons: int,
) -> str:
    context_blocks = []
    for i, c in enumerate(chunks, 1):
        text = (c.get("content") or c.get("text") or "")[:_MAX_CHUNK_CHARS]
        context_blocks.append(f"[Source {i}: {c.get('source', 'unknown')}]\n{text}")
    return prompt_loader.render(
        "workshop_outline",
        difficulty=difficulty,
        diff_note=_DIFF_NOTE[difficulty],
        num_lessons=num_lessons,
        context="\n\n".join(context_blocks),
    )


def _parse_outline(raw: str, expected_lessons: int) -> Optional[WorkshopOutline]:
    obj_text = _extract_json_object(raw)
    if obj_text is None:
        logger.warning("Workshop outline parse: no JSON object found.")
        return None
    try:
        data = json.loads(obj_text)
    except json.JSONDecodeError as exc:
        # One forgiving pass — strip trailing commas, smart-quotes, etc.
        repaired = _repair_json(obj_text)
        try:
            data = json.loads(repaired)
            logger.info("Workshop outline parse: recovered via repair pass.")
        except json.JSONDecodeError:
            logger.warning("Workshop outline parse: invalid JSON (%s).", exc)
            return None
    if not isinstance(data, dict):
        return None
    title = (data.get("title") or "").strip()
    summary = (data.get("summary") or "").strip()
    key_points = _str_list(data.get("key_points"))
    objectives = _str_list(data.get("objectives"))
    lessons_raw = data.get("lessons") or []
    if not (title and summary and key_points and objectives and isinstance(lessons_raw, list)):
        return None

    lessons: list[dict] = []
    for item in lessons_raw[:expected_lessons]:
        if not isinstance(item, dict):
            continue
        t = (item.get("title") or "").strip()
        m = item.get("est_minutes", 5)
        if not t:
            continue
        try:
            mins = max(3, min(15, int(m)))
        except (TypeError, ValueError):
            mins = 5
        lessons.append({"title": t, "est_minutes": mins})

    if len(lessons) < expected_lessons:
        # Pad with placeholder lessons rather than failing — caller can decide.
        for i in range(len(lessons), expected_lessons):
            lessons.append({"title": f"Lesson {i + 1}", "est_minutes": 5})

    return WorkshopOutline(
        title=title,
        summary=summary,
        key_points=key_points,
        objectives=objectives,
        lessons=lessons,
    )


# ── Pass 2: single lesson ────────────────────────────────────────────────────


def generate_lesson(
    workshop_title: str,
    workshop_summary: str,
    key_points: list[str],
    objectives: list[str],
    all_lesson_titles: list[str],
    lesson_idx: int,
    difficulty: Difficulty,
    source_filter: list[str],
) -> str:
    """
    Generate a single lesson's body as Markdown.

    Receives the full workshop context so the lesson is coherent with the
    other lessons, and re-retrieves scoped chunks for the source material.
    """
    if lesson_idx < 0 or lesson_idx >= len(all_lesson_titles):
        raise ValueError("lesson_idx out of range for this workshop.")
    lesson_title = all_lesson_titles[lesson_idx]

    chunks = vector_db.search(
        query=lesson_title,  # narrow probe — this lesson's topic
        top_k=_MAX_LESSON_CHUNKS,
        source_filter=source_filter,
    )
    if not chunks:
        # Re-probe broadly if the narrow probe missed everything.
        chunks = vector_db.search(
            query=_RETRIEVAL_PROBE,
            top_k=_MAX_LESSON_CHUNKS,
            source_filter=source_filter,
        )

    prompt = _build_lesson_prompt(
        workshop_title=workshop_title,
        workshop_summary=workshop_summary,
        key_points=key_points,
        objectives=objectives,
        all_lesson_titles=all_lesson_titles,
        lesson_idx=lesson_idx,
        lesson_title=lesson_title,
        difficulty=difficulty,
        chunks=chunks,
    )
    settings = get_settings()

    # Two attempts: the model occasionally emits degenerate output for a given
    # prompt; a re-roll (nudged temperature) almost always recovers. Mirrors the
    # outline pass. The lock serializes against concurrent generation, which can
    # also degrade output on a single local Ollama.
    for attempt in range(2):
        with _GENERATION_LOCK:
            response = ollama.chat(
                model=settings.llm_model,
                messages=[{"role": "user", "content": prompt}],
                options={"thinking": False, "temperature": 0.5 if attempt == 0 else 0.65},
            )
        text = response["message"]["content"].strip()
        # Strip any accidental <think> blocks, mirroring the chat fix.
        text = re.sub(r"<think>[\s\S]*?</think>", "", text, flags=re.IGNORECASE).strip()
        text = _clean_lesson_content(text)
        if is_substantive_lesson(text):
            return text
        logger.warning(
            "Lesson %d non-substantive on attempt %d (len=%d); retrying",
            lesson_idx, attempt + 1, len(text),
        )

    # Never cache empty/heading-only/truncated output — raise so the caller
    # surfaces a retryable error instead of persisting garbage forever.
    raise ValueError(
        "The model returned incomplete lesson content after 2 attempts. "
        "Please regenerate this lesson."
    )


_OUTRO_PATTERNS = [
    r"\n\s*(?:\*\*|__)?If you (?:have|'d like)[^\n]*[\s\S]*$",
    r"\n\s*(?:\*\*|__)?Let me know if[\s\S]*$",
    r"\n\s*(?:\*\*|__)?Feel free to ask[\s\S]*$",
    r"\n\s*(?:\*\*|__)?I hope this helps[\s\S]*$",
    r"\n\s*(?:\*\*|__)?Hope this (?:helps|clarifies)[\s\S]*$",
]


def _clean_lesson_content(text: str) -> str:
    """
    Strip chat-style preamble and outro the model sometimes adds despite the prompt.

    Removes:
      - Any prose before the first `#` heading (the lesson title).
      - Common closing patterns ("If you have a specific question…",
        "Let me know…", "Feel free to ask…", "I hope this helps…").
    """
    # Trim everything before the first Markdown heading line.
    lines = text.splitlines()
    for i, line in enumerate(lines):
        if line.lstrip().startswith("#"):
            text = "\n".join(lines[i:])
            break

    # Strip the earliest chat-outro to end of text — but ONLY when a substantial
    # lesson body precedes it. Otherwise the "outro" is the whole body of a
    # degenerate response; gutting it here would mask the failure, so we leave it
    # for is_substantive_lesson() to reject.
    earliest = len(text)
    for pat in _OUTRO_PATTERNS:
        m = re.search(pat, text, flags=re.IGNORECASE)
        if m:
            earliest = min(earliest, m.start())
    if earliest >= _MIN_LESSON_CHARS:
        text = text[:earliest]

    return text.strip()


def _build_lesson_prompt(**kw) -> str:
    context_blocks = []
    for i, c in enumerate(kw["chunks"], 1):
        t = (c.get("content") or c.get("text") or "")[:_MAX_CHUNK_CHARS]
        context_blocks.append(f"[Source {i}: {c.get('source', 'unknown')}]\n{t}")
    other_lessons = "\n".join(
        f"  {i + 1}. {t}" for i, t in enumerate(kw["all_lesson_titles"]) if i != kw["lesson_idx"]
    )
    return prompt_loader.render(
        "workshop_lesson",
        lesson_title=kw["lesson_title"],
        workshop_title=kw["workshop_title"],
        workshop_summary=kw["workshop_summary"],
        difficulty=kw["difficulty"],
        diff_note=_DIFF_NOTE[kw["difficulty"]],
        key_points="- " + "\n- ".join(kw["key_points"]),
        objectives="- " + "\n- ".join(kw["objectives"]),
        other_lessons=other_lessons,
        lesson_number=kw["lesson_idx"] + 1,
        total_lessons=len(kw["all_lesson_titles"]),
        context="\n\n".join(context_blocks),
    )


# ── Shared parsing helpers ───────────────────────────────────────────────────


def _repair_json(text: str) -> str:
    """
    Forgive the most common LLM JSON tics:
    - Trailing commas before closing ``]`` or ``}``
    - Smart quotes (“, ”, ‘, ’) instead of ASCII quotes
    - Unescaped newlines inside string values (best-effort only)
    """
    # Smart quotes → straight quotes.
    text = (
        text.replace("“", '"').replace("”", '"')
            .replace("‘", "'").replace("’", "'")
    )
    # Trailing commas: `,]` or `,}` (with whitespace tolerance).
    text = re.sub(r",(\s*[\]}])", r"\1", text)
    return text


def _extract_json_object(text: str) -> Optional[str]:
    fence = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", text)
    if fence:
        return fence.group(1)
    first = text.find("{")
    last = text.rfind("}")
    if first != -1 and last != -1 and last > first:
        return text[first : last + 1]
    return None


def _str_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(v).strip() for v in value if isinstance(v, (str, int, float)) and str(v).strip()]
