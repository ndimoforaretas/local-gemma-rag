"""
Durable document ingestion pipeline using DBOS.

Each heavy step (file listing, PDF extraction, embedding, saving) is
decorated as a ``@DBOS.step()`` so that the workflow can resume from
the last completed step after a crash.
"""

import json
import os
import re
from typing import Dict, List, Tuple

import faiss
import numpy as np
import ollama
from dbos import DBOS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader

from backend.config import get_settings, logger

settings = get_settings()

# ── DBOS instance ────────────────────────────────────────────────────────────
# Uses a programmatic config dict derived from our centralized Settings.
dbos = DBOS(config={
    "name": "cognivault",
    "system_database_url": settings.db_url,
    "telemetry": {"logs": {"level": "info"}},
})

# Only auto-launch when running this module directly (for standalone ingestion).
if __name__ == "__main__":
    dbos.launch()


# ── Helpers ──────────────────────────────────────────────────────────────────

def get_pdf_pages(path: str) -> List[Tuple[str, int]]:
    """Extract text from a PDF file, keeping track of page numbers."""
    try:
        reader = PdfReader(path)
        pages: List[Tuple[str, int]] = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                text = re.sub(r"\s+", " ", text).strip()
                if text:
                    pages.append((text, i + 1))
        return pages
    except Exception:
        logger.exception("Error reading PDF %s", path)
        return []

def get_text_pages(path: str) -> List[Tuple[str, int]]:
    """Extract text from a plain text, markdown, or csv file."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            text = f.read()
            if text.strip():
                return [(text.strip(), 1)]
    except Exception:
        logger.exception("Error reading text file %s", path)
    return []


# ── Durable workflow steps ───────────────────────────────────────────────────

@DBOS.step()
def list_document_files() -> List[str]:
    """List new PDF files in the docs directory that are not yet indexed."""
    indexed_files: set[str] = set()
    if os.path.exists(settings.metadata_file):
        try:
            with open(settings.metadata_file, "r") as f:
                meta = json.load(f)
                for item in meta:
                    if "source" in item:
                        indexed_files.add(item["source"])
        except Exception:
            logger.exception("Failed to read existing metadata")

    files: List[str] = []
    if os.path.exists(settings.docs_dir):
        for filename in os.listdir(settings.docs_dir):
            if any(filename.lower().endswith(ext) for ext in [".pdf", ".txt", ".md", ".csv"]) and filename not in indexed_files:
                files.append(filename)

    logger.info("Found %d new documents to ingest", len(files))
    return sorted(files)


@DBOS.step()
def process_single_document(filename: str) -> List[Dict]:
    """Process a single document and extract content."""
    path = os.path.join(settings.docs_dir, filename)
    logger.info("Processing document: %s", filename)

    ext = os.path.splitext(filename)[1].lower()
    if ext == ".pdf":
        pages = get_pdf_pages(path)
        doc_type = "pdf"
    elif ext in [".txt", ".md", ".csv"]:
        pages = get_text_pages(path)
        doc_type = "text"
    else:
        logger.warning("Unsupported file type: %s", ext)
        return []

    docs: List[Dict] = []
    for text, page_num in pages:
        docs.append({
            "source": filename,
            "content": text,
            "type": doc_type,
            "page": page_num,
        })
    return docs


@DBOS.step()
def embed_batch(batch: List[str]) -> List[List[float]]:
    """Embed a batch of text chunks using the Ollama embedding model."""
    try:
        response = ollama.embed(model=settings.embedding_model, input=batch)
        return response["embeddings"]
    except Exception:
        logger.exception("Embedding batch failed — DBOS will retry")
        raise


@DBOS.step()
def save_vector_store(embeddings: List[List[float]], chunks_metadata: List[Dict]) -> None:
    """Save the FAISS index and metadata to disk (append or create)."""
    if not embeddings:
        return

    embeddings_np = np.array(embeddings).astype("float32")
    faiss.normalize_L2(embeddings_np)

    existing_meta: List[Dict] = []
    if os.path.exists(settings.index_file) and os.path.exists(settings.metadata_file):
        index = faiss.read_index(settings.index_file)
        index.add(embeddings_np)
        with open(settings.metadata_file, "r") as f:
            existing_meta = json.load(f)
    else:
        index = faiss.IndexFlatIP(embeddings_np.shape[1])
        index.add(embeddings_np)

    combined_metadata = existing_meta + chunks_metadata

    faiss.write_index(index, settings.index_file)
    with open(settings.metadata_file, "w") as f:
        json.dump(combined_metadata, f)

    logger.info("Saved %d new chunks to vector store", len(chunks_metadata))


# ── Main workflow ────────────────────────────────────────────────────────────

@DBOS.workflow()
def ingest_workflow() -> int:
    """Durable workflow: chunk → embed → store documents from docs/."""
    filenames = list_document_files()
    if not filenames:
        logger.info("No new documents found to ingest")
        return 0

    # Step 2: Extract content from each PDF
    all_documents: List[Dict] = []
    for filename in filenames:
        docs = process_single_document(filename)
        all_documents.extend(docs)

    if not all_documents:
        return 0

    # Step 3: Chunk the extracted text
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
    )

    chunks_metadata: List[Dict] = []
    texts_to_embed: List[str] = []

    logger.info("Chunking %d document pages", len(all_documents))
    for doc in all_documents:
        chunks = splitter.split_text(doc["content"])
        for i, chunk in enumerate(chunks):
            if len(chunk.strip()) < 100:
                continue
            chunks_metadata.append({
                "source": doc["source"],
                "type": doc["type"],
                "content": chunk,
                "chunk_id": i,
                "page": doc["page"],
            })
            texts_to_embed.append(chunk)

    # Step 4: Embed in batches
    logger.info("Generating embeddings for %d chunks", len(texts_to_embed))
    embeddings: List[List[float]] = []
    batch_size = settings.embedding_batch_size
    for i in range(0, len(texts_to_embed), batch_size):
        batch = texts_to_embed[i : i + batch_size]
        batch_embeddings = embed_batch(batch)
        embeddings.extend(batch_embeddings)

    # Step 5: Save
    save_vector_store(embeddings, chunks_metadata)
    return len(chunks_metadata)


if __name__ == "__main__":
    count = ingest_workflow()
    logger.info("Ingestion complete — indexed %d chunks", count)
