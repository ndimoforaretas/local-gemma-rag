"""
VectorDB — hybrid FAISS + BM25 vector database with RRF fusion.

Dense retrieval (FAISS cosine similarity) catches semantic matches;
sparse retrieval (BM25) catches exact keyword / identifier matches.
Reciprocal Rank Fusion combines the two ranked lists without requiring
score normalisation across different scales.
"""

import json
import os
from typing import Dict, List, Optional

import faiss
import numpy as np
import ollama
from rank_bm25 import BM25Okapi

from backend.config import get_settings, logger

# RRF constant — dampens the impact of very high ranks.
# k=60 is the standard choice from the original RRF paper (Cormack 2009).
_RRF_K = 60

# Minimum cosine similarity to include in the dense candidate list.
# Kept intentionally low (0.1) so BM25 can still rescue semantically
# weak-but-keyword-matching chunks through RRF fusion.
_DENSE_THRESHOLD = 0.1


class VectorDB:
    """In-memory FAISS index + BM25 index with disk-backed persistence."""

    def __init__(self) -> None:
        self.index: Optional[faiss.IndexFlatIP] = None
        self.metadata: List[Dict] = []
        self._bm25: Optional[BM25Okapi] = None
        self._bm25_corpus: List[Dict] = []   # non-deleted chunks, parallel to BM25 rows
        self._load()

    # ── Loading ──────────────────────────────────────────────────────────────

    def _load(self) -> None:
        """Load the FAISS index and metadata from disk, then build BM25."""
        settings = get_settings()
        if os.path.exists(settings.index_file) and os.path.exists(settings.metadata_file):
            logger.info("Loading vector database from %s", settings.index_file)
            self.index = faiss.read_index(settings.index_file)
            with open(settings.metadata_file, "r") as f:
                self.metadata = json.load(f)
            logger.info("Loaded %d chunks into memory", len(self.metadata))
        else:
            logger.warning("No vector store found on disk — starting empty")
        self._build_bm25()

    def reload(self) -> None:
        """Re-read the index and metadata from disk (e.g. after ingestion)."""
        logger.info("Reloading vector database from disk")
        self._load()

    # ── BM25 ─────────────────────────────────────────────────────────────────

    def _build_bm25(self) -> None:
        """Build a BM25Okapi index from the active (non-deleted) corpus."""
        active = [m for m in self.metadata if not m.get("deleted")]
        if not active:
            self._bm25 = None
            self._bm25_corpus = []
            return
        self._bm25_corpus = active
        tokenized = [m["text"].lower().split() for m in active]
        self._bm25 = BM25Okapi(tokenized)
        logger.info("Built BM25 index over %d active chunks", len(active))

    def _bm25_search(self, query: str, top_k: int) -> List[Dict]:
        """Return up to top_k chunks ranked by BM25 score (zero scores excluded)."""
        if self._bm25 is None or not self._bm25_corpus:
            return []
        tokens = query.lower().split()
        scores = self._bm25.get_scores(tokens)
        # argsort ascending → reverse for descending
        ranked_indices = np.argsort(scores)[::-1][:top_k]
        return [
            self._bm25_corpus[i]
            for i in ranked_indices
            if scores[i] > 0
        ]

    # ── Dense (FAISS) ─────────────────────────────────────────────────────────

    def _dense_search(self, query: str, top_k: int) -> List[Dict]:
        """Return up to top_k chunks by cosine similarity via FAISS."""
        if self.index is None:
            return []
        settings = get_settings()
        try:
            response = ollama.embed(model=settings.embedding_model, input=query)
            query_vector = (
                np.array(response["embeddings"][0]).astype("float32").reshape(1, -1)
            )
            faiss.normalize_L2(query_vector)
            distances, indices = self.index.search(query_vector, top_k)
            results: List[Dict] = []
            for i, idx in enumerate(indices[0]):
                if idx == -1:
                    continue
                if distances[0][i] < _DENSE_THRESHOLD:
                    continue
                chunk = self.metadata[idx]
                if chunk.get("deleted"):
                    continue
                results.append(chunk)
            return results
        except Exception:
            logger.exception("Error during dense vector search")
            return []

    # ── RRF fusion ────────────────────────────────────────────────────────────

    @staticmethod
    def _rrf_fuse(ranked_lists: List[List[Dict]]) -> List[Dict]:
        """
        Reciprocal Rank Fusion across multiple ranked lists.

        score(d) = Σ  1 / (_RRF_K + rank(d, list_i))

        Documents are de-duplicated by (source, chunk_id, page) key.
        """
        scores: Dict[str, float] = {}
        docs: Dict[str, Dict] = {}
        for ranked in ranked_lists:
            for rank, doc in enumerate(ranked):
                key = (
                    f"{doc.get('source', '')}|"
                    f"{doc.get('chunk_id', 0)}|"
                    f"{doc.get('page', 0)}"
                )
                scores[key] = scores.get(key, 0.0) + 1.0 / (_RRF_K + rank + 1)
                docs[key] = doc
        return [
            docs[key]
            for key in sorted(scores, key=lambda k: scores[k], reverse=True)
        ]

    # ── Public API ────────────────────────────────────────────────────────────

    def search(self, query: str, top_k: int = 5) -> List[Dict]:
        """
        Hybrid semantic + keyword search with Reciprocal Rank Fusion.

        Retrieves `candidate_k` results from both FAISS (dense) and BM25
        (sparse), fuses the two ranked lists with RRF, and returns the
        top `top_k` results.  Falls back gracefully to dense-only when the
        BM25 index is not available (empty KB).
        """
        if self.index is None:
            return []

        # Over-retrieve candidates so fusion has enough signal.
        candidate_k = max(top_k * 4, 20)

        dense_results = self._dense_search(query, candidate_k)
        bm25_results = self._bm25_search(query, candidate_k)

        # If only one method produced results, skip fusion overhead.
        if not bm25_results:
            return dense_results[:top_k]
        if not dense_results:
            return bm25_results[:top_k]

        fused = self._rrf_fuse([dense_results, bm25_results])
        return fused[:top_k]


# Module-level singleton — imported by tools and routers.
vector_db = VectorDB()
