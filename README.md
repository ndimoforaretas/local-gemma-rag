<div align="center">

![Gemma CogniVault Banner](frontend/public/gemma-cognivault-banner.jpg)

# Gemma CogniVault

### A fully local, privacy-first AI Data Vault powered by Gemma 4

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Gemma 4](https://img.shields.io/badge/Gemma%204-e4b-4285F4?logo=google&logoColor=white)](https://ollama.com/library/gemma4)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-110%20passing-brightgreen)](#testing)

**Upload your documents. Ask anything. Nothing leaves your machine.**

[Quick Start](#-quick-start) · [Features](#-features) · [Architecture](#-architecture) · [How Gemma 4 Powers This](#-how-gemma-4-powers-this) · [API Docs](#-api-documentation)

</div>

---

## The Problem

AI assistants are transforming knowledge work — but for teams in regulated industries (finance, healthcare, legal), cloud AI creates an unacceptable risk surface.

- Where does your data go when you paste a document into a chatbot?
- Which data center processes it? Under which jurisdiction?
- What happens to prompts, files, and outputs?

Most teams know the answer isn't satisfying. So they pull back to slower, less intelligent workflows — because the legal and compliance risk of cloud AI feels too high.

Local RAG seems like the answer, but most implementations are fragile: crash mid-ingestion and you lose everything. Lightweight models hallucinate tool calls. Search is keyword-only.

**CogniVault was built to close that gap.**

---

## My Solution

CogniVault is a **100% local, production-grade AI Data Vault** that brings the full power of Gemma 4 to your own hardware — without a single byte leaving your machine.

- **Fault-tolerant ingestion** via DBOS durable workflows — crash and resume from the exact batch
- **Agentic reasoning** via Strands Agents — multi-step tool chaining, not just chat completion
- **Hybrid retrieval** — FAISS semantic search fused with BM25 keyword search via Reciprocal Rank Fusion
- **Full Gemma 4 capability surface** — completion, vision, tools, and thinking mode, all local

For regulated teams, the future of private AI is here. It runs on your laptop.

---

## ✨ Features

### 🧠 Gemma 4 Thinking Mode
The only local RAG demo that exposes the model's internal reasoning chain. Before answering, Gemma 4 streams its step-by-step thought process into a collapsible **🧠 Reasoning** panel — an auditability feature for regulated industries. You can inspect *how* the AI reached its answer, not just what it said.

### 📚 Document Intelligence Tools
Three agentic tools that let Gemma 4 reason *about* the vault itself:
- **`list_documents()`** — discover what's indexed, with file types and chunk counts
- **`analyze_document(filename)`** — structured analysis: key topics, entities, facts, summary
- **`compare_documents(doc_a, doc_b, question)`** — side-by-side comparison answering a specific question

### 🔍 Hybrid Retrieval (BM25 + FAISS + RRF)
Dense semantic search alone misses exact matches. Sparse keyword search alone misses meaning. CogniVault combines both via **Reciprocal Rank Fusion** (Cormack 2009) — getting the best of both without score normalisation complexity.

### 🖼️ Multimodal Chat
Attach images directly in chat for Gemma 4 vision analysis. Image thumbnails persist in your session history. Works alongside text attachments and KB search in the same conversation.

### 📄 Multi-Format Ingestion
Upload and index **PDFs** (page-level), **DOCX** (paragraphs + tables), **TXT/MD/CSV**, and **web pages via URL**. A SHA-256 content hash ensures re-uploaded files are automatically re-indexed with stale vectors soft-deleted.

### 🌐 URL Ingestion
Paste any public URL — CogniVault fetches the page, extracts clean text via [trafilatura](https://trafilatura.readthedocs.io/), saves it to your vault, and triggers ingestion automatically. Full SSRF protection blocks private IP ranges including the AWS metadata endpoint.

### 🔄 Crash-Resilient Ingestion (DBOS)
Every ingestion step is a `@DBOS.step()` checkpointed in PostgreSQL. Crash mid-way through a 500-page document? Restart the server and ingestion resumes from the exact batch it left off.

### 🔒 Privacy Vault Audit Panel
A live dashboard showing exactly what's stored: document count, chunk count, FAISS index size, last ingestion timestamp, and a **"Zero external API calls"** confirmation. The entire inference chain runs on `localhost:11434` — provably local.

### 💬 Multi-Session Chat History
Independent research threads with auto-generated titles, a history sidebar, and full persistence across restarts. Chat → KB bridge lets you attach files in chat, discuss them, then save to your knowledge base with one click.

### 📎 Interactive Citations
A live Context sidebar surfaces exactly which documents the AI drew from, with source paths and document types. Click to jump to the source.

---

## 🏗️ Architecture

```
User (browser)
    │
    │  HTTP / SSE streaming
    ▼
FastAPI app  (backend/main.py)
    │
    ├── POST /rag              → Two-phase RAG stream:
    │                              Phase 1: Direct Ollama call (thinking=True)
    │                                       → emits {"type":"thinking",...}
    │                              Phase 2: Strands Agent (tools + text)
    │                                       → emits {"type":"text"|"metadata",...}
    │
    ├── POST /upload           → validates & saves to docs/
    ├── POST /ingest           → DBOS durable workflow (hash-aware)
    ├── POST /ingest/url       → httpx fetch → trafilatura → docs/ → ingest
    ├── GET  /ingest/status    → polls DBOS step progress from Postgres
    ├── GET  /kb               → knowledge base file listing
    ├── GET  /api/vault/stats  → live privacy audit stats (100% local)
    ├── DELETE /api/docs/:f    → soft-delete chunks + remove physical file
    ├── POST /api/save-to-kb   → decode base64 attachment → docs/ → ingest
    └── GET/POST/DELETE /api/history → chat session persistence

Agent Tools (Strands)
    ├── search_knowledge_base(query)            → FAISS+BM25 hybrid, top-7, RRF fusion
    ├── list_documents()                        → vault inventory with chunk counts
    ├── analyze_document(filename)              → Gemma inner call for structured summary
    ├── compare_documents(doc_a, doc_b, question) → Gemma inner call for comparison
    ├── calculator(expression)                  → safe AST evaluator, no eval()
    └── current_time()                          → timestamp tool

Storage (fully local)
    ├── vector_store.faiss   — FAISS IndexFlatIP (inner product, L2-normalised = cosine)
    ├── vector_store.json    — chunk metadata [{source, content, page, chunk_id,
    │                          type, file_hash, deleted?}]
    ├── chat_history.json    — sessions persisted as flat JSON array
    ├── docs/                — raw uploaded files (PDF, DOCX, TXT, MD, CSV, web .txt)
    └── Postgres (Docker)    — DBOS workflow state only (step outputs, crash recovery)
```

### Ingestion Pipeline (DBOS Durable Workflow)

```
1. list_document_files  →  SHA-256 hash check per file
                            New file?     → queue for ingest
                            Changed file? → soft-delete old chunks → queue for ingest
                            Same hash?    → skip (fully idempotent)

2. process_single_document  →  PyPDF (page-level) | python-docx (para+table) |
                                raw text/md/csv | URL fetch+trafilatura

3. Chunking  →  RecursiveCharacterTextSplitter (1000 chars, 100 overlap)
                Minimum chunk length: 100 chars

4. embed_batch  →  batches of 5 → embeddinggemma via Ollama
                   Every batch checkpointed — crash safe

5. save_vector_store  →  append to FAISS index + JSON metadata on disk
                         file_hash stored per chunk for future change detection
```

---

## 🤖 How Gemma 4 Powers This

Gemma 4:e4b advertised capabilities: `completion · vision · tools · thinking`

| Capability | How CogniVault Uses It |
|---|---|
| **Completion** | Core chat, RAG synthesis, inner analysis calls |
| **Vision** | Multimodal image attachments in chat |
| **Tools** | 6-tool agentic loop: KB search, document analysis, comparison, calculator, clock |
| **Thinking** | Streamed reasoning chain shown in collapsible 🧠 panel before each answer |

### Why `gemma4:e4b` Was the Right Choice

Standard lightweight local models frequently fail at complex instruction following — they hallucinate tool names, lose retrieved context, or stall at multi-step chains.

Gemma 4 handles real agentic sequences reliably. When a compliance officer asks *"Compare the Q3 and Q4 budget reports and identify the largest variance"*, Gemma 4 autonomously:

1. Calls `list_documents()` to confirm both reports are indexed
2. Calls `compare_documents("q3.pdf", "q4.pdf", "largest variance")` which triggers an inner Gemma reasoning call across both document corpora
3. Synthesises a structured comparison answer — with full source citations

No cloud API. No data egress. No LLM vendor knowing what's in your documents.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **LLM & Embeddings** | [Ollama](https://ollama.com) · `gemma4:e4b` (chat + thinking + vision + tools) · `embeddinggemma` (dense retrieval) |
| **Backend** | [FastAPI](https://fastapi.tiangolo.com) · Python 3.10+ · Pydantic Settings |
| **Agent Framework** | [Strands Agents SDK](https://github.com/strands-agents/sdk-python) |
| **Vector Store** | [FAISS](https://github.com/facebookresearch/faiss) IndexFlatIP + [BM25Okapi](https://github.com/dorianbrown/rank_bm25) · Reciprocal Rank Fusion |
| **Durable Workflows** | [DBOS](https://dbos.dev) + PostgreSQL |
| **Document Parsing** | PyPDF · python-docx · trafilatura · httpx |
| **Frontend** | React 19 · TypeScript · Vite · TanStack React Query · framer-motion · Tailwind CSS |

---

## 📁 Project Structure

```
├── backend/
│   ├── main.py               # FastAPI app + router mounts + static serving
│   ├── config.py             # Centralized settings (pydantic-settings, .env)
│   ├── middleware.py         # Request tracing + global error handlers
│   ├── routers/
│   │   ├── rag.py            # POST /rag — two-phase thinking+agent stream
│   │   ├── knowledge.py      # Upload, ingest, URL ingest, KB browse,
│   │   │                     #   vault stats, delete, save-to-KB
│   │   └── history.py        # Multi-session chat history (flat JSON)
│   ├── services/
│   │   ├── vector_db.py      # Hybrid FAISS+BM25 search, RRF fusion,
│   │   │                     #   delete_by_source, reload
│   │   ├── rag_agent.py      # Two-phase streaming: thinking + Strands agent
│   │   └── ingest.py         # DBOS durable workflow, SHA-256 hash detection,
│   │                         #   PDF/DOCX/text/URL extractors
│   ├── models/schemas.py     # Pydantic request/response models
│   ├── tools/agent_tools.py  # 6 agent tools: search_kb, list_documents,
│   │                         #   analyze_document, compare_documents,
│   │                         #   calculator, current_time
│   └── tests/                # 110 tests across 7 test files
├── frontend/src/
│   ├── components/
│   │   ├── ChatMessageList.tsx  # Messages + ThinkingPanel (collapsible 🧠)
│   │   ├── KnowledgeBase.tsx    # Chat UI + stream consumer (thinking/text/metadata)
│   │   ├── KnowledgeSync.tsx    # Upload drop zone + URL input + VaultAudit
│   │   ├── VaultAudit.tsx       # Privacy Vault Audit Panel (live stats)
│   │   ├── ContextSidebar.tsx   # Live citation sidebar
│   │   ├── HistorySidebar.tsx   # Multi-session history
│   │   └── SuggestionCards.tsx  # How-to cards on empty chat
│   ├── lib/api.ts            # Typed API client (all endpoints)
│   └── types/api.ts          # Shared TypeScript interfaces
├── docs/GUIDE.md             # Pre-seeded user guide (indexed at setup)
├── docker-compose.yaml       # PostgreSQL for DBOS
├── requirements.txt          # Python deps (incl. python-docx, trafilatura, httpx)
└── scripts/
    ├── setup.sh              # One-time setup (models, deps, DB, frontend build)
    ├── start.sh              # Start app (Ollama + Docker + backend)
    └── stop.sh               # Stop backend + database
```

---

## 🚀 Quick Start

### Prerequisites

| Tool | Purpose | Install |
|---|---|---|
| **Python 3.10+** | Backend runtime | [python.org](https://www.python.org/downloads/) |
| **Node.js 18+** | Frontend build | [nodejs.org](https://nodejs.org/) |
| **Docker Desktop** | PostgreSQL for DBOS | [docker.com](https://www.docker.com/products/docker-desktop/) |
| **Ollama** | Local LLM inference | [ollama.com](https://ollama.com/download) |

> **Make sure Docker Desktop and Ollama are running** before proceeding.

### Two-Command Setup

```bash
# 1. Clone and enter the project
git clone https://github.com/ndimoforaretas/local-gemma-rag.git
cd local-gemma-rag

# 2. One-time setup (pulls models ~10 GB, installs deps, builds frontend)
./scripts/setup.sh

# 3. Launch the app
./scripts/start.sh
```

Open **[http://localhost:8000](http://localhost:8000)** — your private AI Data Vault is ready.

### Stopping & Restarting

```bash
# Stop: Ctrl+C in the terminal, then:
./scripts/stop.sh

# Restart later (no setup needed):
./scripts/start.sh
```

<details>
<summary><strong>📋 Manual Setup (step-by-step)</strong></summary>

```bash
# 1. Clone
git clone https://github.com/ndimoforaretas/local-gemma-rag.git
cd local-gemma-rag

# 2. Pull Ollama models
ollama pull gemma4:e4b          # Chat + thinking + vision + tools (~9.6 GB)
ollama pull embeddinggemma      # Dense embeddings (~622 MB)

# 3. Start PostgreSQL
docker compose up -d db

# 4. Python environment
python3 -m venv .venv
source .venv/bin/activate       # macOS / Linux
pip install -r requirements.txt

# 5. DBOS database migration
dbos migrate

# 6. Seed the user guide into the knowledge base
python scripts/seed_knowledge_base.py

# 7. Build the frontend
cd frontend && npm install && npm run build && cd ..

# 8. Launch
python -m backend.main
```

Navigate to **[http://localhost:8000](http://localhost:8000)**

</details>

---

## ⚙️ Configuration

```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `LLM_MODEL` | `gemma4:e4b` | Chat model (completion + vision + tools + thinking) |
| `EMBEDDING_MODEL` | `embeddinggemma` | Dense embedding model |
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama server URL |
| `THINKING_MODE` | `true` | Enable/disable 🧠 Reasoning panel |
| `DB_URL` | `postgresql://postgres:password@localhost:5432/dbos` | PostgreSQL for DBOS |
| `MAX_UPLOAD_SIZE_MB` | `200` | Max document upload size |
| `CHUNK_SIZE` | `1000` | Characters per chunk |
| `CHUNK_OVERLAP` | `100` | Overlap between chunks |

---

## 🧪 Testing

```bash
# Run all tests (no infrastructure required — Ollama and Postgres are mocked)
python -m pytest backend/tests/ -v
```

**110 tests** across 7 test files covering:

| Test File | Coverage |
|---|---|
| `test_thinking.py` | Two-phase thinking stream, disabled mode, error handling |
| `test_doc_tools.py` | list_documents, analyze_document, compare_documents |
| `test_reingest.py` | SHA-256 change detection, delete_by_source, idempotency |
| `test_docx_url.py` | DOCX extractor, SSRF guard, URL endpoint validation |
| `test_vault_stats.py` | Vault stats endpoint, empty vault, chunk counting |
| `test_vector_db.py` | BM25, FAISS, RRF fusion, hybrid search |
| `test_api.py` | All HTTP endpoints |
| `test_tools.py` | Calculator, clock, KB search |

---

## 🔧 Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| `"An internal error occurred"` | Ollama is not running | Open Ollama app, verify with `ollama list` |
| `"Address already in use"` (port 8000) | Previous server still running | `lsof -ti :8000 \| xargs kill -9` |
| `"Cannot connect to Docker daemon"` | Docker Desktop not running | Open Docker Desktop |
| DBOS connection error | PostgreSQL not running | `docker compose up -d db` |
| Suggestion cards return no results | Knowledge base not seeded | Run `python scripts/seed_knowledge_base.py` |
| Thinking panel doesn't appear | Model doesn't support thinking | Confirm `gemma4:e4b` is pulled; set `THINKING_MODE=true` |

---

## 🧠 Why DBOS? (Durable Workflow Philosophy)

Processing large document libraries involves extracting text, chunking, and generating embeddings across potentially hundreds of pages. Any step can fail — memory limits, LLM timeouts, system crashes.

Instead of losing progress and re-ingesting from scratch, CogniVault uses **DBOS durable workflows**:

```python
@DBOS.workflow()
def ingest_workflow():
    files = list_document_files()   # SHA-256 change detection, soft-delete stale chunks
    for filename in files:
        docs = process_single_document(filename)   # PDF/DOCX/text/URL extractors
    # RecursiveCharacterTextSplitter (1000 chars, 100 overlap)
    embeddings = embed_batch(chunks)               # batches of 5, retried on failure
    save_vector_store(embeddings, metadata)        # atomic disk persist
```

Every `@DBOS.step()` return value is checkpointed in Postgres. **Crash → restart → resume from the exact batch.** No data loss. No re-embedding already-processed documents.

---

## 💾 Storage Architecture

| Layer | Files | Purpose |
|---|---|---|
| **Disk** | `vector_store.faiss`, `vector_store.json` | Persistent embeddings and chunk metadata |
| **RAM** | `VectorDB` class | Sub-millisecond in-memory semantic + keyword search |
| **Postgres** | DBOS system tables | Durable workflow state and crash recovery |

All storage is local. The Privacy Vault Audit Panel confirms zero external connections at runtime.

---

## 🐳 Docker Deployment (Optional)

```bash
# Full stack in containers
docker compose up --build
```

Builds the app image, starts PostgreSQL, and serves on port 8000.

---

## 📖 API Documentation

Interactive API docs available when the server is running:

- **Swagger UI**: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)
- **ReDoc**: [http://localhost:8000/api/redoc](http://localhost:8000/api/redoc)

---

## 📜 License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built with [Gemma 4](https://ollama.com/library/gemma4) · [Ollama](https://ollama.com) · [DBOS](https://dbos.dev) · [Strands Agents](https://github.com/strands-agents/sdk-python)

*Your data. Your hardware. Your AI.*

</div>
