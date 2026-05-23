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

The app has **four top-level sections** in the sidebar, each highlighted in purple when active. Your current section persists across browser refreshes.

### 1 — Build Your Knowledge Base

Open the **Knowledge Base** tab. You can add documents in several ways:

- **Drag and drop files** onto the upload zone — or click to browse
- **Attach files in chat** and save them to the KB with one click

Supported formats: **PDF · DOCX · PPTX · XLSX · Markdown · CSV · TXT · HTML**

After uploading, click **Ingest** to embed the documents. A progress panel shows each step. **Re-upload an edited file** and SHA-256 content hashing automatically detects the change — stale chunks are soft-deleted, the new content is re-indexed in their place.

**Organise with categories.** Tag each document so the scope filter can let you study one topic at a time.

### 2 — Chat

Switch to the **Chat** tab and ask a question. CogniVault will:

1. **Reason** about the query (🧠 Reasoning panel, collapsible)
2. **Search** your documents using hybrid semantic + keyword retrieval
3. **Answer** with inline citations linking back to exact source chunks

**Scope the chat to specific documents** by clicking the filter pill above the composer. Pick a category or individual files — only those will be searched. Active scope is stamped on the user message as a purple badge for permanent history.

**Attach files to a single message** — paperclip icon, up to 5 files (images, PDFs, DOCX, text). Images go to Gemma's vision; documents are extracted and included as context.

**Voice input** — click the 🎤 mic to dictate, transcribed locally by Whisper.

### 3 — Work with Citations

After each answer a **Sources** panel appears on the right (or tap **"N sources ↗"** on mobile to open the drawer). Each citation card shows the source filename, page number, relevance score, **View chunk** to reveal the exact retrieved passage, and **Open** to jump to the source file.

### 4 — Edit and Regenerate

Hover over any of your messages to reveal an **✏️ Edit** button — click to modify and resend. Subsequent messages are removed and the conversation resumes from that point. On AI responses, **🔄 Regenerate** re-runs the query for a fresh answer.

### 5 — Study Hub (4 modes)

Switch to **Study Hub** and pick a mode. All four turn your scoped documents into active learning material:

- **🧠 Quiz Mode** — auto-generated quizzes (5/10/20 questions, MCQ + True/False, 3 difficulties). Instant feedback per question. Resume on refresh. Export as Markdown or PDF.
- **📖 Workshop Creator** — multi-lesson workshops (5 or 10 lessons). Two-pass generation: outline first, lessons rendered on demand with a sticky right-side TOC. Mark each lesson complete, then take a recap quiz.
- **🃏 Flashcards** — flip-card decks (10/20/40 cards). 3D flip animation. Mark **Got it** / **Review** per card. Status-aware gradient borders. Filter chips to revisit only what still needs work.
- **🗺️ Mindmaps** — radial concept maps with pan + zoom. Export as Markdown, PNG, or PDF.

### 6 — Track Your Progress

Open the **Dashboard** tab to see:

- **Total study time, sessions, current streak** — three hero stat cards
- **Achievement strip** — horizontally scrollable row of 25 badges (earned in colour, locked dimmed)
- **GitHub-style activity heatmap** — last 90 days, 5 purple intensity levels by daily duration. Click any day for that day's details + achievements earned

---

## ✨ Features

### 🎓 Study Hub

Four AI-powered study modes — all scope-aware, all stateful, all exportable:

| Mode               | What it generates                                          | Export                  |
| ------------------ | ---------------------------------------------------------- | ----------------------- |
| **Quiz Mode**      | Multiple-choice + True/False quizzes (3 difficulties)      | Markdown · PDF          |
| **Workshop Creator** | Multi-lesson workshops with intro / core / takeaways      | Coming soon             |
| **Flashcards**     | Flip-card decks with per-card Got-it / Review status       | Coming soon             |
| **Mindmaps**       | Interactive radial concept maps (pan / zoom)               | Markdown · PNG · PDF    |

