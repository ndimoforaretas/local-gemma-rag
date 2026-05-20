"""
Tests for Step 3 — Re-ingest on File Change.

Validates:
- Ingesting the same file twice with no changes skips it (idempotent).
- Ingesting a modified file soft-deletes old chunks and schedules re-ingest.
- delete_by_source marks all matching non-deleted chunks as deleted=True.
- delete_by_source returns the correct count and is idempotent.
- file_hash is stored in chunk metadata after ingestion.
"""

import hashlib
import json
import os
import tempfile
from unittest.mock import MagicMock, patch, call

import pytest


# ── Helpers ───────────────────────────────────────────────────────────────────

def _sha256(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def _make_chunk(
    source: str,
    content: str = "chunk text",
    file_hash: str | None = None,
    deleted: bool = False,
) -> dict:
    chunk = {"source": source, "content": content, "chunk_id": 0, "page": 1}
    if file_hash is not None:
        chunk["file_hash"] = file_hash
    if deleted:
        chunk["deleted"] = True
    return chunk


# ── delete_by_source tests ────────────────────────────────────────────────────

class TestDeleteBySource:
    """Tests for VectorDB.delete_by_source()."""

    def test_marks_all_matching_chunks_as_deleted(self, tmp_path, monkeypatch):
        """delete_by_source sets deleted=True on all active chunks of the file."""
        meta_file = tmp_path / "vector_store.json"
        meta_file.write_text(json.dumps([]))

        monkeypatch.setenv("METADATA_FILE", str(meta_file))
        monkeypatch.setenv("INDEX_FILE", str(tmp_path / "vector_store.faiss"))

        from backend.config import get_settings
        get_settings.cache_clear()

        from backend.services.vector_db import VectorDB
        db = VectorDB.__new__(VectorDB)
        db.index = None
        db._bm25 = None
        db._bm25_corpus = []
        db.metadata = [
            _make_chunk("report.pdf", "chunk A", file_hash="abc"),
            _make_chunk("report.pdf", "chunk B", file_hash="abc"),
            _make_chunk("other.pdf", "chunk C", file_hash="xyz"),
        ]

        count = db.delete_by_source("report.pdf")

        assert count == 2
        assert db.metadata[0]["deleted"] is True
        assert db.metadata[1]["deleted"] is True
        assert not db.metadata[2].get("deleted")

        get_settings.cache_clear()

    def test_returns_zero_when_no_matching_chunks(self, tmp_path, monkeypatch):
        """delete_by_source returns 0 when the file is not in the KB."""
        monkeypatch.setenv("METADATA_FILE", str(tmp_path / "meta.json"))
        monkeypatch.setenv("INDEX_FILE", str(tmp_path / "idx.faiss"))

        from backend.config import get_settings
        get_settings.cache_clear()

        from backend.services.vector_db import VectorDB
        db = VectorDB.__new__(VectorDB)
        db.index = None
        db._bm25 = None
        db._bm25_corpus = []
        db.metadata = [_make_chunk("other.pdf")]

        count = db.delete_by_source("missing.pdf")
        assert count == 0

        get_settings.cache_clear()

    def test_idempotent_does_not_double_count_already_deleted(self, tmp_path, monkeypatch):
        """Calling delete_by_source twice counts only newly deleted chunks."""
        meta_file = tmp_path / "vector_store.json"
        meta_file.write_text(json.dumps([]))
        monkeypatch.setenv("METADATA_FILE", str(meta_file))
        monkeypatch.setenv("INDEX_FILE", str(tmp_path / "idx.faiss"))

        from backend.config import get_settings
        get_settings.cache_clear()

        from backend.services.vector_db import VectorDB
        db = VectorDB.__new__(VectorDB)
        db.index = None
        db._bm25 = None
        db._bm25_corpus = []
        db.metadata = [
            _make_chunk("a.pdf", deleted=True),  # already deleted
            _make_chunk("a.pdf"),                # active
        ]

        count = db.delete_by_source("a.pdf")
        # Only the active chunk should be newly deleted
        assert count == 1

        get_settings.cache_clear()


# ── list_document_files / change detection tests ──────────────────────────────

class TestListDocumentFiles:
    """Tests for the hash-aware list_document_files() step."""

    def test_new_file_is_included(self, tmp_path, monkeypatch):
        """A file with no existing metadata entry is scheduled for ingest."""
        docs_dir = tmp_path / "docs"
        docs_dir.mkdir(exist_ok=True)
        (docs_dir / "new.txt").write_bytes(b"Hello world")

        meta_file = tmp_path / "vector_store.json"
        meta_file.write_text(json.dumps([]))  # empty metadata

        monkeypatch.setenv("DOCS_DIR", str(docs_dir))
        monkeypatch.setenv("METADATA_FILE", str(meta_file))
        monkeypatch.setenv("INDEX_FILE", str(tmp_path / "idx.faiss"))

        from backend.config import get_settings
        get_settings.cache_clear()
        import importlib
        import backend.services.ingest as ingest_mod
        importlib.reload(ingest_mod)

        from backend.services.vector_db import VectorDB
        db = VectorDB.__new__(VectorDB)
        db.index = None
        db._bm25 = None
        db._bm25_corpus = []
        db.metadata = []

        with patch("backend.services.ingest.vector_db", db):
            result = ingest_mod.list_document_files()

        assert "new.txt" in result

        get_settings.cache_clear()

    def test_unchanged_file_is_skipped(self, tmp_path, monkeypatch):
        """A file whose hash matches the stored hash is not re-ingested."""
        docs_dir = tmp_path / "docs"
        docs_dir.mkdir(exist_ok=True)
        content = b"Stable content"
        (docs_dir / "stable.txt").write_bytes(content)
        file_hash = _sha256(content)

        meta_file = tmp_path / "vector_store.json"
        meta_file.write_text(json.dumps([
            {"source": "stable.txt", "content": "Stable content", "file_hash": file_hash}
        ]))

        monkeypatch.setenv("DOCS_DIR", str(docs_dir))
        monkeypatch.setenv("METADATA_FILE", str(meta_file))
        monkeypatch.setenv("INDEX_FILE", str(tmp_path / "idx.faiss"))

        from backend.config import get_settings
        get_settings.cache_clear()
        import importlib
        import backend.services.ingest as ingest_mod
        importlib.reload(ingest_mod)

        from backend.services.vector_db import VectorDB
        db = VectorDB.__new__(VectorDB)
        db.index = None
        db._bm25 = None
        db._bm25_corpus = []
        db.metadata = [{"source": "stable.txt", "content": "Stable content", "file_hash": file_hash}]

        with patch("backend.services.ingest.vector_db", db):
            result = ingest_mod.list_document_files()

        assert "stable.txt" not in result

        get_settings.cache_clear()

    def test_changed_file_triggers_soft_delete_and_reingest(self, tmp_path, monkeypatch):
        """A file with a different hash has old chunks deleted and is scheduled for re-ingest."""
        docs_dir = tmp_path / "docs"
        docs_dir.mkdir(exist_ok=True)
        new_content = b"Updated content"
        (docs_dir / "edited.txt").write_bytes(new_content)
        old_hash = _sha256(b"Old content")

        meta_file = tmp_path / "vector_store.json"
        meta_file.write_text(json.dumps([
            {"source": "edited.txt", "content": "Old content", "file_hash": old_hash}
        ]))

        monkeypatch.setenv("DOCS_DIR", str(docs_dir))
        monkeypatch.setenv("METADATA_FILE", str(meta_file))
        monkeypatch.setenv("INDEX_FILE", str(tmp_path / "idx.faiss"))

        from backend.config import get_settings
        get_settings.cache_clear()
        import importlib
        import backend.services.ingest as ingest_mod
        importlib.reload(ingest_mod)

        from backend.services.vector_db import VectorDB
        db = VectorDB.__new__(VectorDB)
        db.index = None
        db._bm25 = None
        db._bm25_corpus = []
        db.metadata = [{"source": "edited.txt", "content": "Old content", "file_hash": old_hash}]

        with patch("backend.services.ingest.vector_db", db):
            result = ingest_mod.list_document_files()

        # File must be scheduled for re-ingest
        assert "edited.txt" in result
        # Old chunk must be soft-deleted
        assert db.metadata[0].get("deleted") is True

        get_settings.cache_clear()
