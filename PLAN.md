# CogniVault — Project Plan & Feature Roadmap

> Reference document for ongoing development. Updated as work progresses.

---

## What It Is

**Gemma CogniVault** is a fully local, privacy-first RAG (Retrieval-Augmented Generation) chatbot.
It lets you upload your own documents and ask questions about them — all inference runs on your
machine via Ollama; nothing leaves your hardware.

Primary audience: teams in regulated industries (finance, healthcare) where cloud AI is either
prohibited or too legally risky.

---

## Architecture & Data Flow

```
User (browser)
    │
    │  HTTP / SSE streaming
    ▼
FastAPI app  (backend/main.py)
    ├── POST /rag           → RAG router → Strands Agent → Ollama (gemma4:e4b)
    │                                              └── calls tools:
    │                                                    search_knowledge_base → FAISS
    │                                                    calculator (AST-safe)
    │                                                    current_time
    ├── POST /upload        → saves raw file to docs/
    ├── POST /ingest        → triggers DBOS workflow → Ollama (embeddinggemma) → FAISS on disk
    ├── GET  /ingest/status → polls workflow steps from Postgres
    ├── GET  /kb            → reads vector_store.json, returns folder structure
    ├── DELETE /api/docs/:f → soft-deletes chunks in metadata, removes physical file
    ├── POST /api/save-to-kb → decodes base64 chat attachment, saves to docs/, triggers ingest
    └── GET/POST/DELETE /api/history → reads/writes chat_history.json (flat file)

Storage
    ├── vector_store.faiss  — FAISS IndexFlatIP (inner product, L2-normalised = cosine)
    ├── vector_store.json   — chunk metadata [{source, text, page, chunk_id, type, deleted?}]
    ├── chat_history.json   — all sessions persisted as flat JSON array
    ├── docs/               — raw uploaded files
    └── Postgres (Docker)   — DBOS workflow state only (step outputs, crash recovery)
```

### Ingestion Pipeline (DBOS Durable Workflow)

1. `list_document_files` — scans `docs/`, skips filenames already in metadata
2. `process_single_document` — PyPDF per page; text/md/csv as single "page"
3. Chunking — `RecursiveCharacterTextSplitter` (1000 chars, 100 overlap); skips chunks < 100 chars
4. `embed_batch` — batches of 5 to `embeddinggemma` via Ollama
5. `save_vector_store` — appends to FAISS index & JSON metadata on disk

Every `@DBOS.step()` return value is checkpointed in Postgres. Crash → restart → resume.

### RAG Query Flow

1. Frontend sends `POST /rag` with `{query, attachments[]}`
2. Router validates, calls `run_rag_stream()` which streams a `text/event-stream`
3. Agent calls `search_knowledge_base(query)` → FAISS top-7 cosine search (threshold 0.2)
4. Agent synthesises an answer and streams JSON Lines: `{"type":"text","data":"..."}` or `{"type":"metadata","data":{...}}`
5. Frontend renders text as it arrives and renders citation chips from metadata events

---

## Current Capabilities

| Feature | Status |
|---|---|
| PDF ingestion (page-level) | ✅ |
| TXT / MD / CSV ingestion | ✅ (single-page, no structure awareness) |
| DOCX / PPTX / XLSX / HTML | ❌ |
| OCR for scanned PDFs | ❌ |
| URL / web page ingestion | ❌ |
| Durable crash-recovery workflow | ✅ DBOS |
| Re-ingest on file change | ❌ (name-only dedup) |
| Dense semantic search (FAISS) | ✅ |
| Hybrid search (BM25 + dense) | ❌ |
| Reranker | ❌ |
| Document-scoped search filter | ❌ |
| Multimodal chat (images) | ✅ |
| Text file attachments in chat | ✅ |
| Chat → KB one-click save | ✅ |
| Multi-session history | ✅ (flat JSON file) |
| Streaming SSE responses | ✅ JSON Lines |
| Citations (click to open) | ✅ |
| Safe AST calculator | ✅ |
| Authentication | ❌ |
| Per-user KB collections | ❌ |
| Eval / quality harness | ❌ |

---

## Known Bugs

### B1 — Concurrency: shared agent + module-level `last_doc` (HIGH)
**File:** `backend/services/rag_agent.py:32`, `backend/tools/agent_tools.py:88`

A single `agent` instance is shared across all requests. The `last_doc` attribute is stored on
the function object. Under concurrent requests, sessions bleed: the wrong citation can appear
in a response, and agent conversation history is corrupted.