Each generated artefact is persisted to local SQLite — come back to it whenever, no regeneration needed. Quizzes resume from where you left off if you refresh mid-quiz.

### 📊 Progress Dashboard

A standalone view that tracks every interaction:

- **Total study time** with a 15-minute idle-gap session model — automatically counts chat, quiz, workshop, and flashcard activity
- **GitHub-style 90-day heatmap** with 5 purple intensity levels (no activity → 3+ hours)
- **Click any heatmap day** to drill into time, sessions, messages, and achievements earned that day
- **60s background refetch** — finish a quiz in another tab and the dashboard updates without reload

### 🏆 25 Achievement Badges

Auto-tracked across all activity. Examples: 🎯 First Question · 🔥 7-Day Streak · 💯 Perfect Score · 🎓 Workshop Graduate · 🎴 Deck Master · 🗺️ Mind Mapper · 🌙 Night Owl. Full list in the [user guide](docs/GUIDE.md).

### 🔍 Document Scope Filter

Limit any chat or study-mode generation to a category, subset of files, or single document. The active scope is stamped on user messages as a purple badge for permanent history. Mandatory for all Study Hub modes — focused scope → focused output.

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

| Variable                            | Default                                              | Description                                                  |
| ----------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------ |
| `LLM_MODEL`                         | `gemma4:e4b`                                         | Chat model                                                   |
| `EMBEDDING_MODEL`                   | `embeddinggemma`                                     | Embedding model                                              |
| `OLLAMA_HOST`                       | `http://localhost:11434`                             | Ollama server URL                                            |
| `THINKING_MODE`                     | `true`                                               | Enable/disable 🧠 Reasoning panel                            |
| `WHISPER_MODEL`                     | `base`                                               | Whisper model size (`tiny` · `base` · `small` · `medium`)    |
| `DB_URL`                            | `postgresql://postgres:password@localhost:5432/dbos` | PostgreSQL connection                                        |
| `PROGRESS_DB_FILE`                  | `progress.db`                                        | SQLite for study sessions, achievements, quizzes, decks…     |
| `STUDY_SESSION_IDLE_GAP_SECONDS`    | `900`                                                | Idle gap (sec) that ends a study session — default 15 min    |
| `MAX_UPLOAD_SIZE_MB`                | `500`                                                | Per-file upload limit                                        |
| `CHUNK_SIZE`                        | `1000`                                               | Characters per chunk                                         |
| `CHUNK_OVERLAP`                     | `100`                                                | Overlap between adjacent chunks                              |

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

### Storage

| Layer        | Files                                          | Purpose                                                  |
| ------------ | ---------------------------------------------- | -------------------------------------------------------- |
| **Disk**     | `vector_store.faiss`, `vector_store.json`      | Embeddings and chunk metadata                            |
| **Disk**     | `categories.json`                              | Document → category mapping                              |
| **Disk**     | `chat_history.json`                            | Multi-session chat persistence                           |
| **SQLite**   | `progress.db`                                  | Study sessions, quizzes, workshops, decks, mindmaps, badges |
| **RAM**      | `VectorDB` singleton                           | Sub-ms hybrid search (FAISS + BM25 in-memory)            |
| **Postgres** | DBOS system tables                             | Workflow checkpoints for crash recovery                  |
| **Browser**  | `localStorage`                                 | Active view + in-progress quiz resume                    |

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
| Quiz / mindmap returns fewer items than requested | Scope too broad     | Narrow the scope (one file or one category) and regenerate                  |
| Achievement / dashboard data missing | `progress.db` not yet created | Will be created automatically on first message / quiz / etc.                |

---

<div align="center">

Built with [Gemma 4](https://ollama.com/library/gemma4) · [Ollama](https://ollama.com) · [Strands Agents](https://github.com/strands-agents/sdk-python) · [FastAPI](https://fastapi.tiangolo.com)

_Your data. Your hardware. Your AI._

</div>
