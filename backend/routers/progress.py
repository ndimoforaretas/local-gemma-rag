"""
Read-only API for the Learning Progress Tracker.

Endpoints
---------
- GET /api/progress/summary       — totals + current streak
- GET /api/progress/daily         — last N days breakdown (?days=30)
- GET /api/progress/breakdown     — per-mode Study Hub activity
- GET /api/progress/achievements  — every badge with earned_at (null if locked)

All endpoints are safe to call frequently; SQLite reads are <1ms.
"""

from __future__ import annotations

from fastapi import APIRouter, Query

from backend.services import achievements as ach_service
from backend.services import progress_tracker

router = APIRouter(prefix="/api/progress", tags=["Progress"])


@router.get("/summary")
def get_summary() -> dict:
    """
    Aggregate stats for the dashboard summary card.

    Returns total study seconds, session count, message count, and current
    consecutive-day streak.
    """
    return progress_tracker.get_summary()


@router.get("/daily")
def get_daily(days: int = Query(default=30, ge=1, le=365)) -> dict:
    """
    Per-day breakdown of study activity for the last ``days`` days.

    Days with no activity are included with zeros so the dashboard can render
    a continuous bar chart.
    """
    return {"days": progress_tracker.get_daily(days=days)}


@router.get("/breakdown")
def get_breakdown() -> dict:
    """
    Per-mode Study Hub activity (quizzes, workshops, flashcards, mindmaps) for
    the dashboard breakdown cards.
    """
    return progress_tracker.study_hub_breakdown()


@router.get("/achievements")
def get_achievements() -> dict:
    """
    Every defined badge with an ``earned_at`` timestamp (null when locked).

    The dashboard renders earned badges as solid and locked badges as dimmed,
    so it needs the full list — not just the earned ones.
    """
    earned = progress_tracker.get_earned_codes()
    stats = progress_tracker.stats_for_eval()
    items = []
    for defn in ach_service.get_definitions():
        metric = defn.get("metric")
        # `current` is the user's live value toward the badge's target — only
        # meaningful for metric-backed badges (binary ones stay None). Capped at
        # the target so a finished progress bar never overshoots 100%.
        current = None
        if metric is not None:
            raw = stats.get(metric, 0)
            target = defn.get("target")
            current = min(raw, target) if target is not None else raw
        items.append(
            {
                **defn,
                "earned_at": earned.get(defn["code"]),
                "is_earned": defn["code"] in earned,
                "current": current,
            }
        )
    return {"achievements": items}