**Fix:** Create a new `Agent` per request (Strands is lightweight enough), and return the source
doc directly from the tool rather than stashing it as a side-channel attribute.

### B2 — Re-ingest on edit is silently ignored (MEDIUM)
**File:** `backend/services/ingest.py:87`

`list_document_files` checks `if filename not in indexed_files` by name only. Editing and
re-uploading a file produces no re-embedding; the stale vectors remain.

**Fix:** Store a content hash (MD5/SHA256) in chunk metadata; compare on each ingest run.

---

## Feature Roadmap

### Tier 1 — High value / lower effort

| ID | Feature | Effort | Files Touched |
|----|---|---|---|
| **T1-A** | ~~Fix concurrency bug (B1)~~ ✅ | ~4 hrs | `rag_agent.py`, `agent_tools.py` |
| **T1-B** | Hybrid retrieval (BM25 + FAISS, RRF fusion) | 1-2 days | `vector_db.py`, `agent_tools.py` |
| **T1-C** | Document-scoped chat filter | 1 day | `vector_db.py`, `agent_tools.py`, frontend sidebar |
| **T1-D** | Re-ingest on file change (B2 + content hash) | 3-4 hrs | `ingest.py`, `vector_db.py` |

### Tier 2 — Format & ingestion expansion

| ID | Feature | Effort | Notes |
|----|---|---|---|
| **T2-E** | DOCX / PPTX / XLSX / HTML ingestion | 1 day | `python-docx`, `python-pptx`, `openpyxl` or `unstructured` |
| **T2-F** | URL ingestion (paste a link) | 4 hrs | `httpx` + readability / `trafilatura` |
| **T2-G** | Structure-aware chunking (MD headers, CSV rows) | 4 hrs | `ingest.py`, `MarkdownHeaderTextSplitter` |
| **T2-H** | OCR fallback for scanned PDFs | 4 hrs | `pytesseract` + `Pillow` |

### Tier 3 — Quality & UX

| ID | Feature | Effort | Notes |
|----|---|---|---|
| **T3-I** | Lightweight eval harness (retrieval@k + LLM-judge) | 1 day | New `backend/eval/` module + pytest fixtures |
| **T3-J** | Citation preview popovers (chunk text on hover) | 3 hrs | Frontend only |
| **T3-K** | Regenerate / edit-and-resend in chat | 4 hrs | Frontend + reset agent history endpoint |
| **T3-L** | New agent tools: `summarize_document`, `list_documents`, `compare_documents` | 1 day | `agent_tools.py` |

### Tier 4 — Larger initiatives

| ID | Feature | Effort | Notes |
|----|---|---|---|
| **T4-M** | Auth + per-user KB collections | 2-3 days | FastAPI Users + `collection_id` on every chunk |
| **T4-N** | FAISS HNSW upgrade (for >100k chunks) | 4 hrs | `vector_db.py` |
| **T4-O** | PII detection on ingest/prompts | 1 day | `presidio-analyzer` |

---

## Recommended Starting Order

```
T1-A (concurrency fix) → T1-B (hybrid retrieval) → T1-C (doc filter) → T1-D (re-ingest)
```

T1-A is a correctness bug that will cause subtle, hard-to-reproduce problems under any real
load. Fix it before layering new features. T1-B gives the biggest quality uplift for relatively
low complexity. T1-C makes the UX feel powerful for users with large document libraries.

---

## File Quick-Reference

| Path | Purpose |
|---|---|
| `backend/config.py` | All env-driven settings (model names, paths, chunk size) |
| `backend/main.py` | FastAPI app init, mounts routers, serves frontend static files |
| `backend/middleware.py` | Request tracing + global error handlers |
| `backend/routers/rag.py` | `POST /rag` streaming endpoint |
| `backend/routers/knowledge.py` | Upload, ingest, KB browse, delete, save-to-KB |
| `backend/routers/history.py` | Chat session persistence (flat JSON file) |
| `backend/services/rag_agent.py` | Strands Agent setup, streaming loop, multimodal prompt building |
| `backend/services/vector_db.py` | FAISS index load/reload/search singleton |
| `backend/services/ingest.py` | DBOS durable ingestion workflow |
| `backend/tools/agent_tools.py` | `calculator`, `current_time`, `search_knowledge_base` |
| `backend/models/schemas.py` | Pydantic request/response models |
| `frontend/src/lib/api.ts` | Typed API client |
| `frontend/src/components/` | Chat, KB, History sidebars, input, message list |
