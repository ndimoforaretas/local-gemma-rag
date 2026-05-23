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
        }
    finally:
        conn.close()
