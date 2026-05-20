#!/usr/bin/env python3
"""
Seed the knowledge base with default documents from docs/.

Called once by setup.sh when no vector store exists yet.
Runs standalone — does not require DBOS or the app server to be running.
"""

import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

import faiss
import numpy as np
import ollama
from langchain_text_splitters import RecursiveCharacterTextSplitter

from backend.config import get_settings

settings = get_settings()

SUPPORTED_EXTS = {".pdf", ".txt", ".md", ".csv"}


def _read_text(path: str) -> list[tuple[str, int]]:
    """Return [(text, page_number)] for a plain-text / markdown / csv file."""
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
            text = fh.read().strip()
        if text:
            return [(text, 1)]
    except Exception as exc:
        print(f"  Warning: could not read {path}: {exc}")
    return []


def _read_pdf(path: str) -> list[tuple[str, int]]:
    """Return [(page_text, page_number)] for a PDF file."""
    try:
        import pdfplumber  # type: ignore

        pages = []
        with pdfplumber.open(path) as pdf:
            for i, page in enumerate(pdf.pages, start=1):
                text = page.extract_text() or ""
                if text.strip():
                    pages.append((text.strip(), i))
        return pages
    except Exception as exc:
        print(f"  Warning: could not read PDF {path}: {exc}")
    return []


def main() -> None:
    # Idempotent — skip if a vector store is already present.
    if os.path.exists(settings.index_file) and os.path.exists(settings.metadata_file):
        print("  Vector store already exists — skipping default seeding.")
        return

    docs_dir = os.path.join(ROOT, settings.docs_dir)
    if not os.path.exists(docs_dir):
        print("  No docs/ directory — skipping default seeding.")
        return

    seed_files = sorted(
        f for f in os.listdir(docs_dir)
        if os.path.splitext(f)[1].lower() in SUPPORTED_EXTS
    )

    if not seed_files:
        print("  No seed documents found in docs/ — skipping.")
        return

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
    )

    all_chunks: list[str] = []
    all_metadata: list[dict] = []

    for filename in seed_files:
        path = os.path.join(docs_dir, filename)
        ext = os.path.splitext(filename)[1].lower()
        pages = _read_pdf(path) if ext == ".pdf" else _read_text(path)
        doc_type = "pdf" if ext == ".pdf" else "text"

        for text, page_num in pages:
            for chunk in splitter.split_text(text):
                all_chunks.append(chunk)
                all_metadata.append({
                    "source": filename,
                    "content": chunk,
                    "type": doc_type,
                    "page": page_num,
                })

        print(f"  Processed: {filename}")

    if not all_chunks:
        print("  No content extracted from seed documents — skipping.")
        return

    print(f"  Embedding {len(all_chunks)} chunks (this may take a moment)...")

    all_embeddings: list[list[float]] = []
    batch_size = settings.embedding_batch_size
    for i in range(0, len(all_chunks), batch_size):
        batch = all_chunks[i : i + batch_size]
        resp = ollama.embed(model=settings.embedding_model, input=batch)
        all_embeddings.extend(resp["embeddings"])

    embeddings_np = np.array(all_embeddings, dtype="float32")
    faiss.normalize_L2(embeddings_np)

    index = faiss.IndexFlatIP(embeddings_np.shape[1])
    index.add(embeddings_np)

    faiss.write_index(index, settings.index_file)
    with open(settings.metadata_file, "w") as fh:
        json.dump(all_metadata, fh)

    print(
        f"  ✓ Seeded knowledge base: {len(all_chunks)} chunks "
        f"from {len(seed_files)} document(s)"
    )


if __name__ == "__main__":
    main()
