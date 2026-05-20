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
| **T1-B** | ~~Hybrid retrieval (BM25 + FAISS, RRF fusion)~~ ✅ | 1-2 days | `vector_db.py`, `requirements.txt` |
| **T1-C** | ~~Document-scoped chat filter~~ ✅ | 1 day | `vector_db.py`, `agent_tools.py`, frontend sidebar |
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

## Recommended Starting Order (original)

```
T1-A (concurrency fix) → T1-B (hybrid retrieval) → T1-C (doc filter) → T1-D (re-ingest)
```

T1-A is a correctness bug that will cause subtle, hard-to-reproduce problems under any real
load. Fix it before layering new features. T1-B gives the biggest quality uplift for relatively
low complexity. T1-C makes the UX feel powerful for users with large document libraries.

---

## 🏆 Competition Sprint — Gemma 4 Challenge (dev branch)

> Branch: `dev` | Deadline: next day submission
> Goal: demonstrate the **full capability surface of Gemma 4:e4b** and make CogniVault a
> credible, production-grade Local First Data Vault.

Gemma 4:e4b advertised capabilities: `completion · vision · tools · thinking · audio`
Currently used: completion ✅ · vision ✅ · tools ✅ · **thinking ❌ · audio ❌**

### Build order (test + commit gate between every step)

---

### Step 1 — Thinking Mode: "🧠 Reasoning" panel  ✅

**Why it wins:** No other local RAG demo exposes the model's internal reasoning chain. For
regulated industries this is an auditability feature — users can inspect *how* the AI reached
its answer. Directly showcases a capability unique to Gemma 4.

**How Gemma 4 thinking works:**
- Ollama exposes a `thinking` field on the response when `options: {thinking: true}` is set.
- Confirmed working: `gemma4:e4b` returns a full step-by-step chain in `message.thinking`.
- In streaming, thinking tokens arrive as a separate content block before the text response.

**Backend changes:**
- `backend/services/rag_agent.py` — pass `options={"thinking": True}` via `OllamaModel` config
  or via `additional_args`; detect thinking content blocks in the stream event loop; emit a
  new JSON Lines event type `{"type": "thinking", "data": "<reasoning text>"}`.

**Frontend changes:**
- `frontend/src/components/ChatMessageList.tsx` — render a collapsible
  `🧠 Reasoning` panel above each AI response that received thinking tokens;
  collapsed by default, expands on click; styled subtly (muted/italic).
- `frontend/src/lib/api.ts` — extend the streaming parser to handle the new `thinking` type.
- `frontend/src/types/api.ts` — add `thinking` to the message event union type.

**Tests:**
- Unit: new `{"type": "thinking", ...}` event is emitted when the stream contains thinking tokens.
- Unit: thinking panel renders collapsed by default; expands on click.
- Integration: stream with thinking disabled emits no thinking events (graceful absence).

---

### Step 2 — Document Intelligence Tools (3 new agent tools)  ✅

**Why it wins:** Autonomous multi-step agentic chaining is the centrepiece of the Gemma 4
pitch. Three tools that let the agent reason *about* the vault itself:

| Tool | Signature | What it does |
|---|---|---|
| `list_documents` | `() → str` | Lists all indexed, non-deleted documents with type and chunk count |
| `analyze_document` | `(filename: str) → str` | Reads all chunks for a document and asks Gemma to produce a structured summary: key topics, entities, dates, sentiment |
| `compare_documents` | `(doc_a: str, doc_b: str, question: str) → str` | Fetches chunks from both documents and asks Gemma to answer the question by comparing them |

**Backend changes:**
- `backend/tools/agent_tools.py` — implement the three tools; `analyze_document` and
  `compare_documents` call `vector_db` to fetch chunks then use a direct `ollama.chat()` call
  (not the agent, to avoid recursion) for the inner reasoning step.
- `backend/services/rag_agent.py` — register the new tools on the agent.

**Tests:**
- `list_documents` returns a non-empty string when the KB has documents.
- `list_documents` returns a graceful "empty vault" message when no docs are indexed.
- `analyze_document` returns an error for an unknown filename.
- `compare_documents` returns an error when either filename is unknown.

---

### Step 3 — Re-ingest on File Change (T1-D)  ✅

**Why it matters:** Without this, editing an uploaded document leaves stale vectors forever.
A real Data Vault must stay current.

**Backend changes:**
- `backend/services/ingest.py` — `list_document_files()`: store a SHA-256 content hash per
  chunk in metadata on first ingest; on subsequent runs, compare file hash against the stored
  hash and include the file if it has changed (soft-delete old chunks, re-embed new ones).
- `backend/services/vector_db.py` — expose a `delete_by_source(filename)` helper used during
  re-ingest to mark old chunks as deleted before writing new embeddings.

**Tests:**
- Ingesting the same file twice with no changes skips it (idempotent).
- Ingesting a modified file removes old chunks and adds new ones.
- `delete_by_source` marks all matching chunks as `deleted=True`.

---

### Step 4 — DOCX + URL Ingestion (T2-E / T2-F)  ✅

**Why it matters:** Enterprise documents live in Word files; demos always need a URL
ingestion moment. Adds immediate enterprise credibility.

**Dependencies:** `python-docx`, `httpx`, `trafilatura` (clean web text extraction).

**Backend changes:**
- `backend/services/ingest.py` — add `process_docx()` extractor (paragraph + table text);
  add `process_url()` fetcher (httpx GET → trafilatura extract → treat as single-page text doc).
- `backend/routers/knowledge.py` — extend `_ALLOWED_EXTENSIONS` to include `.docx`;
  add `POST /ingest/url` endpoint accepting `{"url": "https://..."}`, saving fetched content
  to `docs/` as a `.txt` file, then triggering the ingest workflow.
- `frontend/src/components/KnowledgeBase.tsx` — add a URL input field alongside the file
  drop zone.

**Tests:**
- DOCX extractor returns non-empty text from a minimal `.docx` fixture.
- URL endpoint rejects non-HTTP schemes (e.g. `file://`, `ftp://`).
- URL endpoint rejects localhost / private IP ranges (SSRF guard).

---

### Step 5 — Privacy Vault Audit Panel  ✅

**Why it wins:** Ties together the entire "Local First Data Vault" narrative in one view.
Shows the jury (and real users) exactly what's stored and proves nothing leaves the machine.

**Backend changes:**
- `backend/routers/knowledge.py` — add `GET /api/vault/stats` returning:
  ```json
  {
    "total_documents": 12,
    "total_chunks": 847,
    "index_size_kb": 3420,
    "last_ingested_at": "2026-05-20T14:52:15",
    "ollama_host": "http://localhost:11434",
    "external_calls": 0,
    "storage": {
      "vector_index": "vector_store.faiss",
      "metadata": "vector_store.json",
      "documents": "docs/"
    }
  }
  ```

**Frontend changes:**
- New `VaultAudit.tsx` component: a card in the Knowledge Base view showing vault stats,
  a green "🔒 100% Local" badge, storage breakdown, and a "Zero external API calls" indicator.

**Tests:**
- `GET /api/vault/stats` returns correct chunk count matching the vector store.
- Returns 0 documents / 0 chunks on an empty vault without error.

---

### Definition of Done (per step)

1. All existing tests still pass (`65/65` baseline).
2. New tests written and passing for the step's changes.
3. Manual smoke-test: feature works end-to-end in the running app.
4. Committed to `dev` branch with a descriptive commit message.
5. PLAN.md step marked ✅ before moving to the next.

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
