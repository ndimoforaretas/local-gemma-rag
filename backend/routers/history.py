"""
Router for chat history persistence.
"""

import json
import os
from typing import Any, List

from fastapi import APIRouter

from backend.config import logger

router = APIRouter(tags=["History"])

HISTORY_FILE = "chat_history.json"


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


@router.post("/api/history")
async def save_history(messages: List[Any]):
    """Persist the full session list to the local JSON file."""
    try:
        with open(HISTORY_FILE, "w") as f:
            json.dump(messages, f)
        return {"status": "success"}
    except IOError:
        logger.exception("Failed to write history file")
        return {"status": "error", "detail": "Could not persist history"}
