<div align="center">

![Gemma CogniVault Banner](frontend/public/gemma-cognivault-banner.png)

# Gemma CogniVault

### A fully local, privacy-first AI Study Companion powered by Gemma 4

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Gemma 4](https://img.shields.io/badge/Gemma%204-e4b-4285F4?logo=google&logoColor=white)](https://ollama.com/library/gemma4)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-312%20passing-brightgreen)](#-testing)

**Chat with your documents. Generate quizzes, workshops, flashcards, mindmaps. Track your progress. Nothing leaves your machine.**

</div>

---

## Table of Contents

1. [Why CogniVault](#-why-cognivault)
2. [Quick Start](#-quick-start)
3. [How to Use](#️-how-to-use)
4. [Features](#-features)
5. [Configuration](#️-configuration)
6. [Architecture](#️-architecture)
7. [Tech Stack](#️-tech-stack)
8. [Project Structure](#-project-structure)
9. [Testing](#-testing)
10. [Troubleshooting](#-troubleshooting)

---

## 🔒 Why CogniVault

AI assistants are transforming knowledge work — but for teams in **regulated and privacy-sensitive sectors** — **education** (trainers, academic researchers, students under exam confidentiality), **finance**, **healthcare**, **legal**, **public administration** — cloud AI creates an unacceptable risk surface: unknown data centres, uncertain jurisdictions, and audit trails that stop at the API boundary.

**CogniVault is a 100% local AI Study Companion.** Your documents stay on your hardware. Inference runs via Ollama on `localhost`. No telemetry, no embeddings sent to third parties, no exceptions. A live Privacy Vault Audit Panel confirms zero external connections at runtime.

It's also genuinely capable — Gemma 4's full surface (completion, vision, tools, reasoning) running on your laptop, wrapped in an app that turns your documents into **quizzes, multi-lesson workshops, flashcard decks, and visual mindmaps**, with a learning-progress dashboard and 25 achievement badges to keep you coming back.

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

The app has **four top-level sections** in the sidebar — each highlighted in purple when active, each remembered across browser refreshes:

| Section               | What it's for                                                                         |
| --------------------- | ------------------------------------------------------------------------------------- |
| **💬 Chat**           | Ask anything about your documents. Cited answers, scope filter, voice, attachments.   |
| **📚 Knowledge Base** | Upload, categorise, and manage your documents. SHA-256 change detection on re-upload. |
| **🎓 Study Hub**      | Four AI-powered study modes: Quiz · Workshop · Flashcards · Mindmaps.                 |
| **📊 Dashboard**      | Total study time, current streak, 25 achievement badges, 90-day activity heatmap.     |

> **Full walkthrough** — every feature, every keyboard shortcut, every export option:
> 📖 **[docs/GUIDE.md](docs/GUIDE.md)** (also pre-loaded into the knowledge base and powers the 15-tile starter card grid on a new chat).

---

## ✨ Features

A compact tour of what ships in the box. Each row links to the section of the user guide with the full reference.

### Chat

- **🧠 Thinking Mode** — collapsible reasoning panel streams Gemma 4's chain of thought before the answer
- **🔍 Hybrid Retrieval** — FAISS dense + BM25 keyword fused with Reciprocal Rank Fusion
- **🔍 Document Scope Filter** — limit any question to a category or specific files; stamped on the message as a permanent badge
- **📎 Citation Previews** — every source card expands to show the exact chunk + page number
- **🖼️ Multimodal** — attach up to 5 images / PDFs / DOCX per message
- **🎤 Voice Input** — local Whisper transcription
- **📝 Edit & Regenerate** — rewind history to any turn and resend
- **💬 Multi-Session History** — auto-titled threads, persisted to disk

### Knowledge Base

- **📄 8 document formats** — PDF (with OCR), DOCX, PPTX, XLSX, MD, CSV, TXT, HTML — each with structure-aware chunking
- **📂 Categories** — tag documents into topical folders; powers the scope filter and Study Hub modes
- **🔁 Hash-aware re-ingest** — re-upload an edited file and SHA-256 detection auto-replaces old chunks
- **🛟 Durable workflows** — DBOS-checkpointed; crash-safe and resumable

### Study Hub (4 modes)

- **🧠 Quiz Mode** — 5 / 10 / 20 questions · MCQ + True/False · 3 difficulties · resume on refresh · export Markdown + PDF
- **📖 Workshop Creator** — 5 or 10 lessons · two-pass generation (outline first, lessons on demand) · sticky right-side TOC · recap quiz on completion
- **🃏 Flashcards** — 10 / 20 / 40 cards · CSS 3D flip · per-card Got-it / Review status · status-aware gradient borders
- **🗺️ Mindmaps** — radial concept maps · pan + zoom · export Markdown · PNG · PDF

### Progress Dashboard

- **Three hero stats** — total study time, sessions, current streak
- **🏆 25 Achievement Badges** — auto-tracked across chat (10), quizzes (4), workshops (4), flashcards (4), mindmaps (3)
- **GitHub-style 90-day heatmap** — 5 purple intensity levels by daily duration · click any day for the drill-down modal

### Privacy & Persistence

- **🔒 Privacy Vault Audit Panel** — live "zero external connections" indicator, document/chunk counts, Ollama host
- **Everything local** — vectors, chat history, categories, study sessions, achievements all on disk
- **Native Save-As dialogs** for exports via the browser File System Access API (with graceful fallback)

> **For the complete user-facing reference** — including keyboard shortcuts, export content levels, badge unlock criteria, idle-gap session model, and FAQ:
> 📖 **[docs/GUIDE.md](docs/GUIDE.md)**

---

## ⚙️ Configuration

```bash
cp .env.example .env
```

| Variable                         | Default                                              | Description                                               |
| -------------------------------- | ---------------------------------------------------- | --------------------------------------------------------- |
| `LLM_MODEL`                      | `gemma4:e4b`                                         | Chat model                                                |
| `EMBEDDING_MODEL`                | `embeddinggemma`                                     | Embedding model                                           |
| `OLLAMA_HOST`                    | `http://localhost:11434`                             | Ollama server URL                                         |
| `THINKING_MODE`                  | `true`                                               | Enable/disable 🧠 Reasoning panel                         |
| `WHISPER_MODEL`                  | `base`                                               | Whisper model size (`tiny` · `base` · `small` · `medium`) |
| `DB_URL`                         | `postgresql://postgres:password@localhost:5432/dbos` | PostgreSQL connection                                     |
| `PROGRESS_DB_FILE`               | `progress.db`                                        | SQLite for study sessions, achievements, quizzes, decks…  |
| `STUDY_SESSION_IDLE_GAP_SECONDS` | `900`                                                | Idle gap (sec) that ends a study session — default 15 min |
| `MAX_UPLOAD_SIZE_MB`             | `500`                                                | Per-file upload limit                                     |
| `CHUNK_SIZE`                     | `1000`                                               | Characters per chunk                                      |
| `CHUNK_OVERLAP`                  | `100`                                                | Overlap between adjacent chunks                           |

---

## 🏗️ Architecture

### Request Flow

```
Browser
  │  HTTP / SSE streaming
  ▼
FastAPI (backend/main.py)
  │
  ├── POST /rag ──────────────► Phase 1: direct Ollama call (thinking=True)
  │                                  emits {"type":"thinking","data":"..."}
  │                             Phase 2: Strands Agent (tool loop + answer)
  │                                  emits {"type":"text"|"metadata","data":...}
  │
  ├── POST /upload ────────────► validate → save to docs/
  ├── POST /ingest ────────────► durable workflow (hash-aware, crash-resumable)
  ├── GET  /kb ────────────────► knowledge base file listing
  ├── GET  /api/vault/stats ───► privacy audit stats
  ├── GET  /api/docs/list ─────► indexed document inventory
  ├── DELETE /api/docs/:f ─────► soft-delete chunks + remove file
  ├── POST /api/save-to-kb ────► base64 attachment → docs/ → ingest
  ├── POST /api/transcribe ────► Whisper audio → text
  ├── GET|POST|DELETE
  │   /api/history ────────────► multi-session chat persistence
  │
  ├── /api/study/quiz/* ───────► generate quiz, submit attempt
  ├── /api/study/workshop/* ───► outline + per-lesson generation, completion
  ├── /api/study/flashcards/* ─► deck CRUD, card status + flip tracking
  ├── /api/study/mindmaps/* ───► mindmap CRUD, export count
  │
  └── /api/progress/* ─────────► summary, daily activity, achievements
```

---

### Agent Tools

The Strands agent has **6 tools** at its disposal. The agent decides which to call (and in what order) based on the user's question — no hard-coded routing. All run locally, all return data the agent can chain into the next call.

| Tool                                        | Purpose                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------ |
| `search_knowledge_base(query)`              | Hybrid FAISS + BM25 search, top-7, RRF fusion. Scope-filter-aware.             |
| `list_documents()`                          | Inventory of every indexed file with type and chunk count.                     |
| `analyze_document(filename)`                | Inner Gemma call producing a structured summary (topics, entities, key facts). |
| `compare_documents(doc_a, doc_b, question)` | Inner Gemma call answering a specific question across two documents.           |
| `calculator(expression)`                    | Safe AST evaluator — no `eval()`, no arbitrary code.                           |
| `current_time()`                            | Timestamp for time-aware queries.                                              |

---

### Ingestion Pipeline

Each ingestion run is a crash-resumable DBOS workflow. Every step is checkpointed — if the server restarts mid-way, it picks up from the last completed batch.

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

---

### Study-Mode Generation

All four Study Hub modes share a defensive pattern designed around the realities of local LLM JSON output:

```
1. Retrieve  →  hybrid search restricted by user-selected scope
2. Prompt    →  strict JSON schema with explicit count + shape rules
3. Generate  →  ollama.chat with format="json" (grammar-constrained)
4. Parse     →  json.loads with trailing-comma + smart-quote repair fallback
5. Validate  →  drop malformed items rather than fail the whole batch
6. Retry     →  workshops auto-retry once with a stronger prompt on parse failure
7. Persist   →  SQLite (progress.db) so the user can come back later
```

---

### Storage

| Layer        | Files                                     | Purpose                                                     |
| ------------ | ----------------------------------------- | ----------------------------------------------------------- |
| **Disk**     | `vector_store.faiss`, `vector_store.json` | Embeddings and chunk metadata                               |
| **Disk**     | `categories.json`                         | Document → category mapping                                 |
| **Disk**     | `chat_history.json`                       | Multi-session chat persistence                              |
| **SQLite**   | `progress.db`                             | Study sessions, quizzes, workshops, decks, mindmaps, badges |
| **RAM**      | `VectorDB` singleton                      | Sub-ms hybrid search (FAISS + BM25 in-memory)               |
| **Postgres** | DBOS system tables                        | Workflow checkpoints for crash recovery                     |
| **Browser**  | `localStorage`                            | Active view + in-progress quiz resume                       |

All storage is local. The Vault Audit Panel confirms no external connections at runtime.

---

## 🛠️ Tech Stack

| Layer                 | Technology                                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **LLM & Embeddings**  | [Ollama](https://ollama.com) · `gemma4:e4b` · `embeddinggemma`                                                               |
| **Agent Framework**   | [Strands Agents SDK](https://github.com/strands-agents/sdk-python)                                                           |
| **Backend**           | [FastAPI](https://fastapi.tiangolo.com) · Python 3.10+ · Pydantic                                                            |
| **Vector Search**     | [FAISS](https://github.com/facebookresearch/faiss) IndexFlatIP + [BM25Okapi](https://github.com/dorianbrown/rank_bm25) · RRF |
| **Document Parsing**  | pypdf · python-docx · python-pptx · openpyxl · trafilatura · httpx                                                           |
| **OCR**               | pytesseract · pymupdf · Pillow                                                                                               |
| **Audio**             | faster-whisper (local Whisper inference)                                                                                     |
| **Workflow Engine**   | [DBOS](https://dbos.dev) + PostgreSQL                                                                                        |
| **Study + Progress**  | SQLite via Python `sqlite3` (zero new deps)                                                                                  |
| **Frontend**          | React 19 · TypeScript · Vite · TanStack Query · Framer Motion · Tailwind CSS v4 · `marked`                                   |
| **Mindmap Rendering** | Hand-rolled SVG with pan/zoom (no `@xyflow/react`, no `d3`)                                                                  |
| **Mindmap Export**    | `XMLSerializer` → `<img>` → `<canvas>` → PNG/PDF (zero export-library deps)                                                  |

---

## 📁 Project Structure

```
├── backend/
│   ├── main.py                     # FastAPI app + router mounts
│   ├── config.py                   # Centralised settings (.env → pydantic-settings)
│   ├── routers/
│   │   ├── rag.py                  # POST /rag — two-phase stream
│   │   ├── knowledge.py            # Upload, ingest, URL, KB browse, vault stats
│   │   ├── history.py              # Multi-session chat persistence
│   │   ├── audio.py                # Whisper transcription endpoints
│   │   ├── study.py                # Quiz + Workshop + Flashcard + Mindmap endpoints
│   │   └── progress.py             # Dashboard data (summary, daily, achievements)
│   ├── services/
│   │   ├── rag_agent.py            # Two-phase thinking + Strands agent stream
│   │   ├── vector_db.py            # Hybrid FAISS+BM25 search, RRF, delete
│   │   ├── ingest.py               # Durable ingestion workflow + all extractors
│   │   ├── progress_tracker.py     # SQLite layer for sessions, quizzes, decks, …
│   │   ├── achievements.py         # 25 badge definitions + evaluator
│   │   ├── quiz_generator.py       # Quiz JSON generator (format="json" + repair)
│   │   ├── workshop_generator.py   # Two-pass outline + lesson generator
│   │   ├── flashcard_generator.py  # Flashcard deck generator
│   │   └── mindmap_generator.py    # Mindmap tree generator
│   ├── tools/agent_tools.py        # 6 agent tools
│   ├── models/schemas.py           # Pydantic request/response models
│   └── tests/                      # 312 tests across 16 test files
├── frontend/src/
│   ├── App.tsx                     # Top-level shell + view persistence
│   ├── components/
│   │   ├── Sidebar.tsx             # 4-section nav with purple-pill active state
│   │   ├── Breadcrumbs.tsx         # Shared phase-aware navigation crumbs
│   │   ├── KnowledgeBase.tsx       # Chat UI + streaming consumer
│   │   ├── ChatMessageList.tsx     # Messages + ThinkingPanel + edit/regen
│   │   ├── ChatInput.tsx           # Input bar + attachments + mic
│   │   ├── ContextSidebar.tsx      # Citation sidebar
│   │   ├── DocScopeFilter.tsx      # Category-aware scope picker
│   │   ├── KnowledgeSync.tsx       # Upload drop zone + ingestion progress
│   │   ├── VaultAudit.tsx          # Privacy Vault Audit Panel
│   │   ├── HistorySidebar.tsx      # Multi-session history
│   │   ├── SuggestionCards.tsx     # 15-tile starter grid (GUIDE-scoped)
│   │   ├── study/                  # Study Hub — all 4 modes
│   │   │   ├── StudyHub.tsx        # Mode picker
│   │   │   ├── QuizMode.tsx        # Quiz orchestrator
│   │   │   ├── WorkshopMode.tsx    # Workshop orchestrator
│   │   │   ├── FlashcardsMode.tsx  # Flashcards orchestrator
│   │   │   ├── MindmapsMode.tsx    # Mindmaps orchestrator
│   │   │   ├── quiz/               # Quiz panels + state hook + export
│   │   │   ├── workshop/           # Workshop list, outline, lesson, TOC
│   │   │   ├── flashcards/         # Flip card + filter chips + status controls
│   │   │   └── mindmaps/           # SVG renderer + radial layout + export
│   │   └── dashboard/              # Progress Dashboard
│   │       ├── ProgressDashboard.tsx   # Top-level page
│   │       ├── SummaryCards.tsx        # 3 hero stats
│   │       ├── AchievementStrip.tsx    # Horizontal scrollable badges
│   │       ├── ActivityHeatmap.tsx     # GitHub-style 90-day grid
│   │       └── DayDetailModal.tsx      # Per-day drill-down
│   ├── lib/
│   │   ├── api.ts                  # Typed API client
│   │   └── saveBlob.ts             # Native File System Access API + fallback
│   └── types/api.ts                # Shared TypeScript interfaces
├── docs/GUIDE.md                   # Pre-seeded user guide (powers starter cards)
├── docker-compose.yaml             # PostgreSQL
├── requirements.txt
└── scripts/
    ├── setup.sh                    # One-time setup
    ├── start.sh                    # Start app
    └── stop.sh                     # Stop app
```

---

## 🧪 Testing

```bash
# Run all tests (Ollama and Postgres are fully mocked — no infrastructure needed)
python -m pytest backend/tests/ -v
```

**312 tests** across 16 test files:

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
| `test_audio.py`              | Whisper transcription endpoint                           |
| `test_progress.py`           | Sessions, daily aggregation, achievement criteria        |
| `test_quiz.py`               | Quiz parsing, endpoint, quiz achievements                |
| `test_workshop.py`           | Outline + lesson parsing, CRUD, workshop achievements    |
| `test_flashcards.py`         | Deck parsing + CRUD + 4 flashcard achievements           |
| `test_mindmaps.py`           | Tree parsing + CRUD + 3 mindmap achievements             |

---

## 🔧 Troubleshooting

| Symptom                                           | Likely cause                     | Fix                                                                         |
| ------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------- |
| `"An internal error occurred"`                    | Ollama not running               | Open Ollama, confirm with `ollama list`                                     |
| Port 8000 already in use                          | Previous server still running    | `lsof -ti :8000 \| xargs kill -9`                                           |
| Cannot connect to Docker                          | Docker Desktop not running       | Open Docker Desktop                                                         |
| DB connection error                               | PostgreSQL not started           | `docker compose up -d db`                                                   |
| Suggestion cards empty                            | KB not seeded                    | `python scripts/seed_knowledge_base.py`                                     |
| 🧠 Reasoning panel missing                        | Thinking mode off or wrong model | Confirm `gemma4:e4b` is pulled; check `THINKING_MODE=true`                  |
| 🎤 Mic button transcription fails                 | faster-whisper not installed     | `pip install faster-whisper`                                                |
| OCR not working on scanned PDFs                   | pytesseract/pymupdf missing      | `pip install pymupdf pytesseract Pillow` + `brew install tesseract` (macOS) |
| Quiz / mindmap returns fewer items than requested | Scope too broad                  | Narrow the scope (one file or one category) and regenerate                  |
| Achievement / dashboard data missing              | `progress.db` not yet created    | Will be created automatically on first message / quiz / etc.                |

---

<div align="center">

Built with [Gemma 4](https://ollama.com/library/gemma4) · [Ollama](https://ollama.com) · [Strands Agents](https://github.com/strands-agents/sdk-python) · [FastAPI](https://fastapi.tiangolo.com)

\_Your data. Your hardware. Your AI. Your vault.\_

</div>
