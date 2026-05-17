"""
Router for chat history persistence.
"""

import json
import os
import re
from typing import Any, List

from fastapi import APIRouter, HTTPException

from backend.config import logger
from backend.models.schemas import StatusResponse

router = APIRouter(tags=["History"])

HISTORY_FILE = "chat_history.json"

# Maximum payload size for history saves (10 MB should be generous).
_MAX_HISTORY_BYTES = 10 * 1024 * 1024
_SESSION_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,100}$")


def _validate_session_id(session_id: str) -> str:
    """Validate session id format to reject malformed or unsafe identifiers."""
    if not _SESSION_ID_PATTERN.fullmatch(session_id):
        raise HTTPException(status_code=400, detail="Invalid session id format")
    return session_id


@router.get("/api/history")
async def get_history():
    """Retrieve multi-session chat history from the local JSON file."""
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            logger.warning("Corrupt or unreadable history file — returning empty")
            return []
    return []


@router.post("/api/history", response_model=StatusResponse)
async def save_history(messages: List[Any]):
    """
    Persist the full session list to the local JSON file.

    Rejects payloads exceeding 10 MB to prevent accidental or
    malicious memory exhaustion.
    """
    # Rough size check using sys.getsizeof on the serialised form.
    payload = json.dumps(messages)
    if len(payload) > _MAX_HISTORY_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"History payload too large ({len(payload)} bytes, max {_MAX_HISTORY_BYTES})",
        )

    try:
        with open(HISTORY_FILE, "w") as f:
            f.write(payload)
        return StatusResponse(status="success")
    except IOError:
        logger.exception("Failed to write history file")
        raise HTTPException(status_code=500, detail="Could not persist history")


@router.delete("/api/history/{session_id}", response_model=StatusResponse)
async def delete_history_session(session_id: str):
    """Delete a single chat session by id from the persisted history list."""
    safe_session_id = _validate_session_id(session_id)

    if not os.path.exists(HISTORY_FILE):
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        with open(HISTORY_FILE, "r") as f:
            history = json.load(f)
    except (json.JSONDecodeError, IOError):
        logger.exception("Failed to read history file before deletion")
        raise HTTPException(status_code=500, detail="Could not read history")

    if not isinstance(history, list):
        raise HTTPException(status_code=500, detail="Corrupt history format")

    original_len = len(history)
    next_history = [
        session
        for session in history
        if not (isinstance(session, dict) and session.get("id") == safe_session_id)
    ]

    if len(next_history) == original_len:
        raise HTTPException(status_code=404, detail="Session not found")

    payload = json.dumps(next_history)
    if len(payload) > _MAX_HISTORY_BYTES:
        raise HTTPException(
            status_code=500,
            detail="History payload exceeded maximum size after deletion",
        )

    try:
        with open(HISTORY_FILE, "w") as f:
            f.write(payload)
    except IOError:
        logger.exception("Failed to write history file after deletion")
        raise HTTPException(status_code=500, detail="Could not persist history")

    return StatusResponse(status="success")
