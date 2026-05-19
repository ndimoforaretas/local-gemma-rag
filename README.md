# Gemma CogniVault

---

![Gemma Cognivault Logo with the tagline "Durable Local RAG Pipeline - Private AI . No Cloud . Your Data" ](frontend/public/gemma-cognivault-banner.jpg)

A full-stack **Local RAG** (Retrieval-Augmented Generation) application that lets you build a private Intelligence Chatbot querying your own documents — PDFs, Markdown, plain text, and CSV files. Attach images directly in chat for multimodal analysis. All data stays on your machine — no cloud APIs required.

_This is a submission for the [Gemma 4 Challenge: Build with Gemma 4](https://dev.to/challenges/google-gemma-2026-05-06)_

---

## Problem Statement

AI has changed how work gets done. In just a few years, teams have moved from manually searching documents to asking chatbots to analyze contracts, extract key information, summarize reports, and reason across entire knowledge bases.

But for regulated industries, that promise comes with a problem.

If you work in finance, healthcare, or any organization handling sensitive internal data, you cannot paste private documents into any AI tool and hope for the best. In the EU and across global markets, data privacy and data sovereignty shape what systems you can use, where data can travel, and who is allowed to process it.

Cloud AI can be powerful, but with regulated data it raises hard questions. Where does the data go? Which region processes it? What happens to prompts, files, logs, and outputs? Who controls the infrastructure?

So teams pull back. They keep slower, less intelligent workflows because the risk feels too high.

The obvious alternative is local RAG: Retrieval-Augmented Generation running close to your own data. In theory, it offers private document search, private reasoning, and private answers.

In practice, many local RAG systems are not ready for serious enterprise use. Large document ingestion can be unreliable. If a pipeline crashes halfway through, progress can disappear, forcing teams to restart. Lightweight local models may ignore context, hallucinate tool calls, or fail at reasoning steps that matter.

The result is frustrating: cloud AI feels capable, but hard to approve for sensitive data. Local AI feels safer, but too fragile to trust.

## My Solution

CogniVault is built for that gap.

CogniVault is a 100% local, zero-token RAG pipeline for teams that need security, reliability, and serious reasoning over private documentation.

By combining Gemma 4 with DBOS durable workflows, Strands Agents, and FAISS vector store, CogniVault brings fault-tolerant ingestion, agentic reasoning, and local document intelligence onto your own machine, without cloud APIs.

Your data stays local. Your documents stay under your control. Your AI workflow becomes durable enough for real business use.

For regulated teams, the future of AI should not live behind a glass wall.

## Demo

<!-- Embed a video walkthrough or share a link to your deployed project. -->

[![CogniVault Demo Video](https://img.youtube.com/vi/YOUR_VIDEO_ID/0.jpg)](https://www.youtube.com/watch?v=YOUR_VIDEO_ID)
_(Replace with actual YouTube link or video embed)_

## How I Used Gemma 4

To make CogniVault work entirely offline without sacrificing intelligence, I relied on two models:

1. **`embeddinggemma`**: Used to generate dense semantic vectors for the local FAISS index.
   - It perfectly mapped large documents without a single byte leaving the user's hardware.

2. **`gemma4:e4b`**: Used as the core intelligence and agent orchestrator.

### Why `gemma4:e4b` was the perfect fit:

I didn't just want a chatbot; I wanted an autonomous agent.

- Standard lightweight local models frequently fail at complex instruction following—they hallucinate tool names or lose track of retrieved context.

- Gemma 4 natively integrates a specialized Thinking Mode and robust function-calling. When a compliance officer asks, _"Search the Q3 budget and calculate a 15% buffer"_, Gemma 4 doesn't just guess. It autonomously:

1. Calls the **Knowledge Base Tool** to query the FAISS index.
2. Reads the retrieved chunk to find the exact budget number.
3. Calls our local **Safe Calculator Tool** to execute the math flawlessly.
4. Calls the **System Clock** to timestamp the report.

Gemma 4 proved that you don't need a 100B+ parameter cloud model to achieve true, multi-step agentic workflows. You can do it securely, accurately, and entirely on your own laptop.

---

## Tech Stack

| Layer                 | Technology                                                                              |
| --------------------- | --------------------------------------------------------------------------------------- |
| **LLM & Embeddings**  | [Ollama](https://ollama.com) — `gemma4:e4b` (chat) + `embeddinggemma` (dense retrieval) |
| **Backend**           | FastAPI · Python 3.10+                                                                  |
| **Vector Store**      | FAISS (in-memory search, disk-persisted)                                                |
| **Durable Workflows** | [DBOS](https://dbos.dev) + PostgreSQL                                                   |
| **Frontend**          | React · TypeScript · Vite · TanStack React Query                                        |
| **Agent Framework**   | [Strands Agents](https://github.com/strands-agents/sdk-python)                          |

---

## ✨ Key Features

- **Multi-Format Ingestion** — Upload PDFs, Markdown, plain text, and CSV files. DBOS durable workflows ensure crash-resilient ingestion that resumes from the exact batch it left off on.
- **Multimodal Chat** — Attach images directly in the chat for vision analysis with Gemma 4. Image thumbnails persist in your chat history.
- **Chat → KB Bridge** — Attach text files in chat, discuss them with the AI, then add them to your Knowledge Base with one click — no view switching required.
- **Multi-Session Chat** — Juggle independent research threads with a history sidebar and auto-generated titles.
- **Smart Knowledge Base** — View, manage, and soft-delete documents from the vector database without re-indexing.
- **Interactive Citations** — A live Context sidebar slides in whenever the AI searches the knowledge base, showing exactly which documents it drew from with a direct link to the source file.
- **Suggestion Cards** — Six instant how-to questions appear on every new conversation, giving users a guided entry point without typing a single character.
- **Pre-loaded Guide** — A full user guide (`docs/GUIDE.md`) is seeded into the knowledge base at setup so the AI can answer questions about the app itself from day one.
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
│   │   ├── rag.py            # /rag streaming chat (multimodal)
│   │   ├── knowledge.py      # /kb, /upload, /ingest, /api/docs, /api/save-to-kb
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

Install all four tools before proceeding:

| Tool               | Purpose             | Install                                                       |
| ------------------ | ------------------- | ------------------------------------------------------------- |
| **Python 3.10+**   | Backend runtime     | [python.org](https://www.python.org/downloads/)               |
| **Node.js 18+**    | Frontend build      | [nodejs.org](https://nodejs.org/)                             |
| **Docker Desktop** | PostgreSQL database | [docker.com](https://www.docker.com/products/docker-desktop/) |
| **Ollama**         | Local LLM inference | [ollama.com](https://ollama.com/download)                     |

> **⚠️ Make sure Docker Desktop and Ollama are both running** before proceeding.

### Get Up and Running (2 commands)

```bash
# 1. Clone and enter the project
git clone https://github.com/ndimoforaretas/local-gemma-rag.git
cd local-gemma-rag

# 2. One-time setup (pulls models, installs deps, builds frontend)
./scripts/setup.sh

# 3. Launch the app
./scripts/start.sh
```

That's it! Open **[http://localhost:8000](http://localhost:8000)** and start chatting.

### Stopping & Restarting

In the terminal where the server is running,

- press **`Ctrl + C`** to stop the backend process,
- then shut down the database with the following command:

```bash
# Then shut down the database
./scripts/stop.sh

```

- To restart the server later, simply run:

```bash
# Start again later (no setup needed)
./scripts/start.sh
```

### What the scripts do

| Script             | Purpose                                                                                                                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/setup.sh` | Checks prerequisites, copies `.env.example` → `.env`, pulls Ollama models, starts PostgreSQL (waits until ready), creates Python venv, installs dependencies, runs DBOS migration, builds frontend |
| `scripts/start.sh` | Checks Ollama is running, frees port 8000 if needed, guards against missing `.venv`, starts database, launches the backend, polls `/health` and confirms the server is up                          |
| `scripts/stop.sh`  | Stops the backend server and shuts down the database                                                                                                                                               |

---

<details>
<summary><strong>📋 Manual Setup (step-by-step)</strong></summary>

If you prefer to run each step manually:

### 1. Clone & enter the project

```bash
git clone https://github.com/ndimoforaretas/local-gemma-rag.git
cd local-gemma-rag
```

### 2. Start Ollama & pull the required models

Make sure the **Ollama** application is running, then pull the two models:

```bash
ollama pull gemma4:e4b          # Chat model (~9.6 GB)
ollama pull embeddinggemma      # Embedding model (~622 MB)
```

### 3. Start the PostgreSQL database

```bash
docker compose up -d db
```

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

### 6. Seed the default knowledge base

```bash
python scripts/seed_knowledge_base.py
```

This indexes `docs/GUIDE.md` into the vector store so the AI can answer questions about the app from the first launch. Safe to skip — the app works without it, but suggestion cards won't have context to draw from.

### 7. Build the frontend

```bash
cd frontend
npm install
npm run build
cd ..
```

### 8. Launch the application

```bash
python -m backend.main
```

### 9. Open the app

Navigate to **[http://localhost:8000](http://localhost:8000)**

</details>

---

## ⚙️ Configuration

Copy the example environment file and adjust as needed:

```bash
cp .env.example .env
```

| Variable             | Default                                              | Description                 |
| -------------------- | ---------------------------------------------------- | --------------------------- |
| `LLM_MODEL`          | `gemma4:e4b`                                         | Ollama model for chat       |
| `EMBEDDING_MODEL`    | `embeddinggemma`                                     | Ollama model for embeddings |
| `OLLAMA_HOST`        | `http://localhost:11434`                             | Ollama server URL           |
| `DB_URL`             | `postgresql://postgres:password@localhost:5432/dbos` | PostgreSQL connection       |
| `CORS_ORIGINS`       | `["http://localhost:5173"]`                          | Allowed CORS origins        |
| `MAX_UPLOAD_SIZE_MB` | `200`                                                | Max document upload size    |

---

## 🔧 Troubleshooting

| Problem                                                    | Cause                                       | Fix                                                |
| ---------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------- |
| `"An internal error occurred while processing your query"` | Ollama is not running                       | Open the Ollama app and verify with `ollama list`  |
| `"Address already in use"` (port 8000)                     | A previous server instance is still running | Run `lsof -ti :8000 \| xargs kill -9` then restart |
| `"Cannot connect to the Docker daemon"`                    | Docker Desktop is not running               | Open Docker Desktop and wait for it to start       |
| `"can't open file 'api.py'"`                               | Using an outdated start command             | Use `python -m backend.main` (not `python api.py`) |
| `"Failed to connect to Ollama"`                            | Ollama crashed or was closed                | Reopen the Ollama app                              |
| `"DBOS system database"` connection error                  | PostgreSQL container is not running         | Run `docker compose up -d db`                      |
| `.venv not found` error in `start.sh`                      | Setup was never completed or failed         | Run `./scripts/setup.sh` first                     |

---

## 🧠 Why DBOS? (The Durable Workflow Philosophy)

Processing large document libraries involves extracting text, chunking, and generating dense embeddings — any step can fail due to memory limits, LLM timeouts, or crashes.

Instead of corrupt states or re-ingesting thousands of pages, the ingestion pipeline uses **DBOS durable workflows**:

1. **`list_document_files`** — Scans `docs/` and identifies new documents (PDF, TXT, MD, CSV).
2. **`process_single_document`** — Extracts text with format-appropriate parsers (PyPDF for PDFs, raw text for others).
3. **Text Chunking** — `RecursiveCharacterTextSplitter` breaks documents into 1000-char segments with overlap.
4. **`embed_batch`** — Sends chunks in batches to Ollama. Failed batches are retried individually.
5. **`save_vector_store`** — Durably persists embeddings and metadata to disk.

Every `@DBOS.step()` return value is saved in Postgres. If your machine shuts down mid-process, restarting the server resumes from the exact batch it left off.

---

## 💾 Storage Architecture

| Layer        | Files                                     | Purpose                                   |
| ------------ | ----------------------------------------- | ----------------------------------------- |
| **Disk**     | `vector_store.faiss`, `vector_store.json` | Persistent embeddings and metadata        |
| **RAM**      | `VectorDB` class                          | Sub-millisecond in-memory semantic search |
| **Postgres** | DBOS system tables                        | Durable workflow state and crash recovery |

---

## 🐳 Full Docker Deployment (Optional)

To run the entire stack in containers (requires internet access to pull the base image):

```bash
docker compose up --build
```

This builds the app image, starts PostgreSQL, and serves the application on port 8000.

---

## 📖 API Documentation

Once running, interactive API docs are available at:

- **Swagger UI**: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)
- **ReDoc**: [http://localhost:8000/api/redoc](http://localhost:8000/api/redoc)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
