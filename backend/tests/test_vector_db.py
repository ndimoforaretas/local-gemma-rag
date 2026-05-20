"""
Tests for VectorDB hybrid retrieval (BM25 + FAISS + RRF).

These tests exercise the pure-Python logic — BM25 search, RRF fusion,
and the graceful fallback paths — without requiring Ollama or a live
FAISS index on disk.
"""

import pytest
from unittest.mock import MagicMock, patch
from backend.services.vector_db import VectorDB


# ── Fixtures ──────────────────────────────────────────────────────────────────

def _make_chunk(source: str, chunk_id: int, page: int, text: str) -> dict:
    return {"source": source, "chunk_id": chunk_id, "page": page, "text": text}


CORPUS = [
    _make_chunk("budget.pdf",   0, 1, "The Q3 total budget is 1420000 dollars for operations"),
    _make_chunk("budget.pdf",   1, 2, "Capital expenditure forecast for Q4 is 320000 dollars"),
    _make_chunk("policy.pdf",   0, 1, "Employees must submit expense reports within 30 days"),
    _make_chunk("policy.pdf",   1, 2, "Remote work policy allows two days per week from home"),
    _make_chunk("contract.pdf", 0, 1, "Vendor agreement expires on December 31 2025"),
]


@pytest.fixture
def empty_db():
    """VectorDB with no FAISS index and no metadata (fresh state)."""
    with patch.object(VectorDB, "_load", lambda self: None):
        db = VectorDB()
        db.index = None
        db.metadata = []
        db._bm25 = None
        db._bm25_corpus = []
    return db


@pytest.fixture
def loaded_db(empty_db):
    """VectorDB pre-loaded with CORPUS and a BM25 index."""
    empty_db.metadata = CORPUS.copy()
    empty_db._build_bm25()
    return empty_db


# ── BM25 index construction ───────────────────────────────────────────────────

class TestBM25Build:
    def test_bm25_built_from_active_chunks(self, loaded_db):
        assert loaded_db._bm25 is not None
        assert len(loaded_db._bm25_corpus) == len(CORPUS)

    def test_bm25_excludes_deleted_chunks(self, empty_db):
        corpus = CORPUS.copy()
        corpus[0] = {**corpus[0], "deleted": True}
        empty_db.metadata = corpus
        empty_db._build_bm25()
        assert len(empty_db._bm25_corpus) == len(CORPUS) - 1

    def test_empty_metadata_yields_none_bm25(self, empty_db):
        empty_db.metadata = []
        empty_db._build_bm25()
        assert empty_db._bm25 is None
        assert empty_db._bm25_corpus == []


# ── BM25 search ──────────────────────────────────────────────────────────────

class TestBM25Search:
    def test_keyword_match_returns_relevant_chunk(self, loaded_db):
        results = loaded_db._bm25_search("budget", top_k=3)
        sources = [r["source"] for r in results]
        assert "budget.pdf" in sources

    def test_exact_term_ranks_first(self, loaded_db):
        results = loaded_db._bm25_search("expense reports", top_k=5)
        assert results[0]["source"] == "policy.pdf"

    def test_unrelated_query_returns_empty(self, loaded_db):
        results = loaded_db._bm25_search("xyzzy quantum flux capacitor", top_k=5)
        assert results == []

    def test_top_k_respected(self, loaded_db):
        results = loaded_db._bm25_search("the", top_k=2)
        assert len(results) <= 2

    def test_no_bm25_index_returns_empty(self, empty_db):
        results = empty_db._bm25_search("anything", top_k=5)
        assert results == []


# ── RRF fusion ────────────────────────────────────────────────────────────────

class TestRRFFusion:
    def _chunk(self, source, chunk_id=0, page=1):
        return _make_chunk(source, chunk_id, page, f"text for {source}")

    def test_document_present_in_both_lists_scores_higher(self):
        shared = self._chunk("shared.pdf")
        dense = [shared, self._chunk("dense_only.pdf", chunk_id=1)]
        sparse = [shared, self._chunk("sparse_only.pdf", chunk_id=2)]
        fused = VectorDB._rrf_fuse([dense, sparse])
        assert fused[0]["source"] == "shared.pdf"

    def test_all_documents_present_in_fused_output(self):
        dense = [self._chunk("a.pdf"), self._chunk("b.pdf")]
        sparse = [self._chunk("c.pdf"), self._chunk("b.pdf")]
        fused = VectorDB._rrf_fuse([dense, sparse])
        sources = {r["source"] for r in fused}
        assert sources == {"a.pdf", "b.pdf", "c.pdf"}

    def test_deduplication_by_source_chunk_page(self):
        chunk = self._chunk("dup.pdf")
        fused = VectorDB._rrf_fuse([[chunk], [chunk]])
        assert len([r for r in fused if r["source"] == "dup.pdf"]) == 1

    def test_empty_lists_return_empty(self):
        assert VectorDB._rrf_fuse([[], []]) == []

    def test_single_list_order_preserved(self):
        chunks = [self._chunk(f"doc{i}.pdf", chunk_id=i) for i in range(5)]
        fused = VectorDB._rrf_fuse([chunks])
        assert [r["source"] for r in fused] == [r["source"] for r in chunks]


# ── Hybrid search integration ─────────────────────────────────────────────────

class TestHybridSearch:
    def test_returns_empty_when_no_index(self, empty_db):
        results = empty_db.search("anything")
        assert results == []

    def test_falls_back_to_dense_when_bm25_empty(self, empty_db):
        """If BM25 has no index, dense results are returned directly."""
        dense_chunk = _make_chunk("dense.pdf", 0, 1, "dense only result")
        empty_db._bm25 = None
        empty_db._bm25_corpus = []
        # Patch dense search to return a known result
        with patch.object(empty_db, "_dense_search", return_value=[dense_chunk]):
            # index must be non-None to pass the early guard
            empty_db.index = MagicMock()
            results = empty_db.search("test query", top_k=5)
        assert results == [dense_chunk]

    def test_falls_back_to_bm25_when_dense_empty(self, loaded_db):
        """If dense search returns nothing, BM25 results are returned directly."""
        loaded_db.index = MagicMock()
        with patch.object(loaded_db, "_dense_search", return_value=[]):
            results = loaded_db.search("budget", top_k=3)
        assert len(results) > 0
        assert all(r["source"] == "budget.pdf" for r in results)

    def test_top_k_limits_results(self, loaded_db):
        loaded_db.index = MagicMock()
        with patch.object(loaded_db, "_dense_search", return_value=[]):
            results = loaded_db.search("the", top_k=2)
        assert len(results) <= 2

    def test_rrf_promotes_chunk_found_by_both_methods(self, loaded_db):
        """A chunk retrieved by both dense and BM25 should rank above chunks
        retrieved by only one method."""
        target = _make_chunk("target.pdf", 0, 1, "target document for testing")
        other = _make_chunk("other.pdf", 1, 1, "other document")
        loaded_db.index = MagicMock()

        with patch.object(loaded_db, "_dense_search", return_value=[target, other]), \
             patch.object(loaded_db, "_bm25_search", return_value=[target]):
            results = loaded_db.search("target", top_k=5)

        assert results[0]["source"] == "target.pdf"
