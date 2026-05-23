"""
Achievement definitions for the Learning Progress Tracker.

Each badge has:
- ``code``       — stable string ID used in storage
- ``name``       — short display label
- ``description`` — sentence shown on hover/tap in the dashboard
- ``icon``       — emoji (the dashboard renders it; can be swapped for an SVG later)
- ``check``      — predicate taking a stats dict from
                   ``progress_tracker.stats_for_eval()`` and returning bool

To add a new badge: append to ``ACHIEVEMENTS`` below. To rename one, change
``name`` only — never change ``code`` or users will lose earned badges.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Callable

from backend.services import progress_tracker

logger = logging.getLogger("cognivault.achievements")


@dataclass(frozen=True)
class Achievement:
    code: str
    name: str
    description: str
    icon: str
    check: Callable[[dict], bool]


ACHIEVEMENTS: list[Achievement] = [
    Achievement(
        code="first_question",
        name="First Question",
        description="Ask your very first question.",
        icon="🎯",
        check=lambda s: s["total_messages"] >= 1,
    ),
    Achievement(
        code="conversationalist",
        name="Conversationalist",
        description="Send 10 messages in a single day.",
        icon="💬",
        check=lambda s: s["messages_today"] >= 10,
    ),
    Achievement(
        code="hour_of_power",
        name="Hour of Power",
        description="Reach 1 hour of total study time.",
        icon="📚",
        check=lambda s: s["total_seconds"] >= 3600,
    ),
    Achievement(
        code="streak_3",
        name="3-Day Streak",
        description="Study on 3 consecutive days.",
        icon="🔥",
        check=lambda s: s["current_streak_days"] >= 3,
    ),
    Achievement(
        code="streak_7",
        name="7-Day Streak",
        description="Study on 7 consecutive days.",
        icon="🔥",
        check=lambda s: s["current_streak_days"] >= 7,
    ),
    Achievement(
        code="centurion",
        name="Centurion",
        description="Send 100 messages total.",
        icon="🏆",
        check=lambda s: s["total_messages"] >= 100,
    ),
    Achievement(
        code="night_owl",
        name="Night Owl",
        description="Study between 10pm and 4am.",
        icon="🌙",
        check=lambda s: s["local_hour"] >= 22 or s["local_hour"] < 4,
    ),
    Achievement(
        code="early_bird",
        name="Early Bird",
        description="Study between 5am and 8am.",
        icon="⏰",
        check=lambda s: 5 <= s["local_hour"] < 8,
    ),
    Achievement(
        code="curious_mind",
        name="Curious Mind",
        description="Use the document scope filter for the first time.",
        icon="🔍",
        check=lambda s: s["scope_filter_uses"] >= 1,
    ),
    Achievement(
        code="deep_diver",
        name="Deep Diver",
        description="Have a single study session of 30 minutes or more.",
        icon="🎓",
        check=lambda s: s["longest_session_seconds"] >= 30 * 60,
    ),
    # ── Quiz Mode badges (Step 4) ─────────────────────────────────────────
    Achievement(
        code="first_quiz",
        name="First Quiz",
        description="Complete your first quiz.",
        icon="🧠",
        check=lambda s: s.get("total_quizzes", 0) >= 1,
    ),
    Achievement(
        code="perfect_score",
        name="Perfect Score",
        description="Score 100% on any quiz.",
        icon="💯",
        check=lambda s: s.get("best_quiz_score", 0) >= 100,
    ),
    Achievement(
        code="advanced_scholar",
        name="Advanced Scholar",
        description="Score 80% or higher on an Advanced-level quiz.",
        icon="🎖️",
        check=lambda s: s.get("advanced_quiz_passes", 0) >= 1,
    ),
    Achievement(
        code="quiz_marathon",
        name="Quiz Marathon",
        description="Complete 10 quizzes in total.",
        icon="🏃",
        check=lambda s: s.get("total_quizzes", 0) >= 10,
    ),
    # ── Workshop Creator badges (Mode 2) ─────────────────────────────────
    Achievement(
        code="workshop_outline",
        name="Workshop Outline",
        description="Generate your first workshop.",
        icon="📋",
        check=lambda s: s.get("total_workshops_created", 0) >= 1,
    ),
    Achievement(
        code="lesson_learned",
        name="Lesson Learned",
        description="Complete your first workshop lesson.",
        icon="📖",
        check=lambda s: s.get("lessons_completed", 0) >= 1,
    ),
    Achievement(
        code="workshop_graduate",
        name="Workshop Graduate",
        description="Finish every lesson in a single workshop.",
        icon="🎓",
        check=lambda s: s.get("workshops_completed", 0) >= 1,
    ),
    Achievement(
        code="workshop_marathon",
        name="Workshop Marathon",
        description="Complete 5 workshops in total.",
        icon="📚",
        check=lambda s: s.get("workshops_completed", 0) >= 5,
    ),
]


def get_definitions() -> list[dict]:
    """Return badge metadata (no ``check`` callable) for API serialisation."""
    return [
        {
            "code": a.code,
            "name": a.name,
            "description": a.description,
            "icon": a.icon,
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
                if ach.check(stats):
                    if progress_tracker.mark_achievement_earned(ach.code, when=now_ts):
                        newly_earned.append(ach.code)
            except Exception:
                logger.exception("Achievement check failed for code=%s", ach.code)
    except Exception:
        logger.exception("Achievement evaluation aborted")
    return newly_earned
