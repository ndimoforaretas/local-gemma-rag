"""
Tests for Step 5 — Privacy Vault Audit Panel.

Validates:
- GET /api/vault/stats returns correct chunk count matching the vector store.
- Returns 0 documents / 0 chunks on an empty vault without error.
- Returns the correct total_documents count from unique sources.
- external_calls is always 0.
"""

import json
import os

import pytest


class TestVaultStats:
    """Tests for GET /api/vault/stats."""

    def test_returns_zero_counts_for_empty_vault(self, client, tmp_path, monkeypatch):
        """An empty vault returns 0 documents and 0 chunks without error."""
        # Patch settings to point to a non-existent file so no real data leaks in.
        from backend.config import get_settings
        get_settings.cache_clear()
        monkeypatch.setenv("METADATA_FILE", str(tmp_path / "empty_meta.json"))
        monkeypatch.setenv("INDEX_FILE", str(tmp_path / "empty.faiss"))
        fake_settings = get_settings()
        monkeypatch.setattr("backend.routers.knowledge.settings", fake_settings)

        resp = client.get("/api/vault/stats")
        assert resp.status_code == 200

        data = resp.json()
        assert data["total_documents"] == 0
        assert data["total_chunks"] == 0
        assert data["external_calls"] == 0

        get_settings.cache_clear()

    def test_returns_correct_chunk_count(self, client, tmp_path, monkeypatch):
        """Chunk count equals the number of active (non-deleted) metadata entries."""
        meta_file = tmp_path / "vector_store.json"
        meta_file.write_text(
            json.dumps([
                {"source": "a.pdf", "content": "chunk 1"},
                {"source": "a.pdf", "content": "chunk 2"},
                {"source": "b.txt", "content": "chunk 3"},
                {"source": "b.txt", "content": "chunk 4", "deleted": True},  # excluded
            ])
        )
        # Patch the module-level settings singleton in the router directly,
        # since get_settings() is @lru_cache and won't re-read env vars.
        from backend.config import get_settings
        get_settings.cache_clear()
        monkeypatch.setenv("METADATA_FILE", str(meta_file))
        monkeypatch.setenv("INDEX_FILE", str(tmp_path / "idx.faiss"))
        fake_settings = get_settings()
        monkeypatch.setattr("backend.routers.knowledge.settings", fake_settings)

        resp = client.get("/api/vault/stats")
        assert resp.status_code == 200

        data = resp.json()
        assert data["total_chunks"] == 3  # 4 - 1 deleted
        assert data["total_documents"] == 2  # a.pdf and b.txt

        get_settings.cache_clear()

    def test_external_calls_is_always_zero(self, client):
        """external_calls is always 0 — no third-party services used."""
        resp = client.get("/api/vault/stats")
        assert resp.status_code == 200
        assert resp.json()["external_calls"] == 0

    def test_storage_section_is_present(self, client):
        """Response includes storage paths for vector_index, metadata, documents."""
        resp = client.get("/api/vault/stats")
        assert resp.status_code == 200

        data = resp.json()
        assert "storage" in data
        storage = data["storage"]
        assert "vector_index" in storage
        assert "metadata" in storage
        assert "documents" in storage

    def test_ollama_host_is_present(self, client):
        """Response includes ollama_host."""
        resp = client.get("/api/vault/stats")
        assert resp.status_code == 200
        assert "ollama_host" in resp.json()

    def test_correct_document_count_from_unique_sources(
        self, client, tmp_path, monkeypatch
    ):
        """total_documents counts unique source filenames, not total chunks."""
        meta_file = tmp_path / "vector_store.json"
        # 5 chunks from 3 distinct sources
        chunks = [
            {"source": "report.pdf", "content": f"chunk {i}"}
            for i in range(3)
        ] + [
            {"source": "notes.txt", "content": "note content"},
            {"source": "guide.md", "content": "guide content"},
        ]
        meta_file.write_text(json.dumps(chunks))
        from backend.config import get_settings
        get_settings.cache_clear()
        monkeypatch.setenv("METADATA_FILE", str(meta_file))
        monkeypatch.setenv("INDEX_FILE", str(tmp_path / "idx.faiss"))
        fake_settings = get_settings()
        monkeypatch.setattr("backend.routers.knowledge.settings", fake_settings)

        resp = client.get("/api/vault/stats")
        assert resp.status_code == 200

        data = resp.json()
        assert data["total_documents"] == 3
        assert data["total_chunks"] == 5

        get_settings.cache_clear()
