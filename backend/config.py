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
        "Skip the search only when: (1) a file or image is attached — read that content directly instead, "
        "or (2) the question is purely about general facts like maths or the current time.\n"
        "When the user's message contains attached file content (marked with '=== FILE … ===') "
        "or an image, answer from that content directly — do NOT call search_knowledge_base.\n"
        "Format code with triple backticks (e.g., ```python)."
    )

    # --- Vector Store ---
    index_file: str = "vector_store.faiss"
    metadata_file: str = "vector_store.json"
    docs_dir: str = "docs"
    chunk_size: int = 1000
    chunk_overlap: int = 100
    embedding_batch_size: int = 5

    # --- Database (DBOS) ---
    db_url: str = "postgresql://postgres:password@localhost:5432/dbos"

    # --- Server ---
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:8000"]
    max_upload_size_mb: int = 200
    max_attachments_per_message: int = 1

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
