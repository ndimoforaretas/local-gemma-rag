"""
Learning Progress Tracker — SQLite-backed study session and achievement store.

Design
------
Study sessions are inferred from chat activity. A "session" is a contiguous
burst of user messages; an idle gap larger than
``settings.study_session_idle_gap_seconds`` starts a new one. Each message
either extends the current session (updates ``ended_at`` and bumps
``message_count``) or opens a new one.

Achievements are persisted as (code, earned_at) rows once unlocked. The
criteria themselves live in ``backend.services.achievements`` and are
evaluated against the read functions exposed here.

Thread safety
-------------
SQLite is accessed via a module-level lock to serialise writes from concurrent
requests. Reads use ``check_same_thread=False`` connections opened per call.
The DB file is tiny (one row per session, one row per badge) so contention
is negligible in practice.
"""

from __future__ import annotations

import datetime as _dt
import logging
import os
import sqlite3
import threading
from typing import Optional

from backend.config import get_settings

logger = logging.getLogger("cognivault.progress")

_settings = get_settings()
_write_lock = threading.Lock()
# Overridable for tests (monkeypatch this to point at a temp file).
_db_path_override: Optional[str] = None


# ── Connection / schema ──────────────────────────────────────────────────────


def _db_path() -> str:
    return _db_path_override or _settings.progress_db_file


