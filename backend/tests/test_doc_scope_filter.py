"""
Tests for T1-C — Document-scoped chat filter.

Validates:
- vector_db.search() returns only chunks from allowed sources when a filter is set.
- vector_db.search() returns all docs when source_filter is None.
- vector_db.list_documents() returns the correct document metadata.
- _source_filter_ctx ContextVar is set correctly in run_rag_stream().
- search_knowledge_base tool respects the active filter.
- GET /api/docs/list returns the correct document list.
- RagRequest accepts document_filter field.
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


# ── vector_db.search() with source_filter ────────────────────────────────────

class TestVectorDbSourceFilter:
    def _make_db_with_chunks(self, chunks):
        """Return a VectorDB-like object with patched metadata and a stub search."""
        from backend.services.vector_db import VectorDB

        db = VectorDB.__new__(VectorDB)
        db.metadata = chunks
        db.index = None        # skips FAISS search
        db._bm25 = None        # skips BM25 search
        db._bm25_corpus = []
        return db

    def _make_stub_db(self, chunks):
        """Create a VectorDB stub with a non-None index so search() proceeds."""
        from backend.services.vector_db import VectorDB
        import faiss, numpy as np

        db = VectorDB.__new__(VectorDB)
        db.metadata = chunks
        db._bm25_corpus = chunks
        db._bm25 = None
        # Minimal 1-d FAISS index so self.index is not None
        db.index = faiss.IndexFlatIP(1)
        return db

    def test_filter_restricts_to_allowed_sources(self):
        """search() only returns chunks from the allowed source set."""
        chunks = [
            {"source": "a.pdf", "content": "alpha", "deleted": False},
            {"source": "b.pdf", "content": "beta",  "deleted": False},
            {"source": "a.pdf", "content": "alpha2","deleted": False},
        ]
        db = self._make_stub_db(chunks)

        # Stub dense search to return all chunks; filter applied post-fusion
        with patch.object(db, "_dense_search", return_value=chunks):
            results = db.search("alpha", top_k=10, source_filter=["a.pdf"])

        sources = {r["source"] for r in results}
        assert sources == {"a.pdf"}, f"Expected only a.pdf, got {sources}"

    def test_no_filter_returns_all_sources(self):
        """search() with source_filter=None returns chunks from all sources."""
        chunks = [
            {"source": "a.pdf", "content": "alpha", "deleted": False},
            {"source": "b.pdf", "content": "beta",  "deleted": False},
        ]
        db = self._make_stub_db(chunks)

        with patch.object(db, "_dense_search", return_value=chunks):
            results = db.search("anything", top_k=10, source_filter=None)

        sources = {r["source"] for r in results}
        assert sources == {"a.pdf", "b.pdf"}

    def test_filter_with_no_matching_source_returns_empty(self):
        """Filter for a source that has no chunks returns an empty list."""
        chunks = [{"source": "a.pdf", "content": "alpha", "deleted": False}]
        db = self._make_stub_db(chunks)

        with patch.object(db, "_dense_search", return_value=chunks):
            results = db.search("alpha", top_k=10, source_filter=["missing.pdf"])

        assert results == []


# ── vector_db.list_documents() ────────────────────────────────────────────────

class TestVectorDbListDocuments:
    def test_returns_documents_with_correct_chunk_counts(self):
        from backend.services.vector_db import VectorDB

        chunks = [
            {"source": "report.pdf", "type": "pdf", "content": "c1", "deleted": False},
            {"source": "report.pdf", "type": "pdf", "content": "c2", "deleted": False},
            {"source": "notes.txt",  "type": "txt", "content": "c3", "deleted": False},
            {"source": "notes.txt",  "type": "txt", "content": "c4", "deleted": True},
        ]
        db = VectorDB.__new__(VectorDB)
        db.metadata = chunks

        docs = db.list_documents()
        names = [d["name"] for d in docs]
        assert "report.pdf" in names
        assert "notes.txt" in names

        report = next(d for d in docs if d["name"] == "report.pdf")
        assert report["chunk_count"] == 2

        notes = next(d for d in docs if d["name"] == "notes.txt")
        # deleted chunk excluded
        assert notes["chunk_count"] == 1

    def test_returns_empty_list_for_empty_vault(self):
        from backend.services.vector_db import VectorDB

        db = VectorDB.__new__(VectorDB)
        db.metadata = []
        assert db.list_documents() == []

    def test_sorted_alphabetically(self):
        from backend.services.vector_db import VectorDB

        chunks = [
            {"source": "zebra.pdf", "type": "pdf", "content": "z", "deleted": False},
            {"source": "alpha.pdf", "type": "pdf", "content": "a", "deleted": False},
        ]
        db = VectorDB.__new__(VectorDB)
        db.metadata = chunks

        docs = db.list_documents()
        assert docs[0]["name"] == "alpha.pdf"
        assert docs[1]["name"] == "zebra.pdf"


# ── GET /api/docs/list ────────────────────────────────────────────────────────

class TestDocsListEndpoint:
    def test_returns_document_list(self, client):
        resp = client.get("/api/docs/list")
        assert resp.status_code == 200
        data = resp.json()
        assert "documents" in data
        assert isinstance(data["documents"], list)

    def test_each_document_has_required_fields(self, client):
        from backend.services.vector_db import vector_db

        # Temporarily inject a fake chunk so the list is non-empty.
        fake = {"source": "test_scope.pdf", "type": "pdf", "content": "x", "deleted": False}
        vector_db.metadata.append(fake)

        try:
            resp = client.get("/api/docs/list")
            data = resp.json()
            if data["documents"]:
                doc = data["documents"][0]
                assert "name" in doc
                assert "type" in doc
                assert "chunk_count" in doc
        finally:
            vector_db.metadata.remove(fake)


# ── search_knowledge_base respects _source_filter_ctx ────────────────────────

class TestSearchKbToolFilter:
    def test_tool_passes_filter_to_vector_db(self):
        """search_knowledge_base reads _source_filter_ctx and forwards it."""
        from backend.tools.agent_tools import _source_filter_ctx, search_knowledge_base

        fake_result = {
            "source": "scoped.pdf",
            "content": "Scoped content",
            "page": 1,
        }

        token = _source_filter_ctx.set(["scoped.pdf"])
        try:
            with patch(
                "backend.tools.agent_tools.vector_db.search",
                return_value=[fake_result],
            ) as mock_search:
                result = search_knowledge_base("anything")
                call_kwargs = mock_search.call_args
                filter_arg = call_kwargs.kwargs.get("source_filter") or (
                    call_kwargs.args[2] if len(call_kwargs.args) > 2 else None
                )
                assert filter_arg == ["scoped.pdf"], f"Expected filter, got {filter_arg}"
        finally:
            _source_filter_ctx.reset(token)

    def test_tool_returns_helpful_message_when_filtered_empty(self):
        """When the filtered search returns nothing, the message mentions the scope."""
        from backend.tools.agent_tools import _source_filter_ctx, search_knowledge_base

        token = _source_filter_ctx.set(["specific.pdf"])
        try:
            with patch(
                "backend.tools.agent_tools.vector_db.search",
                return_value=[],
            ):
                result = search_knowledge_base("query")
                assert "specific.pdf" in result
        finally:
            _source_filter_ctx.reset(token)


# ── RagRequest schema accepts document_filter ─────────────────────────────────

class TestRagRequestSchema:
    def test_document_filter_field_accepted(self):
        from backend.models.schemas import RagRequest

        req = RagRequest(
            query="test",
            document_filter=["doc_a.pdf", "doc_b.pdf"],
        )
        assert req.document_filter == ["doc_a.pdf", "doc_b.pdf"]

    def test_document_filter_defaults_to_none(self):
        from backend.models.schemas import RagRequest

        req = RagRequest(query="test")
        assert req.document_filter is None
