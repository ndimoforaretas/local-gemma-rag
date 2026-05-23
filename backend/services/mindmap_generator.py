"""
Mindmap generator — single-pass hierarchical JSON.

Returns a nested tree:
  {
    "label": "<root concept>",
    "children": [
      { "label": "<L1 branch>", "children": [{"label": "<L2 leaf>"}, ...] },
      ...
    ]
  }

Hard caps prevent runaway branch counts that would make the visual unreadable:
  - 4-6 first-level branches
  - 2-4 second-level sub-branches per branch
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from typing import Optional

import ollama

from backend.config import get_settings
from backend.services.vector_db import vector_db

logger = logging.getLogger("cognivault.mindmap")

_MAX_CHUNKS = 18
_MAX_CHUNK_CHARS = 1200
_RETRIEVAL_PROBE = "main themes, key concepts, important sub-topics, big ideas"

_MIN_L1, _MAX_L1 = 4, 6
_MIN_L2, _MAX_L2 = 2, 4
_MAX_LABEL_CHARS = 60


@dataclass
class MindmapResult:
    title: str
    tree: dict
    source_chunks_used: int
    raw: str = field(default="", repr=False)


def generate_mindmap(source_filter: list[str]) -> MindmapResult:
    if not source_filter:
        raise ValueError("Mindmaps require a non-empty source scope.")

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

    prompt = _build_prompt(chunks)
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
    logger.info("Mindmap raw response chars=%d", len(raw))

    tree = _parse_tree(raw)
    if tree is None:
        raise ValueError(
            "Model returned an unparseable mindmap. "
            "Try a narrower scope or generate again."
        )

    return MindmapResult(
        title=tree["label"],
        tree=tree,
        source_chunks_used=len(chunks),
        raw=raw,
    )


def _build_prompt(chunks: list[dict]) -> str:
    blocks = []
    for i, c in enumerate(chunks, 1):
        text = (c.get("content") or c.get("text") or "")[:_MAX_CHUNK_CHARS]
        blocks.append(f"[Source {i}: {c.get('source', 'unknown')}]\n{text}")
    return (
        "You design a concept mindmap from study material. Output ONLY a single "
        "JSON object — no prose, no markdown fences.\n\n"
        "OUTPUT SCHEMA:\n"
        "{\n"
        '  "label": short title for the central concept (max 6 words),\n'
        '  "children": [\n'
        f'    {{ "label": "...", "children": [{{ "label": "..." }}, ...] }},\n'
        f'    ... (between {_MIN_L1} and {_MAX_L1} entries)\n'
        "  ]\n"
        "}\n\n"
        "RULES:\n"
        "- The root `label` summarises the whole material.\n"
        f"- The top-level branches array MUST have {_MIN_L1}-{_MAX_L1} entries: "
        "  the main themes / categories of the material.\n"
        f"- Each branch MUST have {_MIN_L2}-{_MAX_L2} children: concrete sub-topics, "
        "  examples, or key terms under that theme.\n"
        f"- Every label is short and scannable (max {_MAX_LABEL_CHARS} chars). "
        "  Aim for 2-5 words. Capitalise like a title.\n"
        "- No repeated labels at the same level.\n"
        "- Ground every node in the source material — do not invent topics.\n\n"
        "SOURCE MATERIAL:\n"
        + "\n\n".join(blocks)
        + "\n\nNow emit the JSON object."
    )


def _parse_tree(raw: str) -> Optional[dict]:
    obj_text = _extract_json_object(raw)
    if obj_text is None:
        logger.warning("Mindmap parse: no JSON object found.")
        return None
    try:
        data = json.loads(obj_text)
    except json.JSONDecodeError:
        # Forgiving pass — strip trailing commas and smart quotes.
        repaired = (
            obj_text.replace("“", '"').replace("”", '"')
                    .replace("‘", "'").replace("’", "'")
        )
        repaired = re.sub(r",(\s*[\]}])", r"\1", repaired)
        try:
            data = json.loads(repaired)
        except json.JSONDecodeError as exc:
            logger.warning("Mindmap parse: invalid JSON (%s).", exc)
            return None

    return _validate_tree(data)


def _validate_tree(node: object) -> Optional[dict]:
    """Return a clean tree dict or None. Enforces label + child caps recursively."""
    if not isinstance(node, dict):
        return None
    label = (node.get("label") or "").strip()
    if not label:
        return None
    label = label[:_MAX_LABEL_CHARS]
    raw_children = node.get("children") or []
    if not isinstance(raw_children, list):
        raw_children = []

    clean_children: list[dict] = []
    for child in raw_children[:_MAX_L1]:  # cap defensively at any level
        sub = _validate_tree(child)
        if sub is not None:
            clean_children.append(sub)

    return {"label": label, "children": clean_children}


def _extract_json_object(text: str) -> Optional[str]:
    fence = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", text)
    if fence:
        return fence.group(1)
    first = text.find("{")
    last = text.rfind("}")
    if first != -1 and last != -1 and last > first:
        return text[first : last + 1]
    return None
