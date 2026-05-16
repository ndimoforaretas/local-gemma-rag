"""
VectorDB — FAISS-backed vector database with in-memory search.

Handles loading, reloading, and semantic search against the local
FAISS index and its companion JSON metadata file.
"""

import json
import os
from typing import Dict, List

import faiss
import numpy as np
import ollama

from backend.config import get_settings, logger


class VectorDB:
    """In-memory FAISS index with disk-backed persistence."""

    def __init__(self) -> None:
        self.index: faiss.IndexFlatIP | None = None
        self.metadata: List[Dict] = []
        self._load()

    def _load(self) -> None:
        """Load the FAISS index and metadata from disk if they exist."""
        settings = get_settings()
        if os.path.exists(settings.index_file) and os.path.exists(settings.metadata_file):
            logger.info("Loading vector database from %s", settings.index_file)
            self.index = faiss.read_index(settings.index_file)
            with open(settings.metadata_file, "r") as f:
                self.metadata = json.load(f)
            logger.info("Loaded %d chunks into memory", len(self.metadata))
        else:
            logger.warning("No vector store found on disk — starting empty")

    def reload(self) -> None:
        """Re-read the index and metadata from disk (e.g. after ingestion)."""
        logger.info("Reloading vector database from disk")
        self._load()

    def search(self, query: str, top_k: int = 5) -> List[Dict]:
        """
        Perform a semantic similarity search against the index.

        Returns up to `top_k` metadata dicts whose cosine similarity
        exceeds the minimum threshold (0.2).  Soft-deleted documents
        are filtered out automatically.
        """
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
                if distances[0][i] < 0.2:
                    continue
                if self.metadata[idx].get("deleted"):
                    continue
                results.append(self.metadata[idx])

            return results

        except Exception:
            logger.exception("Error during vector search")
            return []


# Module-level singleton — imported by tools and routers.
vector_db = VectorDB()
