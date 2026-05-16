# Gemma CogniVault — Durable Local RAG Pipeline 📚

A full-stack **Local RAG** (Retrieval-Augmented Generation) application that lets you build a private Intelligence Chatbot querying your own PDF documents. All data stays on your machine — no cloud APIs required.

## Tech Stack

| Layer | Technology |
|---|---|
| **LLM & Embeddings** | [Ollama](https://ollama.com) — `gemma4:e4b` (chat) + `embeddinggemma` (dense retrieval) |
| **Backend** | FastAPI · Python 3.10+ |
| **Vector Store** | FAISS (in-memory search, disk-persisted) |
| **Durable Workflows** | [DBOS](https://dbos.dev) + PostgreSQL |
| **Frontend** | React · TypeScript · Vite · TanStack React Query |
| **Agent Framework** | [Strands Agents](https://github.com/strands-agents/sdk-python) |

---

## ✨ Key Features

- **Durable Ingestion** — Upload PDFs and watch them embed in real-time. If the app crashes midway, DBOS resumes from the exact batch it left off on.
- **Multi-Session Chat** — Juggle independent research threads with a history sidebar and auto-generated titles.
- **Smart Knowledge Base** — View, manage, and soft-delete documents from the vector database without re-indexing.
- **Interactive Citations** — Click AI citations to open the exact source PDF.
- **Per-Message Actions** — Copy responses to clipboard or export as formatted Markdown.
- **Agentic Tools** — The AI agent has access to a safe calculator, clock, and knowledge base search tool.

---

## 📁 Project Structure

```
├── backend/                  # Python package (FastAPI + DBOS)
│   ├── main.py               # Application entrypoint
│   ├── config.py             # Centralized config (pydantic-settings)
│   ├── middleware.py          # Request tracing & error handlers
│   ├── routers/
│   │   ├── rag.py            # /rag streaming chat endpoint
│   │   ├── knowledge.py      # /kb, /upload, /ingest, /api/docs
│   │   └── history.py        # /api/history persistence
│   ├── services/
│   │   ├── vector_db.py      # FAISS index management
│   │   ├── rag_agent.py      # Strands agent + streaming
│   │   └── ingest.py         # DBOS durable ingestion workflow
│   ├── models/
│   │   └── schemas.py        # Pydantic request/response models
│   └── tools/
│       └── agent_tools.py    # calculator, clock, KB search
├── frontend/                 # React + TypeScript + Vite
│   └── src/
│       ├── components/       # Decomposed UI components
│       ├── lib/api.ts        # Typed API client
│       └── types/api.ts      # Shared TypeScript interfaces
├── docker-compose.yaml       # PostgreSQL for DBOS
├── Dockerfile                # Production container image
├── requirements.txt          # Python dependencies
└── .env.example              # Environment variable template
```

---

## 🚀 Quick Start

### Prerequisites

| Tool | Purpose | Install |
|---|---|---|
| **Python 3.10+** | Backend runtime | [python.org](https://www.python.org/downloads/) |
| **Node.js 18+** | Frontend build | [nodejs.org](https://nodejs.org/) |
| **Docker Desktop** | PostgreSQL database | [docker.com](https://www.docker.com/products/docker-desktop/) |
| **Ollama** | Local LLM inference | [ollama.com](https://ollama.com/download) |

### 1. Clone & enter the project

```bash
git clone https://github.com/ndimoforaretas/local-gemma-rag.git
cd local-gemma-rag
```

### 2. Pull the required Ollama models

```bash
ollama pull gemma4:e4b
ollama pull embeddinggemma
```

### 3. Start the PostgreSQL database

DBOS requires a Postgres instance to store durable workflow state.

```bash
docker compose up -d db
```

> **Note:** We only start the `db` service. The application itself runs natively on your machine for the fastest development experience.

### 4. Set up the Python environment

```bash
python3 -m venv .venv
source .venv/bin/activate    # macOS / Linux
pip install -r requirements.txt
```

### 5. Initialize DBOS tables

```bash
dbos migrate
```

### 6. Build the frontend

```bash
cd frontend
npm install
npm run build
cd ..
```

### 7. Launch the application

```bash
python -m backend.main
```

You should see:

```
════════════════════════════════════════════════════════════
  Gemma CogniVault starting
  LLM model    : gemma4:e4b
  Embed model  : embeddinggemma
  Ollama host  : http://localhost:11434
  Vector chunks: 0
════════════════════════════════════════════════════════════
Uvicorn running on http://0.0.0.0:8000
```

### 8. Open the app

Navigate to **[http://localhost:8000](http://localhost:8000)**

1. Go to the **Knowledge Base** tab in the sidebar.
2. Click **Upload Documents** to add your PDFs.
3. Watch the durable ingestion pipeline progress in real-time!
4. Switch to the **Chat** tab to query your knowledge base.

---

## ⚙️ Configuration

Copy the example environment file and adjust as needed:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `LLM_MODEL` | `gemma4:e4b` | Ollama model for chat |
| `EMBEDDING_MODEL` | `embeddinggemma` | Ollama model for embeddings |
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama server URL |
| `DB_URL` | `postgresql://postgres:password@localhost:5432/dbos` | PostgreSQL connection |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | Allowed CORS origins |
| `MAX_UPLOAD_SIZE_MB` | `50` | Max PDF upload size |

---

## 🧠 Why DBOS? (The Durable Workflow Philosophy)

Processing large PDF libraries involves extracting text, chunking, and generating dense embeddings — any step can fail due to memory limits, LLM timeouts, or crashes.

Instead of corrupt states or re-ingesting thousands of pages, the ingestion pipeline uses **DBOS durable workflows**:

1. **`list_document_files`** — Scans `docs/` and identifies new PDFs.
2. **`process_single_document`** — Extracts text page-by-page with metadata.
3. **Text Chunking** — `RecursiveCharacterTextSplitter` breaks documents into 1000-char segments with overlap.
4. **`embed_batch`** — Sends chunks in batches to Ollama. Failed batches are retried individually.
5. **`save_vector_store`** — Durably persists embeddings and metadata to disk.

Every `@DBOS.step()` return value is saved in Postgres. If your machine shuts down mid-process, restarting the server resumes from the exact batch it left off.

---

## 💾 Storage Architecture

| Layer | Files | Purpose |
|---|---|---|
| **Disk** | `vector_store.faiss`, `vector_store.json` | Persistent embeddings and metadata |
| **RAM** | `VectorDB` class | Sub-millisecond in-memory semantic search |
| **Postgres** | DBOS system tables | Durable workflow state and crash recovery |

---

## 🐳 Full Docker Deployment (Optional)

To run the entire stack in containers:

```bash
docker compose up --build
```

This builds the app image, starts PostgreSQL, and serves the application on port 8000. Requires Docker to be able to reach Docker Hub for the base image.

---

## 📖 API Documentation

Once running, interactive API docs are available at:

- **Swagger UI**: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)
- **ReDoc**: [http://localhost:8000/api/redoc](http://localhost:8000/api/redoc)
