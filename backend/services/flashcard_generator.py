"""
Flashcard deck generator — one-pass JSON generation.

Pulls representative chunks from the scoped documents and asks Gemma for an
array of ``{front, back}`` pairs. ``format="json"`` constrains the output to
syntactically valid JSON; we then validate each card and drop any malformed
entries (same defensive pattern as the quiz generator).

Difficulty controls the cognitive depth of the pair:
  beginner      — simple term ↔ definition, key fact ↔ short answer
  intermediate  — concept ↔ explanation with one example, compare ↔ contrast
  advanced      — nuanced prompt ↔ multi-sentence answer requiring synthesis
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

logger = logging.getLogger("cognivault.flashcards")

Difficulty = Literal["beginner", "intermediate", "advanced"]

_MAX_CHUNKS = 15
_MAX_CHUNK_CHARS = 1200
_RETRIEVAL_PROBE = "key terms, definitions, important facts, concepts to memorise"

_DIFFICULTY_GUIDANCE = {
    "beginner": "Each card is a simple term ↔ definition pair, or a basic fact ↔ short answer.",
    "intermediate": "Each card pairs a concept with a 1-2 sentence explanation, "
                    "or a compare/contrast prompt with the key distinction.",
    "advanced": "Each card poses a nuanced prompt and the back gives a "
                "multi-sentence answer requiring synthesis of multiple ideas.",
}


@dataclass
class Flashcard:
    front: str
    back: str


@dataclass
class FlashcardDeckResult:
    title: str
    cards: list[Flashcard]
    source_chunks_used: int
    raw: str = field(default="", repr=False)


def generate_deck(
    difficulty: Difficulty,
    num_cards: int,
    source_filter: list[str],
) -> FlashcardDeckResult:
    if not source_filter:
        raise ValueError("Flashcards require a non-empty source scope.")

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

    prompt = _build_prompt(chunks, difficulty, num_cards)
    settings = get_settings()
    try:
        response = ollama.chat(
            model=settings.llm_model,
            messages=[{"role": "user", "content": prompt}],
            options={"thinking": False, "temperature": 0.4},
            format="json",
        )
    except TypeError:
        response = ollama.chat(
            model=settings.llm_model,
            messages=[{"role": "user", "content": prompt}],
            options={"thinking": False, "temperature": 0.4},
        )
    raw = response["message"]["content"]
    logger.info(
        "Flashcard raw response: difficulty=%s requested=%d chars=%d",
        difficulty, num_cards, len(raw),
    )

    parsed = _parse_deck(raw, num_cards)
    if not parsed:
        raise ValueError(
            "Model returned no usable flashcards. Try a narrower scope or different difficulty."
        )

    title = _derive_title(source_filter)
    return FlashcardDeckResult(
        title=title,
        cards=parsed[:num_cards],
        source_chunks_used=len(chunks),
        raw=raw,
    )


def _derive_title(source_filter: list[str]) -> str:
    """Reasonable default title from the scope (UI can rename later if needed)."""
    if len(source_filter) == 1:
        # Strip extension and replace separators for a clean title.
        stem = re.sub(r"\.[a-z]+$", "", source_filter[0], flags=re.IGNORECASE)
        return stem.replace("_", " ").replace("-", " ").strip().title() + " Flashcards"
    return f"{len(source_filter)}-source Flashcards"


def _build_prompt(chunks: list[dict], difficulty: Difficulty, num_cards: int) -> str:
    blocks = []
    for i, c in enumerate(chunks, 1):
        text = (c.get("content") or c.get("text") or "")[:_MAX_CHUNK_CHARS]
        blocks.append(f"[Source {i}: {c.get('source', 'unknown')}]\n{text}")
    return (
        "You generate flashcard decks for spaced review. Output ONLY a single "
        "JSON object — no prose, no markdown fences.\n\n"
        f"DIFFICULTY: {difficulty}. {_DIFFICULTY_GUIDANCE[difficulty]}\n"
        f"NUMBER OF CARDS: EXACTLY {num_cards}.\n\n"
        "OUTPUT SCHEMA:\n"
        "{\n"
        '  "cards": [\n'
        f'    {{"front": "prompt/term/question (short)", "back": "answer/definition (concise)"}},\n'
        f'    ... exactly {num_cards} entries\n'
        "  ]\n"
        "}\n\n"
        "RULES:\n"
        "- Ground every card in the source material below — do not invent facts.\n"
        "- Fronts must be standalone (a card should be reviewable without context).\n"
        "- Vary the prompt style: definitions, fill-in-the-blank, compare/contrast, "
        "  identify-the-purpose, what-happens-if. Don't make every card look identical.\n"
        "- Backs are concise: 1-3 sentences for beginner, up to 4 for advanced.\n"
        f"- The cards array MUST contain exactly {num_cards} entries.\n\n"
        "SOURCE MATERIAL:\n"
        + "\n\n".join(blocks)
        + "\n\nNow emit the JSON object."
    )


def _parse_deck(raw: str, expected: int) -> list[Flashcard]:
    obj_text = _extract_json_object(raw)
    if obj_text is None:
        logger.warning("Flashcard parse: no JSON object found.")
        return []
    try:
        data = json.loads(obj_text)
    except json.JSONDecodeError:
        # One forgiving pass.
        repaired = re.sub(r",(\s*[\]}])", r"\1", obj_text)
        try:
            data = json.loads(repaired)
        except json.JSONDecodeError as exc:
            logger.warning("Flashcard parse: invalid JSON (%s).", exc)
            return []
    if not isinstance(data, dict):
        return []
    raw_cards = data.get("cards", [])
    if not isinstance(raw_cards, list):
        return []
    out: list[Flashcard] = []
    for item in raw_cards[:expected]:
        if not isinstance(item, dict):
            continue
        front = (item.get("front") or "").strip()
        back = (item.get("back") or "").strip()
        if front and back:
            out.append(Flashcard(front=front, back=back))
    return out


def _extract_json_object(text: str) -> Optional[str]:
    fence = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", text)
    if fence:
        return fence.group(1)
    first = text.find("{")
    last = text.rfind("}")
    if first != -1 and last != -1 and last > first:
        return text[first : last + 1]
    return None
