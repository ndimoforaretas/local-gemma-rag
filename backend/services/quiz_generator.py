"""
Quiz generator — turns scoped knowledge-base content into a structured quiz.

Pipeline
--------
1. Retrieve representative chunks from the scoped documents.
   - Uses ``vector_db.search`` with a broad probe query, restricted by
     ``source_filter`` to honour the user's scope choice.
2. Build a strict prompt that forces Gemma to return ONLY a JSON array.
3. Parse and validate each question. Drop malformed items rather than fail
   the whole quiz (defensive design: small models occasionally emit one bad
   item out of ten).
4. Return the validated list of questions.

The output schema is fully typed (see ``QuizQuestion``) so the frontend can
render each item with confidence.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from typing import Literal, Optional

import ollama

from backend.config import get_settings
from backend.services.vector_db import vector_db

logger = logging.getLogger("cognivault.quiz")

Difficulty = Literal["beginner", "intermediate", "advanced"]
QuestionType = Literal["mcq", "true_false"]

# Maximum chunks retrieved as source material — enough variety, fits context.
_MAX_CHUNKS = 15
# Maximum characters per chunk before truncation in the prompt.
_MAX_CHUNK_CHARS = 1200
# Broad retrieval probe — picks up the most "representative" chunks when
# combined with the source filter.
_RETRIEVAL_PROBE = "key concepts, definitions, important facts, main ideas"


@dataclass
class QuizQuestion:
    """One validated quiz question, ready to ship to the frontend."""
    type: QuestionType
    question: str
    options: list[str]          # length 2 for T/F, 4 for MCQ
    correct_index: int          # index into options
    explanation: str = ""


@dataclass
class QuizGenerationResult:
    questions: list[QuizQuestion]
    source_chunks_used: int
    raw_model_response: str = field(default="", repr=False)


# ── Public API ──────────────────────────────────────────────────────────────


def generate_quiz(
    difficulty: Difficulty,
    num_questions: int,
    question_types: list[QuestionType],
    source_filter: Optional[list[str]] = None,
) -> QuizGenerationResult:
    """
    Generate a quiz from the scoped knowledge base.

    Parameters
    ----------
    difficulty       — beginner / intermediate / advanced
    num_questions    — 5, 10, or 20 (caller validates the value range)
    question_types   — non-empty subset of {"mcq", "true_false"}
    source_filter    — list of source filenames. None = full KB.

    Raises
    ------
    ValueError if ``question_types`` is empty or the scoped KB has no content.
    """
    if not question_types:
        raise ValueError("At least one question type must be specified.")

    chunks = _retrieve_context_chunks(source_filter)
    if not chunks:
        raise ValueError(
            "No content available for the selected scope. "
            "Add documents to the knowledge base or widen the scope."
        )

    prompt = _build_prompt(
        chunks=chunks,
        difficulty=difficulty,
        num_questions=num_questions,
        question_types=question_types,
    )

    settings = get_settings()
    response = ollama.chat(
        model=settings.llm_model,
        messages=[{"role": "user", "content": prompt}],
        options={"thinking": False, "temperature": 0.3},
    )
    raw_text = response["message"]["content"]
    logger.info(
        "Quiz raw response: difficulty=%s requested=%d chars=%d",
        difficulty, num_questions, len(raw_text),
    )

    questions = _parse_questions(raw_text, allowed_types=question_types)
    # Trim to the requested count (the model sometimes overshoots).
    questions = questions[:num_questions]

    return QuizGenerationResult(
        questions=questions,
        source_chunks_used=len(chunks),
        raw_model_response=raw_text,
    )


# ── Retrieval ───────────────────────────────────────────────────────────────


def _retrieve_context_chunks(source_filter: Optional[list[str]]) -> list[dict]:
    """
    Pull a representative slice of chunks from the scoped documents.

    When no filter is set this falls back to a generic probe over the full KB.
    """
    return vector_db.search(
        query=_RETRIEVAL_PROBE,
        top_k=_MAX_CHUNKS,
        source_filter=source_filter,
    )


# ── Prompt construction ─────────────────────────────────────────────────────


_DIFFICULTY_GUIDANCE = {
    "beginner": (
        "Test surface-level recall: definitions, names, simple facts directly "
        "stated in the source."
    ),
    "intermediate": (
        "Test understanding and application: comparing concepts, explaining "
        "why, or applying a fact to a new situation."
    ),
    "advanced": (
        "Test synthesis and edge cases: multi-step reasoning, identifying "
        "subtle errors, comparing trade-offs, or drawing inferences."
    ),
}


def _build_prompt(
    *,
    chunks: list[dict],
    difficulty: Difficulty,
    num_questions: int,
    question_types: list[QuestionType],
) -> str:
    """Construct a deterministic prompt that forces strict JSON output."""
    type_descriptions = []
    if "mcq" in question_types:
        type_descriptions.append(
            '"mcq" — multiple-choice with EXACTLY 4 options, one correct'
        )
    if "true_false" in question_types:
        type_descriptions.append(
            '"true_false" — options MUST be ["True", "False"]'
        )

    context_blocks = []
    for i, c in enumerate(chunks, 1):
        text = (c.get("content") or c.get("text") or "")[:_MAX_CHUNK_CHARS]
        source = c.get("source", "unknown")
        context_blocks.append(f"[Source {i}: {source}]\n{text}")
    context_section = "\n\n".join(context_blocks)

    diff_note = _DIFFICULTY_GUIDANCE[difficulty]
    types_csv = ", ".join(t for t in question_types)

    return (
        "You generate quizzes from study material. Output ONLY a JSON array. "
        "Do not include any commentary, markdown fences, or explanation text outside the JSON.\n\n"
        f"DIFFICULTY: {difficulty}. {diff_note}\n"
        f"NUMBER OF QUESTIONS: exactly {num_questions}.\n"
        f"ALLOWED QUESTION TYPES: {types_csv}.\n\n"
        "QUESTION TYPE SHAPES:\n- "
        + "\n- ".join(type_descriptions) + "\n\n"
        "OUTPUT SCHEMA — every element of the array MUST be an object with:\n"
        '  "type": one of [' + types_csv + ']\n'
        '  "question": the question text (string, no leading numbering)\n'
        '  "options": array of strings (length 4 for mcq, length 2 for true_false)\n'
        '  "correct_index": integer index into options (0-based)\n'
        '  "explanation": 1-2 sentence explanation of the correct answer (string)\n\n'
        "RULES:\n"
        "- Base every question on the source material below — do not invent facts.\n"
        "- Make incorrect MCQ options plausible but clearly wrong on close reading.\n"
        "- Vary the position of the correct answer across questions.\n"
        "- Do not number the questions; just emit the array.\n"
        "- Output MUST be parseable by JSON.parse with no preprocessing.\n\n"
        "SOURCE MATERIAL:\n"
        f"{context_section}\n\n"
        f"Now emit the JSON array of exactly {num_questions} questions."
    )


# ── Parsing & validation ────────────────────────────────────────────────────


def _parse_questions(
    raw: str,
    allowed_types: list[QuestionType],
) -> list[QuizQuestion]:
    """Extract and validate the JSON array. Skip malformed items, never crash."""
    array_text = _extract_json_array(raw)
    if array_text is None:
        logger.warning("Quiz parse failed: no JSON array found in model output.")
        return []

    try:
        items = json.loads(array_text)
    except json.JSONDecodeError as exc:
        logger.warning("Quiz parse failed: invalid JSON (%s).", exc)
        return []

    if not isinstance(items, list):
        return []

    allowed = set(allowed_types)
    questions: list[QuizQuestion] = []
    for raw_item in items:
        q = _validate_item(raw_item, allowed)
        if q is not None:
            questions.append(q)
    return questions


def _extract_json_array(text: str) -> Optional[str]:
    """
    Find the outermost JSON array in ``text`` even if the model wrapped it
    in markdown fences or stray prose.
    """
    fence_match = re.search(r"```(?:json)?\s*(\[[\s\S]*?\])\s*```", text)
    if fence_match:
        return fence_match.group(1)
    # Greedy match from first '[' to last ']' — handles nested brackets fine.
    first = text.find("[")
    last = text.rfind("]")
    if first != -1 and last != -1 and last > first:
        return text[first : last + 1]
    return None


def _validate_item(item: object, allowed_types: set[str]) -> Optional[QuizQuestion]:
    """Return a QuizQuestion or None if ``item`` is malformed."""
    if not isinstance(item, dict):
        return None

    qtype = item.get("type")
    question = item.get("question")
    options = item.get("options")
    correct_index = item.get("correct_index")
    explanation = item.get("explanation", "")

    if qtype not in allowed_types:
        return None
    if not isinstance(question, str) or not question.strip():
        return None
    if not isinstance(options, list) or not all(isinstance(o, str) for o in options):
        return None
    if not isinstance(correct_index, int):
        return None
    if not isinstance(explanation, str):
        explanation = ""

    if qtype == "mcq":
        if len(options) != 4:
            return None
    elif qtype == "true_false":
        if len(options) != 2:
            return None
        # Normalise capitalisation but require the True/False pair.
        norm = [o.strip().lower() for o in options]
        if set(norm) != {"true", "false"}:
            return None

    if not 0 <= correct_index < len(options):
        return None

    return QuizQuestion(
        type=qtype,                  # type: ignore[arg-type]
        question=question.strip(),
        options=[o.strip() for o in options],
        correct_index=correct_index,
        explanation=explanation.strip(),
    )
