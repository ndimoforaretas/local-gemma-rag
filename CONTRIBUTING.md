# Contributing to Gemma CogniVault

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- Docker Desktop
- Ollama (with `gemma4:e4b` and `embeddinggemma` models pulled)

### Getting Started

```bash
# 1. Fork and clone the repo
git clone https://github.com/<your-username>/local-gemma-rag.git
cd local-gemma-rag

# 2. Start the database
docker compose up -d db

# 3. Set up Python environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 4. Initialize DBOS
dbos migrate

# 6. Seed the default knowledge base
python scripts/seed_knowledge_base.py

# 7. Build the frontend
cd frontend && npm install && npm run build && cd ..

# 8. Start the app
python -m backend.main
```

## Project Structure

```
backend/           → Python package (FastAPI + DBOS)
  routers/         → API endpoint handlers
  services/        → Business logic (VectorDB, RAG agent, ingestion)
  models/          → Pydantic request/response schemas
  tools/           → Agent tools (calculator, clock, KB search)
  tests/           → pytest test suite
frontend/src/      → React + TypeScript + Vite
  components/      → Decomposed UI components
  lib/api.ts       → Typed API client
  types/api.ts     → Shared TypeScript interfaces
```

## Running Tests

### Backend

```bash
source .venv/bin/activate
python -m pytest backend/tests/ -v
```

Tests run without Ollama or PostgreSQL — external services are mocked.

### Frontend

```bash
cd frontend
npm run build    # TypeScript type-checking + production build
```

## Code Style

- **Python**: Follow PEP 8. Use type hints on all function signatures.
- **TypeScript**: Strict mode enabled. No `any` types — use the shared interfaces in `types/api.ts`.
- **Commits**: Use [Conventional Commits](https://www.conventionalcommits.org/) format:
  - `feat:` new features
  - `fix:` bug fixes
  - `refactor:` code restructuring
  - `test:` adding tests
  - `docs:` documentation changes

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes and ensure all tests pass
3. Update the README if your changes affect setup or usage
4. Submit a PR with a clear description of what changed and why

## Architecture Decisions

- **No cloud APIs**: All AI inference runs locally via Ollama
- **DBOS for durability**: Workflow steps are persisted in PostgreSQL so crashes don't lose progress
- **FAISS in-memory**: Vector search runs in RAM for speed, persisted to disk on changes
- **Typed API boundary**: Backend Pydantic models mirror frontend TypeScript interfaces in `types/api.ts`
