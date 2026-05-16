"""
Router for chat history persistence.
"""

import json
import os
from typing import Any, List

from fastapi import APIRouter, HTTPException

from backend.config import logger
from backend.models.schemas import StatusResponse

router = APIRouter(tags=["History"])

HISTORY_FILE = "chat_history.json"

# Maximum payload size for history saves (10 MB should be generous).
_MAX_HISTORY_BYTES = 10 * 1024 * 1024


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
