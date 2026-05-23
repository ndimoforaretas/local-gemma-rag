"""
Centralized application configuration using Pydantic Settings.

All configurable values are read from environment variables or a `.env` file,
with sensible defaults for local development. This replaces scattered
module-level constants and hardcoded values throughout the codebase.
"""

import logging
from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env file."""

    # --- LLM & Embedding ---
    llm_model: str = "gemma4:e4b"
    embedding_model: str = "embeddinggemma"
    ollama_host: str = "http://localhost:11434"

    # --- RAG Agent ---
    # Set to False to disable Gemma 4 thinking mode (faster, no reasoning panel).
    thinking_mode: bool = True

    agent_system_prompt: str = (
        "You are Gemma CogniVault AI, a precise technical assistant that answers questions "
        "using the user's indexed documents.\n"
        "A User Guide covering every app feature (uploads, ingestion, chat, citations, history, "
        "file types, keyboard shortcuts, FAQs) is pre-loaded into the knowledge base — always "
        "search it when the user asks how to use the app.\n"
        "For most questions, call search_knowledge_base first to find relevant context before answering.\n"
        "Skip the search when attachments are present or when the question is purely about general "
        "facts like maths or the current time.\n"
        "When the user's message contains attachments, process EVERY one of them — do not skip any:\n"
        "  • Images: ALWAYS describe and analyze each image visually, even when files are also attached. "
        "If no explicit instruction is given, proactively describe what you see.\n"
        "  • Files (marked '=== FILE N … ==='): read and answer from the extracted text.\n"
        "  • Mixed (images + files): cover ALL inputs — describe images first, then address file content. "
        "Never silently ignore an attachment.\n"
        "Do NOT call search_knowledge_base when attachments are present.\n"
        "Format code with triple backticks (e.g., ```python).\n"
        "IMPORTANT: Do NOT output <think> or </think> tags in your response. "
        "Output your answer directly without any XML-style reasoning tags."
    )

    # --- Vector Store ---
    index_file: str = "vector_store.faiss"
    metadata_file: str = "vector_store.json"
    categories_file: str = "categories.json"
    docs_dir: str = "docs"
    chunk_size: int = 1000
    chunk_overlap: int = 100
    embedding_batch_size: int = 5

    # --- Database (DBOS) ---
    db_url: str = "postgresql://postgres:password@localhost:5432/dbos"

    # --- Learning Progress Tracker ---
    progress_db_file: str = "progress.db"
    # Idle gap (seconds) after which a new study session begins.
    study_session_idle_gap_seconds: int = 15 * 60

    # --- Server ---
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:8000"]
    max_upload_size_mb: int = 200
    # Allow up to 5 mixed attachments (images + documents) per chat message.
    max_attachments_per_message: int = 5

    # --- Logging ---
    log_level: str = "INFO"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    """Return a cached singleton of the application settings."""
    return Settings()


def setup_logging() -> logging.Logger:
    """Configure structured logging for the application."""
    settings = get_settings()
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    return logging.getLogger("cognivault")


logger = setup_logging()
