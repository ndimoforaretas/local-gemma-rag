"""
Achievement definitions for the Learning Progress Tracker.

Badges are defined as **data** in ``backend/achievements.json`` — not code — so a
new badge is a file edit + UI refresh, no Python changes. Each entry has:
- ``code``        — stable string ID used in storage (never change it)
- ``name``        — short display label
- ``description`` — sentence shown on hover/tap in the dashboard
- ``icon``        — emoji (the dashboard renders the string directly)
- ``comparator``  — how the badge unlocks (default ``gte``); see COMPARATORS
- ``metric``      — key into ``progress_tracker.stats_for_eval()`` this badge tracks
- ``target``      — threshold the metric must reach (for ``gte``)
- ``hours``       — ``[start, end]`` 24h window (for ``hour_between``; wraps midnight)
- ``group``       — family ID; badges in a group form an ascending ladder
                    (e.g. streak_3 → streak_7). Omit = standalone badge.

Time-of-day badges (Night Owl / Early Bird) use ``hour_between`` and carry no
``target``/``group`` so the dashboard renders no progress bar for them.

To add a badge: append an object to ``achievements.json`` and restart. An invalid
entry (unknown comparator, missing metric/target) is logged and skipped — a typo
can never crash chat.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from backend.services import progress_tracker

logger = logging.getLogger("cognivault.achievements")

# achievements.json lives at the backend package root (this file is in services/).
_ACHIEVEMENTS_FILE = Path(__file__).resolve().parent.parent / "achievements.json"


@dataclass(frozen=True)
class Achievement:
    code: str
    name: str
    description: str
    icon: str
    # ── Unlock rule ──────────────────────────────────────────────────────────
    # comparator selects the predicate in COMPARATORS; metric/target/hours feed it.
    comparator: str = "gte"
    metric: str | None = None
    target: float | None = None
    hours: tuple[int, int] | None = None
    # group — family ID for the ascending-ladder "next level" hint in the modal.
    group: str | None = None


def _hour_between(hour: int, window: tuple[int, int] | None) -> bool:
    """True if ``hour`` falls in ``[start, end)``. Wraps midnight when start > end."""
    if not window:
        return False
    start, end = window
    if start <= end:
        return start <= hour < end
    return hour >= start or hour < end  # wrap-around window (e.g. 22:00–04:00)


# Predicate per comparator. Each takes (stats, achievement) → bool. Add new
# comparators here; the JSON ``comparator`` field selects one by name.
COMPARATORS: dict[str, Callable[[dict, "Achievement"], bool]] = {
    "gte": lambda s, a: a.target is not None and s.get(a.metric, 0) >= a.target,
    "hour_between": lambda s, a: _hour_between(s.get("local_hour", -1), a.hours),
}


def _validate(raw: dict) -> Achievement | None:
    """Build an Achievement from a raw JSON dict, or None if it's malformed."""
    code = raw.get("code")
    if not code or not isinstance(code, str):
        logger.warning("Achievement skipped: missing/invalid 'code' in %r", raw)
        return None
    for field in ("name", "description", "icon"):
        if not raw.get(field):
            logger.warning("Achievement %s skipped: missing '%s'", code, field)
            return None

    comparator = raw.get("comparator", "gte")
    if comparator not in COMPARATORS:
        logger.warning(
            "Achievement %s skipped: unknown comparator %r", code, comparator
        )
        return None

    if comparator == "gte":
        if not raw.get("metric") or not isinstance(raw.get("target"), (int, float)):
            logger.warning(
                "Achievement %s skipped: 'gte' needs a 'metric' and numeric 'target'",
                code,
            )
            return None
    elif comparator == "hour_between":
        hours = raw.get("hours")
        if (
            not isinstance(hours, list)
            or len(hours) != 2
            or not all(isinstance(h, int) for h in hours)
        ):
            logger.warning(
                "Achievement %s skipped: 'hour_between' needs 'hours': [start, end]",
                code,
            )
            return None

    hours = raw.get("hours")
    return Achievement(
        code=code,
        name=raw["name"],
        description=raw["description"],
        icon=raw["icon"],
        comparator=comparator,
        metric=raw.get("metric"),
        target=raw.get("target"),
        hours=tuple(hours) if isinstance(hours, list) and len(hours) == 2 else None,
        group=raw.get("group"),
    )


def _load_achievements() -> list[Achievement]:
    """Load + validate badge definitions from the JSON data file."""
    try:
        raw_list = json.loads(_ACHIEVEMENTS_FILE.read_text(encoding="utf-8"))
    except Exception:
        logger.exception("Could not read achievements.json — no badges loaded")
        return []
    if not isinstance(raw_list, list):
        logger.error("achievements.json must be a JSON list; got %s", type(raw_list))
        return []

    out: list[Achievement] = []
    seen: set[str] = set()
    for raw in raw_list:
        if not isinstance(raw, dict):
            logger.warning("Achievement skipped: entry is not an object: %r", raw)
            continue
        ach = _validate(raw)
        if ach is None:
            continue
        if ach.code in seen:
            logger.warning("Achievement %s skipped: duplicate code", ach.code)
            continue
        seen.add(ach.code)
        out.append(ach)
    return out


ACHIEVEMENTS: list[Achievement] = _load_achievements()


def _compute_next_codes() -> dict[str, str | None]:
    """
    For each badge in a group, find the next badge up the ladder (the one with
    the smallest target greater than this badge's). Standalone badges → None.

    Static relationship derived from ``ACHIEVEMENTS`` — independent of which
    badges the user has earned, so the modal can always show "next level".
    """
    next_map: dict[str, str | None] = {a.code: None for a in ACHIEVEMENTS}
    by_group: dict[str, list[Achievement]] = {}
    for a in ACHIEVEMENTS:
        if a.group and a.target is not None:
            by_group.setdefault(a.group, []).append(a)
    for members in by_group.values():
        ordered = sorted(members, key=lambda a: a.target or 0)
        for cur, nxt in zip(ordered, ordered[1:]):
            next_map[cur.code] = nxt.code
    return next_map


_NEXT_CODES = _compute_next_codes()


def get_definitions() -> list[dict]:
    """Return badge metadata (no ``check`` callable) for API serialisation."""
    return [
        {
            "code": a.code,
            "name": a.name,
            "description": a.description,
            "icon": a.icon,
            "metric": a.metric,
            "target": a.target,
            "group": a.group,
            "next_code": _NEXT_CODES.get(a.code),
        }
        for a in ACHIEVEMENTS
    ]


def evaluate_and_persist(now_ts: float | None = None) -> list[str]:
    """
    Run every achievement check against current stats and persist any newly earned.

    Returns the list of codes earned by THIS call (already-earned badges are skipped).
    Never raises — failures are logged and swallowed so chat never breaks because
    of an achievement bug.
    """
    newly_earned: list[str] = []
    try:
        stats = progress_tracker.stats_for_eval(now_ts=now_ts)
        already = set(progress_tracker.get_earned_codes().keys())
        for ach in ACHIEVEMENTS:
            if ach.code in already:
                continue
            try:
                predicate = COMPARATORS[ach.comparator]
                if predicate(stats, ach):
                    if progress_tracker.mark_achievement_earned(ach.code, when=now_ts):
                        newly_earned.append(ach.code)
            except Exception:
                logger.exception("Achievement check failed for code=%s", ach.code)
    except Exception:
        logger.exception("Achievement evaluation aborted")
    return newly_earned
