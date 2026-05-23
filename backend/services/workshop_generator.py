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
from dataclasses import dataclass
from typing import Literal, Optional

import ollama

from backend.config import get_settings
from backend.services.vector_db import vector_db

logger = logging.getLogger("cognivault.workshop")

Difficulty = Literal["beginner", "intermediate", "advanced"]

_MAX_CHUNKS = 20             # outlines benefit from wider material than quizzes
_MAX_CHUNK_CHARS = 1200
_RETRIEVAL_PROBE = "key concepts, definitions, important facts, main ideas, examples"


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
    return (
        "You design a structured workshop from study material. "
        "Output ONLY a JSON object. No prose, no markdown fences.\n\n"
        f"DIFFICULTY: {difficulty}. {_DIFF_NOTE[difficulty]}\n"
        f"NUMBER OF LESSONS: EXACTLY {num_lessons}.\n\n"
        "OUTPUT SCHEMA:\n"
        "{\n"
        '  "title": short engaging workshop title (string),\n'
        '  "summary": 2-3 sentence overview of what the workshop covers,\n'
        '  "key_points": array of 3-5 bullet strings — main topics covered,\n'
        '  "objectives": array of 3-5 bullet strings — what the learner will be able to do after,\n'
        f'  "lessons": array of EXACTLY {num_lessons} objects, each {{"title": str, "est_minutes": int 3-15}}\n'
        "}\n\n"
        "RULES:\n"
        "- Ground every part in the source material below — do not invent topics.\n"
        "- Lesson order should build progressively (foundations first, advanced last).\n"
        "- Lesson titles should be concise and action/topic oriented.\n"
        "- est_minutes is a realistic reading-time estimate for that lesson.\n"
        f"- The lessons array MUST contain exactly {num_lessons} items.\n\n"
        "SOURCE MATERIAL:\n"
        + "\n\n".join(context_blocks)
        + "\n\nNow emit the JSON object."
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
        top_k=_MAX_CHUNKS,
        source_filter=source_filter,
    )
    if not chunks:
        # Re-probe broadly if the narrow probe missed everything.
        chunks = vector_db.search(
            query=_RETRIEVAL_PROBE,
            top_k=_MAX_CHUNKS,
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
    response = ollama.chat(
        model=settings.llm_model,
        messages=[{"role": "user", "content": prompt}],
        options={"thinking": False, "temperature": 0.5},
    )
    text = response["message"]["content"].strip()
    # Strip any accidental <think> blocks, mirroring the chat fix.
    text = re.sub(r"<think>[\s\S]*?</think>", "", text, flags=re.IGNORECASE).strip()
    text = _clean_lesson_content(text)
    return text or f"# {lesson_title}\n\n(The model returned no content. Try regenerating.)"


def _clean_lesson_content(text: str) -> str:
    """
    Strip chat-style preamble and outro the model sometimes adds despite the prompt.

    Removes:
      - Any prose before the first `#` heading (the lesson title).
      - Common closing patterns ("If you have a specific question…",
        "Let me know…", "Feel free to ask…", "I hope this helps…").
      - Trailing "If you have questions about any of these topics…" blocks.
    """
    # Trim everything before the first Markdown heading line.
    lines = text.splitlines()
    for i, line in enumerate(lines):
        if line.lstrip().startswith("#"):
            text = "\n".join(lines[i:])
            break

    # Strip common chat-outro patterns from the end. Matches on the start
    # of a new paragraph so we don't accidentally chop mid-sentence.
    outro_patterns = [
        r"\n\s*(?:\*\*|__)?If you (?:have|'d like)[^\n]*[\s\S]*$",
        r"\n\s*(?:\*\*|__)?Let me know if[\s\S]*$",
        r"\n\s*(?:\*\*|__)?Feel free to ask[\s\S]*$",
        r"\n\s*(?:\*\*|__)?I hope this helps[\s\S]*$",
        r"\n\s*(?:\*\*|__)?Hope this (?:helps|clarifies)[\s\S]*$",
    ]
    for pat in outro_patterns:
        text = re.sub(pat, "", text, flags=re.IGNORECASE)

    return text.strip()


def _build_lesson_prompt(**kw) -> str:
    context_blocks = []
    for i, c in enumerate(kw["chunks"], 1):
        t = (c.get("content") or c.get("text") or "")[:_MAX_CHUNK_CHARS]
        context_blocks.append(f"[Source {i}: {c.get('source', 'unknown')}]\n{t}")
    other_lessons = "\n".join(
        f"  {i + 1}. {t}" for i, t in enumerate(kw["all_lesson_titles"]) if i != kw["lesson_idx"]
    )
    return (
        "You write a single workshop lesson as well-structured Markdown. "
        "Output ONLY the lesson body — no preamble, no acknowledgment of the source material, "
        "no offers to clarify or answer follow-up questions, no <think> or XML tags, no JSON. "
        "Your response MUST start with the exact heading line `# " + kw["lesson_title"] + "` "
        "and nothing before it. Your response MUST end after the last Self-check question — "
        "do NOT add 'If you have any questions…', 'Let me know…', 'Feel free to ask…', or "
        "any other chat-style outro.\n\n"
        f"WORKSHOP: {kw['workshop_title']}\n"
        f"WORKSHOP SUMMARY: {kw['workshop_summary']}\n"
        f"DIFFICULTY: {kw['difficulty']}. {_DIFF_NOTE[kw['difficulty']]}\n\n"
        f"KEY POINTS:\n- " + "\n- ".join(kw["key_points"]) + "\n\n"
        f"LEARNING OBJECTIVES:\n- " + "\n- ".join(kw["objectives"]) + "\n\n"
        f"OTHER LESSONS IN THIS WORKSHOP (avoid duplicating their content):\n{other_lessons}\n\n"
        f"YOUR LESSON ({kw['lesson_idx'] + 1} of {len(kw['all_lesson_titles'])}): "
        f"{kw['lesson_title']}\n\n"
        "STRUCTURE THIS LESSON AS:\n"
        f"# {kw['lesson_title']}\n"
        "## Introduction\n"
        "(1-2 short paragraphs orienting the reader)\n\n"
        "## Core content\n"
        "(The body — multiple sections / subsections as needed, with examples and "
        "code blocks where helpful)\n\n"
        "## Key takeaways\n"
        "(Bulleted list, 3-5 items)\n\n"
        "## Self-check\n"
        "(2-3 short reflective questions the reader can ponder — no answers given)\n\n"
        "RULES:\n"
        "- Ground every claim in the source material below.\n"
        "- Stay tightly focused on YOUR lesson's title — leave other topics to other lessons.\n"
        "- Use Markdown features: headings, bullets, **bold**, `inline code`, and ```fenced``` blocks.\n"
        "- Aim for substantial but readable: roughly the est_minutes worth of content.\n\n"
        "SOURCE MATERIAL:\n"
        + "\n\n".join(context_blocks)
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