def _connect() -> sqlite3.Connection:
    """Open a connection with row factory + foreign keys on."""
    conn = sqlite3.connect(_db_path(), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _init_schema(conn: sqlite3.Connection) -> None:
    """Create tables on first use. Idempotent."""
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS study_sessions (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            started_at    REAL    NOT NULL,
            ended_at      REAL    NOT NULL,
            message_count INTEGER NOT NULL DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_sessions_started
            ON study_sessions(started_at);

        CREATE TABLE IF NOT EXISTS message_events (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            sent_at             REAL    NOT NULL,
            session_id          INTEGER NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
            chat_session_id     TEXT,
            had_scope_filter    INTEGER NOT NULL DEFAULT 0,
            had_attachments     INTEGER NOT NULL DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_events_sent_at
            ON message_events(sent_at);

        CREATE TABLE IF NOT EXISTS achievements_earned (
            code       TEXT PRIMARY KEY,
            earned_at  REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS quiz_attempts (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            finished_at    REAL    NOT NULL,
            difficulty     TEXT    NOT NULL,
            num_questions  INTEGER NOT NULL,
            correct_count  INTEGER NOT NULL,
            score_pct      INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_quiz_finished_at
            ON quiz_attempts(finished_at);

        -- Workshop Creator (Mode 2) ----------------------------------------
        CREATE TABLE IF NOT EXISTS workshops (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at    REAL    NOT NULL,
            difficulty    TEXT    NOT NULL,
            scope_json    TEXT    NOT NULL,    -- JSON array of source filenames
            title         TEXT    NOT NULL,
            summary       TEXT    NOT NULL,
            outline_json  TEXT    NOT NULL,    -- key_points + objectives JSON
            completed_at  REAL                  -- set when every lesson is done
        );

        CREATE TABLE IF NOT EXISTS workshop_lessons (
            workshop_id    INTEGER NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
            lesson_idx     INTEGER NOT NULL,
            title          TEXT    NOT NULL,
            est_minutes    INTEGER NOT NULL,
            content_md     TEXT,               -- NULL until generated on demand
            completed_at   REAL,               -- NULL until user marks complete
            PRIMARY KEY (workshop_id, lesson_idx)
        );

        CREATE INDEX IF NOT EXISTS idx_workshops_created
            ON workshops(created_at);

        -- Flashcards (Mode 3) ---------------------------------------------
        CREATE TABLE IF NOT EXISTS flashcard_decks (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at    REAL    NOT NULL,
            difficulty    TEXT    NOT NULL,
            scope_json    TEXT    NOT NULL,
            title         TEXT    NOT NULL,
            card_count    INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS flashcards (
            deck_id      INTEGER NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
            card_idx     INTEGER NOT NULL,
            front        TEXT    NOT NULL,
            back         TEXT    NOT NULL,
            -- status: NULL (unmarked), 'mastered', 'review'
            status       TEXT,
            flip_count   INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (deck_id, card_idx)
        );

        CREATE INDEX IF NOT EXISTS idx_decks_created
            ON flashcard_decks(created_at);

        -- Mindmaps (Mode 4) -----------------------------------------------
        CREATE TABLE IF NOT EXISTS mindmaps (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at    REAL    NOT NULL,
            scope_json    TEXT    NOT NULL,
            depth         INTEGER NOT NULL,
            title         TEXT    NOT NULL,
            tree_json     TEXT    NOT NULL,   -- full hierarchical structure
            export_count  INTEGER NOT NULL DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_mindmaps_created
            ON mindmaps(created_at);
        """
    )
    conn.commit()


def reset_for_tests() -> None:
    """Delete the DB file. ONLY for use in tests."""
    path = _db_path()
    if os.path.exists(path):
        os.remove(path)


# ── Write path: record a user message ────────────────────────────────────────


def record_message(
    chat_session_id: Optional[str] = None,
    had_scope_filter: bool = False,
    had_attachments: bool = False,
    sent_at: Optional[float] = None,
) -> dict:
    """
    Persist a user-message event and extend / open the active study session.

    Returns a dict with the current session row + ``newly_opened`` flag,
    useful for achievement evaluators that care about session boundaries.
    """
    ts = sent_at if sent_at is not None else _dt.datetime.now().timestamp()
    gap = _settings.study_session_idle_gap_seconds

    with _write_lock:
        conn = _connect()
        try:
            _init_schema(conn)
            cur = conn.cursor()

            # Find the most recent session.
            cur.execute(
                "SELECT id, started_at, ended_at, message_count "
                "FROM study_sessions ORDER BY id DESC LIMIT 1"
            )
            last = cur.fetchone()

            newly_opened = False
            if last and (ts - last["ended_at"]) <= gap:
                # Extend the existing session.
                cur.execute(
                    "UPDATE study_sessions "
                    "SET ended_at = ?, message_count = message_count + 1 "
                    "WHERE id = ?",
                    (ts, last["id"]),
                )
                session_id = last["id"]
            else:
                # Open a new session.
                cur.execute(
                    "INSERT INTO study_sessions (started_at, ended_at, message_count) "
                    "VALUES (?, ?, 1)",
                    (ts, ts),
                )
                session_id = cur.lastrowid
                newly_opened = True

            cur.execute(
                "INSERT INTO message_events "
                "(sent_at, session_id, chat_session_id, had_scope_filter, had_attachments) "
                "VALUES (?, ?, ?, ?, ?)",
                (
                    ts,
                    session_id,
                    chat_session_id,
                    1 if had_scope_filter else 0,
                    1 if had_attachments else 0,
                ),
            )
            conn.commit()

            cur.execute(
                "SELECT id, started_at, ended_at, message_count "
                "FROM study_sessions WHERE id = ?",
                (session_id,),
            )
            row = cur.fetchone()
            return {
                "id": row["id"],
                "started_at": row["started_at"],
                "ended_at": row["ended_at"],
                "message_count": row["message_count"],
                "newly_opened": newly_opened,
            }
        finally:
            conn.close()


def create_workshop(
    difficulty: str,
    scope: list[str],
    title: str,
    summary: str,
    key_points: list[str],
    objectives: list[str],
    lessons: list[dict],  # [{title, est_minutes}, ...]
    created_at: Optional[float] = None,
) -> int:
    """Persist a fresh workshop + its lesson stubs. Returns the new workshop id."""
    import json as _json

    ts = created_at if created_at is not None else _dt.datetime.now().timestamp()
    outline = {"key_points": key_points, "objectives": objectives}
    with _write_lock:
        conn = _connect()
        try:
            _init_schema(conn)
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO workshops "
                "(created_at, difficulty, scope_json, title, summary, outline_json) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (ts, difficulty, _json.dumps(scope), title, summary, _json.dumps(outline)),
            )
            ws_id = cur.lastrowid or 0
            for idx, lesson in enumerate(lessons):
                cur.execute(
                    "INSERT INTO workshop_lessons "
                    "(workshop_id, lesson_idx, title, est_minutes) VALUES (?, ?, ?, ?)",
                    (ws_id, idx, lesson["title"], int(lesson.get("est_minutes", 5))),
                )
            conn.commit()
            return ws_id
        finally:
            conn.close()


def get_workshop(workshop_id: int) -> Optional[dict]:
    """Return the full workshop including all lesson rows, or None if missing."""
    import json as _json

    conn = _connect()
    try:
        _init_schema(conn)
        cur = conn.cursor()
        cur.execute("SELECT * FROM workshops WHERE id = ?", (workshop_id,))
        row = cur.fetchone()
        if not row:
            return None
        outline = _json.loads(row["outline_json"])
        cur.execute(
            "SELECT lesson_idx, title, est_minutes, content_md, completed_at "
            "FROM workshop_lessons WHERE workshop_id = ? ORDER BY lesson_idx",
            (workshop_id,),
        )
        lessons = [dict(r) for r in cur.fetchall()]
        return {
            "id": row["id"],
            "created_at": row["created_at"],
            "difficulty": row["difficulty"],
            "scope": _json.loads(row["scope_json"]),
            "title": row["title"],
            "summary": row["summary"],
            "key_points": outline.get("key_points", []),
            "objectives": outline.get("objectives", []),
            "completed_at": row["completed_at"],
            "lessons": lessons,
        }
    finally:
        conn.close()


def list_workshops() -> list[dict]:
    """Return all workshops with summary + completion progress, newest first."""
    conn = _connect()
    try:
        _init_schema(conn)
        cur = conn.cursor()
        cur.execute(
            "SELECT w.id, w.created_at, w.difficulty, w.title, w.summary, w.completed_at, "
            "       COUNT(l.lesson_idx) AS total_lessons, "
            "       SUM(CASE WHEN l.completed_at IS NOT NULL THEN 1 ELSE 0 END) AS completed_lessons "
            "FROM workshops w LEFT JOIN workshop_lessons l ON l.workshop_id = w.id "
            "GROUP BY w.id ORDER BY w.created_at DESC"
        )
        return [
            {
                "id": r["id"],
                "created_at": r["created_at"],
                "difficulty": r["difficulty"],
                "title": r["title"],
                "summary": r["summary"],
                "completed_at": r["completed_at"],
                "total_lessons": int(r["total_lessons"] or 0),
                "completed_lessons": int(r["completed_lessons"] or 0),
            }
            for r in cur.fetchall()
        ]
    finally:
        conn.close()


def save_lesson_content(workshop_id: int, lesson_idx: int, content_md: str) -> None:
    """Cache a generated lesson's full markdown content."""
    with _write_lock:
        conn = _connect()
        try:
            _init_schema(conn)
            conn.execute(
                "UPDATE workshop_lessons SET content_md = ? "
                "WHERE workshop_id = ? AND lesson_idx = ?",
                (content_md, workshop_id, lesson_idx),
            )
            conn.commit()
        finally:
            conn.close()


def mark_lesson_complete(workshop_id: int, lesson_idx: int) -> dict:
    """
    Mark a lesson complete (idempotent — re-marking keeps the first timestamp).
    If this completes every lesson in the workshop, also stamp workshops.completed_at.
    Returns a small summary so the caller can update achievements.
    """
    ts = _dt.datetime.now().timestamp()
    with _write_lock:
        conn = _connect()
        try:
            _init_schema(conn)
            cur = conn.cursor()
            cur.execute(
                "UPDATE workshop_lessons SET completed_at = COALESCE(completed_at, ?) "
                "WHERE workshop_id = ? AND lesson_idx = ?",
                (ts, workshop_id, lesson_idx),
            )
            cur.execute(
                "SELECT COUNT(*) AS total, "
                "       SUM(CASE WHEN completed_at IS NOT NULL THEN 1 ELSE 0 END) AS done "
                "FROM workshop_lessons WHERE workshop_id = ?",
                (workshop_id,),
            )
            row = cur.fetchone()
            total = int(row["total"] or 0)
            done = int(row["done"] or 0)
            workshop_completed = total > 0 and done >= total
            if workshop_completed:
                cur.execute(
                    "UPDATE workshops SET completed_at = COALESCE(completed_at, ?) WHERE id = ?",
                    (ts, workshop_id),
                )
            conn.commit()
            return {
                "lessons_total": total,
                "lessons_done": done,
                "workshop_completed": workshop_completed,
            }
        finally:
            conn.close()


def delete_workshop(workshop_id: int) -> bool:
    """Remove a workshop + its lessons. Returns True if a row was deleted."""
    with _write_lock:
        conn = _connect()
        try:
            _init_schema(conn)
            cur = conn.cursor()
            cur.execute("DELETE FROM workshops WHERE id = ?", (workshop_id,))
            conn.commit()
            return cur.rowcount > 0
        finally:
            conn.close()


def create_flashcard_deck(
    difficulty: str,
    scope: list[str],
    title: str,
    cards: list[dict],  # [{front, back}, ...]
    created_at: Optional[float] = None,
) -> int:
    """Persist a fresh deck and its cards. Returns the new deck id."""
    import json as _json

    ts = created_at if created_at is not None else _dt.datetime.now().timestamp()
    with _write_lock:
        conn = _connect()
        try:
            _init_schema(conn)
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO flashcard_decks "
                "(created_at, difficulty, scope_json, title, card_count) "
                "VALUES (?, ?, ?, ?, ?)",
                (ts, difficulty, _json.dumps(scope), title, len(cards)),
            )
            deck_id = cur.lastrowid or 0
            for idx, card in enumerate(cards):
                cur.execute(
                    "INSERT INTO flashcards (deck_id, card_idx, front, back) "
                    "VALUES (?, ?, ?, ?)",
                    (deck_id, idx, card["front"], card["back"]),
                )
            conn.commit()
            return deck_id
        finally:
            conn.close()


def get_flashcard_deck(deck_id: int) -> Optional[dict]:
    """Return the deck + all its cards, or None if missing."""
    import json as _json

    conn = _connect()
    try:
        _init_schema(conn)
        cur = conn.cursor()
        cur.execute("SELECT * FROM flashcard_decks WHERE id = ?", (deck_id,))
        row = cur.fetchone()
        if not row:
            return None
        cur.execute(
            "SELECT card_idx, front, back, status, flip_count "
            "FROM flashcards WHERE deck_id = ? ORDER BY card_idx",
            (deck_id,),
        )
        cards = [dict(r) for r in cur.fetchall()]
        return {
            "id": row["id"],
            "created_at": row["created_at"],
            "difficulty": row["difficulty"],
            "scope": _json.loads(row["scope_json"]),
            "title": row["title"],
            "card_count": row["card_count"],
            "cards": cards,
        }
    finally:
        conn.close()


def list_flashcard_decks() -> list[dict]:
    """All decks with mastered-count progress, newest first."""
    conn = _connect()
    try:
        _init_schema(conn)
        cur = conn.cursor()
        cur.execute(
            "SELECT d.id, d.created_at, d.difficulty, d.title, d.card_count, "
            "       SUM(CASE WHEN c.status = 'mastered' THEN 1 ELSE 0 END) AS mastered_count "
            "FROM flashcard_decks d LEFT JOIN flashcards c ON c.deck_id = d.id "
            "GROUP BY d.id ORDER BY d.created_at DESC"
        )
        return [
            {
                "id": r["id"],
                "created_at": r["created_at"],
                "difficulty": r["difficulty"],
                "title": r["title"],
                "card_count": int(r["card_count"] or 0),
                "mastered_count": int(r["mastered_count"] or 0),
            }
            for r in cur.fetchall()
        ]
    finally:
        conn.close()


def set_flashcard_status(deck_id: int, card_idx: int, status: Optional[str]) -> None:
    """Set status to 'mastered', 'review', or None (unmarked)."""
    if status not in (None, "mastered", "review"):
        raise ValueError(f"Invalid status: {status!r}")
    with _write_lock:
        conn = _connect()
        try:
            _init_schema(conn)
            conn.execute(
                "UPDATE flashcards SET status = ? WHERE deck_id = ? AND card_idx = ?",
                (status, deck_id, card_idx),
            )
            conn.commit()
        finally:
            conn.close()


def increment_flashcard_flip(deck_id: int, card_idx: int) -> None:
    """Bump the flip_count for a card. Used by the "Card Reviewer" badge."""
    with _write_lock:
        conn = _connect()
        try:
            _init_schema(conn)
            conn.execute(
                "UPDATE flashcards SET flip_count = flip_count + 1 "
                "WHERE deck_id = ? AND card_idx = ?",
                (deck_id, card_idx),
            )
            conn.commit()
        finally:
            conn.close()


def delete_flashcard_deck(deck_id: int) -> bool:
    """Remove a deck + cascade its cards. Returns True if a row was deleted."""
    with _write_lock:
        conn = _connect()
        try:
            _init_schema(conn)
            cur = conn.cursor()
            cur.execute("DELETE FROM flashcard_decks WHERE id = ?", (deck_id,))
            conn.commit()
            return cur.rowcount > 0
        finally:
            conn.close()


def create_mindmap(
    scope: list[str],
    depth: int,
    title: str,
    tree: dict,
    created_at: Optional[float] = None,
) -> int:
    """Persist a generated mindmap. `tree` is stored as JSON verbatim."""
    import json as _json

    ts = created_at if created_at is not None else _dt.datetime.now().timestamp()
    with _write_lock:
        conn = _connect()
        try:
            _init_schema(conn)
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO mindmaps "
                "(created_at, scope_json, depth, title, tree_json) "
                "VALUES (?, ?, ?, ?, ?)",
                (ts, _json.dumps(scope), depth, title, _json.dumps(tree)),
            )
            conn.commit()
            return cur.lastrowid or 0
        finally:
            conn.close()


def get_mindmap(mindmap_id: int) -> Optional[dict]:
    """Return a single mindmap row with the parsed tree, or None if missing."""
    import json as _json

    conn = _connect()
    try:
        _init_schema(conn)
        cur = conn.cursor()
        cur.execute("SELECT * FROM mindmaps WHERE id = ?", (mindmap_id,))
        row = cur.fetchone()
        if not row:
            return None
        return {
            "id": row["id"],
            "created_at": row["created_at"],
            "scope": _json.loads(row["scope_json"]),
            "depth": row["depth"],
            "title": row["title"],
            "tree": _json.loads(row["tree_json"]),
            "export_count": int(row["export_count"] or 0),
        }
    finally:
        conn.close()


def list_mindmaps() -> list[dict]:
    """All mindmaps, newest first, with summary fields only (no full tree)."""
    conn = _connect()
    try:
        _init_schema(conn)
        cur = conn.cursor()
        cur.execute(
            "SELECT id, created_at, depth, title, export_count "
            "FROM mindmaps ORDER BY created_at DESC"
        )
        return [
            {
                "id": r["id"],
                "created_at": r["created_at"],
                "depth": r["depth"],
                "title": r["title"],
                "export_count": int(r["export_count"] or 0),
            }
            for r in cur.fetchall()
        ]
    finally:
        conn.close()


def increment_mindmap_export(mindmap_id: int) -> None:
    """Bump export_count — powers the Cartographer badge."""
    with _write_lock:
        conn = _connect()
        try:
            _init_schema(conn)
            conn.execute(
                "UPDATE mindmaps SET export_count = export_count + 1 WHERE id = ?",
                (mindmap_id,),
            )
            conn.commit()
        finally:
            conn.close()


def delete_mindmap(mindmap_id: int) -> bool:
    """Hard-delete a mindmap. Returns True if a row was deleted."""
    with _write_lock:
        conn = _connect()
        try:
            _init_schema(conn)
            cur = conn.cursor()
            cur.execute("DELETE FROM mindmaps WHERE id = ?", (mindmap_id,))
            conn.commit()
            return cur.rowcount > 0
        finally:
            conn.close()


def record_quiz_attempt(
    difficulty: str,
    num_questions: int,
    correct_count: int,
    score_pct: int,
    finished_at: Optional[float] = None,
) -> int:
    """Persist a finished quiz attempt. Returns the new row id."""
    ts = finished_at if finished_at is not None else _dt.datetime.now().timestamp()
    with _write_lock:
        conn = _connect()
        try:
            _init_schema(conn)
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO quiz_attempts "
                "(finished_at, difficulty, num_questions, correct_count, score_pct) "
                "VALUES (?, ?, ?, ?, ?)",
                (ts, difficulty, num_questions, correct_count, score_pct),
            )
            conn.commit()
            return cur.lastrowid or 0
        finally:
            conn.close()


def mark_achievement_earned(code: str, when: Optional[float] = None) -> bool:
    """Persist an earned badge. Returns True if newly inserted, False if already earned."""
    ts = when if when is not None else _dt.datetime.now().timestamp()
    with _write_lock:
        conn = _connect()
        try:
            _init_schema(conn)
            cur = conn.cursor()
            cur.execute(
                "INSERT OR IGNORE INTO achievements_earned (code, earned_at) VALUES (?, ?)",
                (code, ts),
            )
            conn.commit()
            return cur.rowcount > 0
        finally:
            conn.close()


# ── Read path: summary, daily breakdown, earned badges ───────────────────────


def get_summary() -> dict:
    """
    Aggregate stats for the dashboard summary card.

    Returns
    -------
    {
        "total_seconds": int,
        "total_sessions": int,
        "total_messages": int,
        "current_streak_days": int,
    }
    """
    conn = _connect()
    try:
        _init_schema(conn)
        cur = conn.cursor()

        cur.execute(
            "SELECT "
            "  COALESCE(SUM(ended_at - started_at), 0) AS total_seconds, "
            "  COUNT(*) AS total_sessions, "
            "  COALESCE(SUM(message_count), 0) AS total_messages "
            "FROM study_sessions"
        )
        row = cur.fetchone()
        total_seconds = int(row["total_seconds"] or 0)
        total_sessions = int(row["total_sessions"] or 0)
        total_messages = int(row["total_messages"] or 0)

        streak = _current_streak_days(conn)
        return {
            "total_seconds": total_seconds,
            "total_sessions": total_sessions,
            "total_messages": total_messages,
            "current_streak_days": streak,
        }
    finally:
        conn.close()


def study_hub_breakdown() -> dict:
    """
    Per-mode Study Hub activity for the dashboard breakdown cards.

    Returns
    -------
    {
        "quizzes":    {"count": int, "avg_score": int, "best_score": int},
        "workshops":  {"created": int, "completed": int},
        "flashcards": {"decks": int, "mastered": int},
        "mindmaps":   {"created": int, "exports": int},
    }

    ``avg_score`` / ``best_score`` are whole percentages (0 when no quizzes).
    """
    conn = _connect()
    try:
        _init_schema(conn)
        cur = conn.cursor()

        cur.execute(
            "SELECT COUNT(*) AS n, "
            "       COALESCE(AVG(score_pct), 0) AS avg_score, "
            "       COALESCE(MAX(score_pct), 0) AS best_score "
            "FROM quiz_attempts"
        )
        q = cur.fetchone()

        cur.execute(
            "SELECT COUNT(*) AS created, "
            "       COALESCE(SUM(CASE WHEN completed_at IS NOT NULL THEN 1 ELSE 0 END), 0) AS completed "
            "FROM workshops"
        )
        w = cur.fetchone()

        cur.execute("SELECT COUNT(*) AS decks FROM flashcard_decks")
        decks = int(cur.fetchone()["decks"] or 0)
        cur.execute(
            "SELECT COUNT(*) AS n FROM ("
            "  SELECT d.id FROM flashcard_decks d "
            "  LEFT JOIN flashcards c ON c.deck_id = d.id "
            "  GROUP BY d.id "
            "  HAVING COUNT(c.card_idx) > 0 "
            "     AND COUNT(c.card_idx) = SUM(CASE WHEN c.status='mastered' THEN 1 ELSE 0 END)"
            ")"
        )
        mastered = int(cur.fetchone()["n"] or 0)

        cur.execute(
            "SELECT COUNT(*) AS created, "
            "       COALESCE(SUM(export_count), 0) AS exports "
            "FROM mindmaps"
        )
        m = cur.fetchone()

        return {
            "quizzes": {
                "count": int(q["n"] or 0),
                "avg_score": round(float(q["avg_score"] or 0)),
                "best_score": int(q["best_score"] or 0),
            },
            "workshops": {
                "created": int(w["created"] or 0),
                "completed": int(w["completed"] or 0),
            },
            "flashcards": {"decks": decks, "mastered": mastered},
            "mindmaps": {
                "created": int(m["created"] or 0),
                "exports": int(m["exports"] or 0),
            },
        }
    finally:
        conn.close()


def _current_streak_days(conn: sqlite3.Connection) -> int:
    """
    Days of consecutive activity counting backwards from today (local time).

    Today with zero activity but yesterday with activity = streak 0 (until today
    has activity). Today with activity + yesterday with activity = streak 2, etc.
    """
    cur = conn.cursor()
    cur.execute("SELECT started_at FROM study_sessions ORDER BY started_at DESC")
    rows = cur.fetchall()
    if not rows:
        return 0

    active_days = {
        _dt.date.fromtimestamp(r["started_at"]).isoformat() for r in rows
    }
    today = _dt.date.today()
    streak = 0
    cursor_day = today
    while cursor_day.isoformat() in active_days:
        streak += 1
        cursor_day -= _dt.timedelta(days=1)
    return streak


def get_daily(days: int = 30) -> list[dict]:
    """
    Return per-day breakdown for the last ``days`` days (inclusive of today).

    Each entry: { "date": "YYYY-MM-DD", "seconds": int, "message_count": int,
                  "session_count": int }
    Days with no activity are included with zeros so the dashboard can render
    a continuous bar chart.
    """
    if days <= 0:
        return []

    conn = _connect()
    try:
        _init_schema(conn)
        cur = conn.cursor()
        cur.execute(
            "SELECT started_at, ended_at, message_count FROM study_sessions"
        )
        sessions = cur.fetchall()
    finally:
        conn.close()

    today = _dt.date.today()
    by_day: dict[str, dict] = {}
    for i in range(days):
        d = today - _dt.timedelta(days=i)
        by_day[d.isoformat()] = {
            "date": d.isoformat(),
            "seconds": 0,
            "message_count": 0,
            "session_count": 0,
        }

    for s in sessions:
        day_key = _dt.date.fromtimestamp(s["started_at"]).isoformat()
        if day_key not in by_day:
            continue
        by_day[day_key]["seconds"] += int(s["ended_at"] - s["started_at"])
        by_day[day_key]["message_count"] += int(s["message_count"])
        by_day[day_key]["session_count"] += 1

    return sorted(by_day.values(), key=lambda x: x["date"])


def get_earned_codes() -> dict[str, float]:
    """Return {code: earned_at_timestamp} for every unlocked badge."""
    conn = _connect()
    try:
        _init_schema(conn)
        cur = conn.cursor()
        cur.execute("SELECT code, earned_at FROM achievements_earned")
        return {row["code"]: row["earned_at"] for row in cur.fetchall()}
    finally:
        conn.close()


# ── Stats used by achievement evaluators ─────────────────────────────────────


def stats_for_eval(now_ts: Optional[float] = None) -> dict:
    """
    Snapshot of the current numbers the achievement checks need.

    Bundling them into one read avoids each check_fn opening its own connection.
    """
    ts = now_ts if now_ts is not None else _dt.datetime.now().timestamp()
    conn = _connect()
    try:
        _init_schema(conn)
        cur = conn.cursor()

        cur.execute(
            "SELECT COALESCE(SUM(ended_at - started_at), 0) AS total_seconds, "
            "       COALESCE(SUM(message_count), 0) AS total_messages "
            "FROM study_sessions"
        )
        row = cur.fetchone()
        total_seconds = int(row["total_seconds"] or 0)
        total_messages = int(row["total_messages"] or 0)

        cur.execute(
            "SELECT MAX(ended_at - started_at) AS longest FROM study_sessions"
        )
        longest_session_seconds = int(cur.fetchone()["longest"] or 0)

        # Messages today (local date).
        start_of_day = _dt.datetime.combine(
            _dt.date.today(), _dt.time.min
        ).timestamp()
        cur.execute(
            "SELECT COUNT(*) AS n FROM message_events WHERE sent_at >= ?",
            (start_of_day,),
        )
        messages_today = int(cur.fetchone()["n"] or 0)

        cur.execute(
            "SELECT COUNT(*) AS n FROM message_events WHERE had_scope_filter = 1"
        )
        scope_filter_uses = int(cur.fetchone()["n"] or 0)

        streak = _current_streak_days(conn)
        local_hour = _dt.datetime.fromtimestamp(ts).hour

        # ── Quiz stats ───────────────────────────────────────────────────
        cur.execute("SELECT COUNT(*) AS n FROM quiz_attempts")
        total_quizzes = int(cur.fetchone()["n"] or 0)

        cur.execute(
            "SELECT MAX(score_pct) AS top FROM quiz_attempts"
        )
        best_quiz_score = int(cur.fetchone()["top"] or 0)

        cur.execute(
            "SELECT COUNT(*) AS n FROM quiz_attempts "
            "WHERE difficulty = 'advanced' AND score_pct >= 80"
        )
        advanced_passes = int(cur.fetchone()["n"] or 0)

        # ── Workshop stats ─────────────────────────────────────────────
        cur.execute("SELECT COUNT(*) AS n FROM workshops")
        total_workshops_created = int(cur.fetchone()["n"] or 0)

        cur.execute(
            "SELECT COUNT(*) AS n FROM workshops WHERE completed_at IS NOT NULL"
        )
        workshops_completed = int(cur.fetchone()["n"] or 0)

        cur.execute(
            "SELECT COUNT(*) AS n FROM workshop_lessons WHERE completed_at IS NOT NULL"
        )
        lessons_completed = int(cur.fetchone()["n"] or 0)

        # ── Flashcard stats ─────────────────────────────────────────────
        cur.execute("SELECT COUNT(*) AS n FROM flashcard_decks")
        total_decks_created = int(cur.fetchone()["n"] or 0)

        cur.execute("SELECT COALESCE(SUM(flip_count), 0) AS n FROM flashcards")
        total_card_flips = int(cur.fetchone()["n"] or 0)

        # A deck is "mastered" when every card in it is marked status='mastered'.
        cur.execute(
            "SELECT COUNT(*) AS n FROM ("
            "  SELECT d.id "
            "  FROM flashcard_decks d "
            "  LEFT JOIN flashcards c ON c.deck_id = d.id "
            "  GROUP BY d.id "
            "  HAVING COUNT(c.card_idx) > 0 "
            "     AND COUNT(c.card_idx) = SUM(CASE WHEN c.status='mastered' THEN 1 ELSE 0 END)"
            ")"
        )
        decks_mastered = int(cur.fetchone()["n"] or 0)

        # ── Mindmap stats ─────────────────────────────────────────────────
        cur.execute("SELECT COUNT(*) AS n FROM mindmaps")
        total_mindmaps = int(cur.fetchone()["n"] or 0)

        cur.execute("SELECT COALESCE(SUM(export_count), 0) AS n FROM mindmaps")
        total_mindmap_exports = int(cur.fetchone()["n"] or 0)

        return {
            "total_seconds": total_seconds,
            "total_messages": total_messages,
            "longest_session_seconds": longest_session_seconds,
            "messages_today": messages_today,
            "scope_filter_uses": scope_filter_uses,
            "current_streak_days": streak,
            "local_hour": local_hour,
            "total_quizzes": total_quizzes,
            "best_quiz_score": best_quiz_score,
            "advanced_quiz_passes": advanced_passes,
            "total_workshops_created": total_workshops_created,
            "workshops_completed": workshops_completed,
            "lessons_completed": lessons_completed,
            "total_decks_created": total_decks_created,
            "total_card_flips": total_card_flips,
            "decks_mastered": decks_mastered,
            "total_mindmaps": total_mindmaps,
            "total_mindmap_exports": total_mindmap_exports,
        }
    finally:
        conn.close()
