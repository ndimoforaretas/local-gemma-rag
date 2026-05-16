"""
Shared pytest fixtures for backend tests.

These fixtures mock external dependencies (Ollama, DBOS, VectorDB)
so tests can run without any infrastructure.
"""

import json
import os
import tempfile
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def _isolate_env(tmp_path, monkeypatch):
    """
    Ensure every test runs with isolated file paths so nothing
    touches real data on disk.
    """
    monkeypatch.setenv("DOCS_DIR", str(tmp_path / "docs"))
    monkeypatch.setenv("INDEX_FILE", str(tmp_path / "vector_store.faiss"))
    monkeypatch.setenv("METADATA_FILE", str(tmp_path / "vector_store.json"))
    os.makedirs(tmp_path / "docs", exist_ok=True)


@pytest.fixture()
def client():
    """
    A FastAPI TestClient with DBOS launch mocked out so no Postgres
    connection is needed.
    """
    with patch("backend.services.ingest.dbos") as mock_dbos:
        mock_dbos.launch = MagicMock()
        from backend.main import app
        with TestClient(app) as c:
            yield c
