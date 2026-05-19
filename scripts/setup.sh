#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────
# Gemma CogniVault — First-time Setup
#
# Run once after cloning:
#   chmod +x scripts/setup.sh && ./scripts/setup.sh
# ──────────────────────────────────────────────────────────
set -euo pipefail

BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
NC="\033[0m" # No Color

print_step() { echo -e "\n${BOLD}${GREEN}▶ $1${NC}"; }
print_warn() { echo -e "${YELLOW}⚠  $1${NC}"; }
print_err()  { echo -e "${RED}✖  $1${NC}"; }

cd "$(dirname "$0")/.."
ROOT_DIR=$(pwd)

echo -e "${BOLD}═══════════════════════════════════════════════${NC}"
echo -e "${BOLD}  Gemma CogniVault — Setup${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════${NC}"

# ── Check prerequisites ───────────────────────────────────
print_step "Checking prerequisites..."

command -v python3 >/dev/null 2>&1 || { print_err "Python 3 not found. Install from https://python.org"; exit 1; }
command -v node >/dev/null 2>&1 || { print_err "Node.js not found. Install from https://nodejs.org"; exit 1; }
command -v docker >/dev/null 2>&1 || { print_err "Docker not found. Install Docker Desktop from https://docker.com"; exit 1; }
if ! docker info >/dev/null 2>&1; then
    print_warn "Docker is not running — attempting to start Docker Desktop..."
    open -a Docker 2>/dev/null || { print_err "Could not launch Docker Desktop. Please open it manually and re-run."; exit 1; }
    echo -n "  Waiting for Docker"
    ELAPSED=0
    until docker info >/dev/null 2>&1; do
        if [ $ELAPSED -ge 60 ]; then
            echo ""; print_err "Docker did not start after 60s. Please open Docker Desktop manually and re-run."; exit 1
        fi
        echo -n "."; sleep 2; ((ELAPSED+=2))
    done
    echo -e " ${GREEN}ready${NC}"
fi

command -v ollama >/dev/null 2>&1 || { print_err "Ollama not found. Install from https://ollama.com/download"; exit 1; }
if ! ollama list >/dev/null 2>&1; then
    print_warn "Ollama is not running — attempting to start it..."
    open -a Ollama 2>/dev/null || { print_err "Could not launch Ollama. Please open it manually and re-run."; exit 1; }
    echo -n "  Waiting for Ollama"
    ELAPSED=0
    until ollama list >/dev/null 2>&1; do
        if [ $ELAPSED -ge 30 ]; then
            echo ""; print_err "Ollama did not start after 30s. Please open the Ollama app manually and re-run."; exit 1
        fi
        echo -n "."; sleep 1; ((ELAPSED++))
    done
    echo -e " ${GREEN}ready${NC}"
fi

echo "  ✓ Python $(python3 --version 2>&1 | awk '{print $2}')"
echo "  ✓ Node $(node --version)"
echo "  ✓ Docker running"
echo "  ✓ Ollama running"

# ── Copy .env if not present ──────────────────────────────
if [ ! -f ".env" ]; then
    print_step "Creating .env from .env.example..."
    cp .env.example .env
    echo "  ✓ .env created — edit it to override any defaults"
else
    echo -e "\n  .env already exists — skipping"
fi

# ── Pull Ollama models ────────────────────────────────────
print_step "Pulling Ollama models (this may take a few minutes)..."
ollama pull gemma4:e4b
ollama pull embeddinggemma

# ── Start PostgreSQL ──────────────────────────────────────
print_step "Starting PostgreSQL database..."
docker compose up -d db --remove-orphans 2>/dev/null || docker-compose up -d db --remove-orphans 2>/dev/null

# Wait until Postgres is actually accepting connections
echo "  Waiting for PostgreSQL to be ready..."
MAX_WAIT=30
ELAPSED=0
until docker compose exec -T db pg_isready -q 2>/dev/null || docker-compose exec -T db pg_isready -q 2>/dev/null; do
    if [ $ELAPSED -ge $MAX_WAIT ]; then
        print_err "PostgreSQL did not become ready after ${MAX_WAIT}s. Check Docker logs: docker compose logs db"
        exit 1
    fi
    sleep 1
    ((ELAPSED++))
done
echo "  ✓ PostgreSQL is ready"

# ── Python environment ────────────────────────────────────
print_step "Creating Python virtual environment..."
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
source .venv/bin/activate
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet --no-cache-dir
echo "  ✓ Python dependencies installed"

# ── DBOS migration ────────────────────────────────────────
print_step "Initializing DBOS tables..."
dbos migrate

# ── Frontend build ────────────────────────────────────────
print_step "Building frontend..."
cd frontend
npm install --silent
npm run build
cd "$ROOT_DIR"

# ── Done ──────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${BOLD}${GREEN}  ✅ Setup complete!${NC}"
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo "  To start the app, run:"
echo ""
echo "    ./scripts/start.sh"
echo ""
