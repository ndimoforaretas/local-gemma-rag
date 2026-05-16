# Gemma CogniVault - Future Features & Upgrades Roadmap

This document outlines potential architectural enhancements and feature additions to expand the capabilities of the local RAG pipeline.

## 1. Advanced RAG & AI Capabilities

### Hybrid Search & Re-ranking
- **Current State**: The application relies purely on dense semantic vector search (FAISS + embeddings).
- **Upgrade**: Implement Hybrid Search by combining the FAISS vector search with a keyword-based search algorithm (like BM25). Combine the results and pass them through a lightweight Cross-Encoder model to *re-rank* them based on relevance. This significantly improves retrieval accuracy for complex queries.

### Web Scraping / URL Ingestion
- **Current State**: Only local PDF documents can be ingested.
- **Upgrade**: Add a URL input field in the Knowledge Base interface. Trigger a DBOS workflow that fetches the webpage, strips HTML boilerplate, extracts the main text content, chunks it, and durably embeds it into the vector store alongside the PDFs.

### Multi-Modal Ingestion
- **Current State**: The pipeline only extracts plain text from PDFs.
- **Upgrade**: Integrate an OCR library (like Tesseract) or a Vision model (like LLaVA via Ollama) to extract and intelligently describe images, charts, and data tables found within the PDFs, drastically increasing the depth of the knowledge base.

## 2. Infrastructure & Storage Upgrades

### Migrate FAISS to pgvector
- **Current State**: Embeddings are stored in a local flat file (`vector_store.faiss`) while workflow states are in PostgreSQL.
- **Upgrade**: Since a robust DBOS PostgreSQL instance is already running, install the `pgvector` extension. Store embeddings directly in the database. This eliminates the need to manage flat files, enables instant individual document deletion without soft-deletes, and unifies the storage architecture.

### Auto-Syncing Watcher
- **Current State**: Users must manually click "Upload Documents" to trigger the ingest workflow.
- **Upgrade**: Configure a background DBOS scheduled workflow or a filesystem watcher (like `watchdog`) that constantly monitors the `docs/` folder. Dropping a PDF into the folder via the operating system will automatically and silently trigger the ingest pipeline.

### Full Dockerization
- **Current State**: The frontend and backend run as separate processes locally.
- **Upgrade**: Wrap the FastAPI backend and the compiled React frontend into a single `Dockerfile`. This ensures the application can be trivially deployed to any cloud provider or shared with teammates without worrying about Python environments or Node modules.
