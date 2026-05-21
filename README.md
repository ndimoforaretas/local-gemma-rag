<div align="center">

![Gemma CogniVault Banner](frontend/public/gemma-cognivault-banner.png)

# Gemma CogniVault

### A fully local, privacy-first AI Data Vault powered by Gemma 4

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Gemma 4](https://img.shields.io/badge/Gemma%204-e4b-4285F4?logo=google&logoColor=white)](https://ollama.com/library/gemma4)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-202%20passing-brightgreen)](#-testing)

**Upload your documents. Ask anything. Nothing leaves your machine.**

</div>

---

## Table of Contents

1. [Why CogniVault](#-why-cognivault)
2. [Quick Start](#-quick-start)
3. [How to Use](#-how-to-use)
4. [Features](#-features)
5. [Configuration](#️-configuration)
6. [Architecture](#️-architecture)
7. [Tech Stack](#-tech-stack)
8. [Project Structure](#-project-structure)
9. [Testing](#-testing)
10. [Troubleshooting](#-troubleshooting)

---

## 🔒 Why CogniVault

AI assistants are transforming knowledge work — but for teams in regulated industries (finance, healthcare, legal), cloud AI creates an unacceptable risk surface: unknown data centres, uncertain jurisdictions, and audit trails that stop at the API boundary.

**CogniVault is a 100% local AI Data Vault.** Your documents stay on your hardware. Inference runs via Ollama on `localhost`. No telemetry, no embeddings sent to third parties, no exceptions. A live Privacy Vault Audit Panel confirms zero external connections at runtime.

It's also genuinely capable — Gemma 4's full capability surface (completion, vision, tools, and reasoning) running on your laptop.

---

## 🚀 Quick Start

### Prerequisites

| Tool               | Purpose                     | Install                                                       |
| ------------------ | --------------------------- | ------------------------------------------------------------- |
| **Python 3.10+**   | Backend runtime             | [python.org](https://www.python.org/downloads/)               |
| **Node.js 18+**    | Frontend build              | [nodejs.org](https://nodejs.org/)                             |
| **Docker Desktop** | PostgreSQL (workflow state) | [docker.com](https://www.docker.com/products/docker-desktop/) |
| **Ollama**         | Local LLM inference         | [ollama.com](https://ollama.com/download)                     |

> Make sure Docker Desktop and Ollama are **running** before you begin.

### Two Commands

```bash
# Clone and enter the project
git clone https://github.com/ndimoforaretas/local-gemma-rag.git
cd local-gemma-rag

# One-time setup — pulls models (~10 GB), installs deps, builds frontend
./scripts/setup.sh

# Start the app
./scripts/start.sh
```

Open **[http://localhost:8000](http://localhost:8000)** — your vault is ready.

```bash
# Stop the app
./scripts/stop.sh

# Restart any time (setup is not needed again)
./scripts/start.sh
```

<details>
<summary><strong>Manual setup (step by step)</strong></summary>

```bash
# 1. Clone
git clone https://github.com/ndimoforaretas/local-gemma-rag.git
cd local-gemma-rag

# 2. Pull Ollama models
ollama pull gemma4:e4b        # Chat + thinking + vision + tools (~9.6 GB)
ollama pull embeddinggemma    # Dense embeddings (~622 MB)

# 3. Start PostgreSQL
docker compose up -d db

# 4. Python environment
python3 -m venv .venv
source .venv/bin/activate     # macOS / Linux
pip install -r requirements.txt

# 5. Database migration
dbos migrate

# 6. Seed the built-in user guide
python scripts/seed_knowledge_base.py

# 7. Build the frontend
cd frontend && npm install && npm run build && cd ..

# 8. Launch
python -m backend.main
```

</details>

> **OCR for scanned PDFs (optional):** install `tesseract` for image-only PDF support.
> `brew install tesseract` (macOS) · `apt install tesseract-ocr` (Debian/Ubuntu)

---

## 🗺️ How to Use

### 1 — Build Your Knowledge Base

Open the **Knowledge Base** tab. You can add documents in several ways:

- **Drag and drop files** onto the upload zone — or click to browse
- **Attach files in chat** and save them to the KB with one click

Supported formats: **PDF · DOCX · PPTX · XLSX · Markdown · CSV · TXT · HTML**

After uploading, click **Ingest** to embed the documents. A progress panel shows each step. Re-upload an edited file and it is automatically re-indexed — stale chunks are replaced, not duplicated.

### 2 — Chat

Switch to the **Chat** tab and ask a question. CogniVault will:

1. **Reason** about the query (🧠 Reasoning panel, collapsible)
2. **Search** your documents using hybrid semantic + keyword retrieval
3. **Answer** with inline citations linking back to exact source chunks

**Attaching files to chat:** click the paperclip to attach up to 5 files at once (images, PDFs, DOCX, text). Images go to Gemma's vision model; documents are extracted and included as context.

**Voice input:** click the 🎤 mic button to dictate your question — transcribed locally by Whisper, no cloud STT required.

### 3 — Work with Citations

After each answer a **Sources** panel appears on the right (or tap **"N sources ↗"** on mobile to open the drawer). Each citation card shows:

- The source filename and page number
- **View chunk** — click to reveal the exact retrieved passage Gemma used
- **Open** — jump directly to the source file

### 4 — Edit and Regenerate

Hover over any of your messages to reveal an **✏️ Edit** button — click to modify and resend. Every subsequent message is removed and the conversation resumes cleanly from that point. On AI responses, **🔄 Regenerate** re-runs the same query for a fresh answer.

---

## ✨ Features

### 🧠 Thinking Mode

Before answering, Gemma 4 streams its step-by-step reasoning into a collapsible **🧠 Reasoning** panel. Collapsed by default; expand to inspect _how_ the AI reached its conclusion. An auditability feature for regulated industries — not just a demo gimmick.

### 🔍 Hybrid Retrieval

Dense FAISS semantic search is combined with BM25 keyword search via **Reciprocal Rank Fusion**. Semantic search finds conceptually relevant chunks; BM25 catches exact terminology and acronyms. Both run entirely in-memory for sub-millisecond latency.

### 📄 Eight Document Formats

| Format       | How it's chunked                                        |
| ------------ | ------------------------------------------------------- |
| **PDF**      | Page-by-page; OCR fallback for scanned/image-only pages |
| **DOCX**     | Paragraphs and table rows                               |
| **PPTX**     | One chunk per slide                                     |
| **XLSX**     | Header row + batched data rows, per sheet               |
| **Markdown** | Split on H1/H2/H3 headers with breadcrumb prefix        |
| **CSV**      | Header row repeated in every chunk                      |
| **TXT**      | Recursive character splitting                           |
| **HTML**     | Trafilatura clean-text extraction                       |

Structure-aware chunking means the model always has the right context — a CSV chunk always starts with column names; a Markdown chunk always includes its section heading.

### 📎 Citation Previews

Every source card in the Context sidebar has a **View chunk** toggle that reveals the exact passage Gemma retrieved — no more guessing why a particular document was cited.

### 🖼️ Multimodal Chat

Attach images for Gemma 4 vision analysis. Attach PDFs or DOCX files to have their text extracted and included as conversation context. Up to 5 attachments per message. Thumbnails persist in session history.

### 🎤 Voice Input

Click the mic button to record your question. Local Whisper transcription converts the audio to text and appends it to the input — no cloud speech API involved.

### 📝 Edit & Regenerate

Edit any past message and resend — the conversation history and the model's internal context window are both rewound to the correct point. Regenerate any AI response for a fresh attempt.

### 🔒 Privacy Vault Audit Panel

A live dashboard in the Knowledge Base tab shows: document count, total chunks, FAISS index size, last ingestion time, Ollama host, and a **"Zero external API calls"** indicator. Everything is provably local.

### 📚 Agentic Document Tools

The agent can reason _about_ your vault — not just search it:

| Tool                                | What it does                                           |
| ----------------------------------- | ------------------------------------------------------ |
| `list_documents()`                  | Inventory of indexed files with types and chunk counts |
| `analyze_document(filename)`        | Structured summary: topics, entities, key facts        |
| `compare_documents(a, b, question)` | Side-by-side comparison answering a specific question  |

### 💬 Multi-Session History

Independent conversation threads with auto-generated titles, a collapsible history sidebar, and full persistence across restarts.

---

## ⚙️ Configuration

```bash
cp .env.example .env
```

| Variable             | Default                                              | Description                                               |
| -------------------- | ---------------------------------------------------- | --------------------------------------------------------- |
| `LLM_MODEL`          | `gemma4:e4b`                                         | Chat model                                                |
| `EMBEDDING_MODEL`    | `embeddinggemma`                                     | Embedding model                                           |
| `OLLAMA_HOST`        | `http://localhost:11434`                             | Ollama server URL                                         |
| `THINKING_MODE`      | `true`                                               | Enable/disable 🧠 Reasoning panel                         |
| `WHISPER_MODEL`      | `base`                                               | Whisper model size (`tiny` · `base` · `small` · `medium`) |
| `DB_URL`             | `postgresql://postgres:password@localhost:5432/dbos` | PostgreSQL connection                                     |
| `MAX_UPLOAD_SIZE_MB` | `500`                                                | Per-file upload limit                                     |
| `CHUNK_SIZE`         | `1000`                                               | Characters per chunk                                      |
| `CHUNK_OVERLAP`      | `100`                                                | Overlap between adjacent chunks                           |

---

## 🏗️ Architecture

### Request Flow

```
Browser
  │  HTTP / SSE streaming
  ▼
FastAPI (backend/main.py)
  │
  ├── POST /rag ──────────► Phase 1: direct Ollama call (thinking=True)
  │                              emits {"type":"thinking","data":"..."}
  │                         Phase 2: Strands Agent (tool loop + answer)
  │                              emits {"type":"text"|"metadata","data":...}
  │
  ├── POST /upload ────────► validate → save to docs/
  ├── POST /ingest ────────► durable workflow (hash-aware, crash-resumable)
  ├── GET  /kb ───────────► knowledge base file listing
  ├── GET  /api/vault/stats► privacy audit stats
  ├── GET  /api/docs/list ► indexed document inventory
  ├── DELETE /api/docs/:f ► soft-delete chunks + remove file
  ├── POST /api/save-to-kb► base64 attachment → docs/ → ingest
  ├── POST /api/transcribe► Whisper audio → text
  └── GET|POST|DELETE
      /api/history ───────► multi-session chat persistence
```

### Agent Tools

```
search_knowledge_base(query)              → FAISS + BM25 hybrid, top-7, RRF fusion
list_documents()                          → vault inventory
analyze_document(filename)                → inner Gemma call for structured summary
compare_documents(doc_a, doc_b, question) → inner Gemma call for comparison
calculator(expression)                    → safe AST evaluator (no eval())
current_time()                            → timestamp
```

### Ingestion Pipeline

Each ingestion run is a crash-resumable workflow. Every step is checkpointed — if the server restarts mid-way, it picks up from the last completed batch.

```
1. Scan docs/  →  SHA-256 hash per file
                  New file      → queue for embedding
                  Changed file  → soft-delete old chunks → re-embed
                  Unchanged     → skip (fully idempotent)

2. Extract text
   PDF    → pypdf page-by-page; pytesseract OCR fallback for image pages
   DOCX   → python-docx (paragraphs + table rows)
   PPTX   → python-pptx (one chunk per slide)
   XLSX   → openpyxl (header + row batches, per sheet)
   MD     → MarkdownHeaderTextSplitter (H1/H2/H3 → breadcrumb chunks)
   CSV    → header row + 20-row batches
   TXT    → raw UTF-8 read
   HTML   → trafilatura clean text

3. Chunk  →  RecursiveCharacterTextSplitter (1 000 chars, 100 overlap)
             Structured formats (MD, CSV, PPTX, XLSX) use min_length=20

4. Embed  →  embeddinggemma via Ollama, batches of 5

5. Save   →  append to FAISS IndexFlatIP + JSON metadata on disk
```

### Storage

| Layer        | Files                                     | Purpose                                       |
| ------------ | ----------------------------------------- | --------------------------------------------- |
| **Disk**     | `vector_store.faiss`, `vector_store.json` | Embeddings and chunk metadata                 |
| **RAM**      | `VectorDB` singleton                      | Sub-ms hybrid search (FAISS + BM25 in-memory) |
| **Postgres** | DBOS system tables                        | Workflow checkpoints for crash recovery       |

All storage is local. The Vault Audit Panel confirms no external connections at runtime.

---

## 🛠️ Tech Stack

| Layer                | Technology                                                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **LLM & Embeddings** | [Ollama](https://ollama.com) · `gemma4:e4b` · `embeddinggemma`                                                               |
| **Agent Framework**  | [Strands Agents SDK](https://github.com/strands-agents/sdk-python)                                                           |
| **Backend**          | [FastAPI](https://fastapi.tiangolo.com) · Python 3.10+ · Pydantic                                                            |
| **Vector Search**    | [FAISS](https://github.com/facebookresearch/faiss) IndexFlatIP + [BM25Okapi](https://github.com/dorianbrown/rank_bm25) · RRF |
| **Document Parsing** | pypdf · python-docx · python-pptx · openpyxl · trafilatura · httpx                                                           |
| **OCR**              | pytesseract · pymupdf · Pillow                                                                                               |
| **Audio**            | faster-whisper (local Whisper inference)                                                                                     |
| **Workflow Engine**  | [DBOS](https://dbos.dev) + PostgreSQL                                                                                        |
| **Frontend**         | React 19 · TypeScript · Vite · TanStack Query · Framer Motion · Tailwind CSS v4                                              |

---

## 📁 Project Structure

```
├── backend/
│   ├── main.py                  # FastAPI app + router mounts
│   ├── config.py                # Centralised settings (.env → pydantic-settings)
│   ├── routers/
│   │   ├── rag.py               # POST /rag — two-phase stream
│   │   ├── knowledge.py         # Upload, ingest, URL, KB browse, vault stats
│   │   ├── history.py           # Multi-session chat persistence
│   │   └── audio.py             # Whisper transcription endpoints
│   ├── services/
│   │   ├── rag_agent.py         # Two-phase thinking + Strands agent stream
│   │   ├── vector_db.py         # Hybrid FAISS+BM25 search, RRF, delete
│   │   └── ingest.py            # Durable ingestion workflow + all extractors
│   ├── tools/agent_tools.py     # 6 agent tools
│   ├── models/schemas.py        # Pydantic request/response models
│   └── tests/                   # 202 tests across 12 test files
├── frontend/src/
│   ├── components/
│   │   ├── KnowledgeBase.tsx    # Chat UI + streaming consumer
│   │   ├── ChatMessageList.tsx  # Messages + ThinkingPanel + edit/regen
│   │   ├── ChatInput.tsx        # Input bar + attachments + mic
│   │   ├── ContextSidebar.tsx   # Citation sidebar (push on desktop, drawer on mobile)
│   │   ├── KnowledgeSync.tsx    # Upload drop zone + ingestion progress
│   │   ├── VaultAudit.tsx       # Privacy Vault Audit Panel
│   │   └── HistorySidebar.tsx   # Multi-session history
│   ├── lib/api.ts               # Typed API client
│   └── types/api.ts             # Shared TypeScript interfaces
├── docs/GUIDE.md                # Pre-seeded user guide
├── docker-compose.yaml          # PostgreSQL
├── requirements.txt
└── scripts/
    ├── setup.sh                 # One-time setup
    ├── start.sh                 # Start app
    └── stop.sh                  # Stop app
```

---

## 🧪 Testing

```bash
# Run all tests (Ollama and Postgres are fully mocked — no infrastructure needed)
python -m pytest backend/tests/ -v
```

**202 tests** across 12 test files:

| Test File                    | What it covers                                           |
| ---------------------------- | -------------------------------------------------------- |
| `test_api.py`                | All HTTP endpoints (upload, ingest, RAG, history, vault) |
| `test_tools.py`              | Calculator, clock, KB search tool                        |
| `test_thinking.py`           | Two-phase stream, thinking tokens, session isolation     |
| `test_chat_attachments.py`   | Multi-file attach, PDF/DOCX extraction, size limits      |
| `test_doc_scope_filter.py`   | Per-request ContextVar isolation, search filtering       |
| `test_doc_tools.py`          | list_documents, analyze_document, compare_documents      |
| `test_edit_regenerate.py`    | History rewind, trim_history_to_turns validation         |
| `test_structure_chunking.py` | Markdown header splits, CSV row batches, doc types       |
| `test_ocr_fallback.py`       | OCR trigger threshold, graceful degradation              |
| `test_new_formats.py`        | PPTX, XLSX, HTML extractors, extension routing           |
| `test_reingest.py`           | SHA-256 change detection, idempotency                    |
| `test_vector_db.py`          | BM25, FAISS, RRF fusion, hybrid search                   |

---

## 🔧 Troubleshooting

| Symptom                           | Likely cause                     | Fix                                                                         |
| --------------------------------- | -------------------------------- | --------------------------------------------------------------------------- |
| `"An internal error occurred"`    | Ollama not running               | Open Ollama, confirm with `ollama list`                                     |
| Port 8000 already in use          | Previous server still running    | `lsof -ti :8000 \| xargs kill -9`                                           |
| Cannot connect to Docker          | Docker Desktop not running       | Open Docker Desktop                                                         |
| DB connection error               | PostgreSQL not started           | `docker compose up -d db`                                                   |
| Suggestion cards empty            | KB not seeded                    | `python scripts/seed_knowledge_base.py`                                     |
| 🧠 Reasoning panel missing        | Thinking mode off or wrong model | Confirm `gemma4:e4b` is pulled; check `THINKING_MODE=true`                  |
| 🎤 Mic button transcription fails | faster-whisper not installed     | `pip install faster-whisper`                                                |
| OCR not working on scanned PDFs   | pytesseract/pymupdf missing      | `pip install pymupdf pytesseract Pillow` + `brew install tesseract` (macOS) |

---

<div align="center">

Built with [Gemma 4](https://ollama.com/library/gemma4) · [Ollama](https://ollama.com) · [Strands Agents](https://github.com/strands-agents/sdk-python) · [FastAPI](https://fastapi.tiangolo.com)

_Your data. Your hardware. Your AI._

</div>
