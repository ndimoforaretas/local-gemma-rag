#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────
# Gemma CogniVault — Start
#
# Usage:  ./scripts/start.sh
# ──────────────────────────────────────────────────────────
set -euo pipefail

BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
NC="\033[0m"

cd "$(dirname "$0")/.."

echo -e "${BOLD}═══════════════════════════════════════════════${NC}"
echo -e "${BOLD}  Gemma CogniVault — Starting${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════${NC}"

# ── Check Ollama ──────────────────────────────────────────
if ! ollama list >/dev/null 2>&1; then
    echo -e "  ${YELLOW}⚠${NC}  Ollama is not running — attempting to start it..."
    open -a Ollama 2>/dev/null || { echo -e "${RED}✖  Could not launch Ollama. Please open it manually.${NC}"; exit 1; }
    echo -n "  Waiting for Ollama"
    ELAPSED=0
    until ollama list >/dev/null 2>&1; do
        if [ $ELAPSED -ge 30 ]; then
            echo ""; echo -e "${RED}✖  Ollama did not start after 30s. Please open the Ollama app manually.${NC}"; exit 1
        fi
        echo -n "."; sleep 1; ((ELAPSED++))
    done
    echo ""
fi
echo -e "  ${GREEN}✓${NC} Ollama is running"

# ── Kill any existing server on port 8000 ─────────────────
if lsof -ti :8000 >/dev/null 2>&1; then
    echo -e "  ${YELLOW}⚠${NC}  Killing existing process on port 8000..."
    lsof -ti :8000 | xargs kill -9 2>/dev/null
    sleep 1
fi

# ── Check Docker ──────────────────────────────────────────
if ! docker info >/dev/null 2>&1; then
    echo -e "  ${YELLOW}⚠${NC}  Docker is not running — attempting to start Docker Desktop..."
    open -a Docker 2>/dev/null || { echo -e "${RED}✖  Could not launch Docker Desktop. Please open it manually.${NC}"; exit 1; }
    echo -n "  Waiting for Docker"
    ELAPSED=0
    until docker info >/dev/null 2>&1; do
        if [ $ELAPSED -ge 60 ]; then
            echo ""; echo -e "${RED}✖  Docker did not start after 60s. Please open Docker Desktop manually.${NC}"; exit 1
        fi
        echo -n "."; sleep 2; ((ELAPSED+=2))
    done
    echo ""
fi
echo -e "  ${GREEN}✓${NC} Docker is running"

# ── Start database ────────────────────────────────────────
echo -e "  ${GREEN}▶${NC} Starting PostgreSQL..."
docker compose up -d db --remove-orphans 2>/dev/null || docker-compose up -d db --remove-orphans 2>/dev/null
echo -e "  ${GREEN}✓${NC} Database is ready"

# ── Activate venv and launch ──────────────────────────────
if [ ! -d ".venv" ]; then
    echo -e "${RED}✖  Virtual environment not found.${NC}"
    echo -e "   Run ${BOLD}./scripts/setup.sh${NC} first, then try again."
    exit 1
fi
source .venv/bin/activate

echo -e "  ${GREEN}▶${NC} Launching backend on http://localhost:8000"
echo ""

python -m backend.main &
BACKEND_PID=$!

# ── Wait for server to be ready ───────────────────────────
echo -e "  Waiting for server to be ready..."
MAX_WAIT=20
ELAPSED=0
SERVER_UP=false
while [ $ELAPSED -lt $MAX_WAIT ]; do
    if curl -s --max-time 2 http://localhost:8000/health >/dev/null 2>&1; then
        SERVER_UP=true
        break
    fi
    # Check if the process has already died
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
        break
    fi
    sleep 1
    ((ELAPSED++))
done

if $SERVER_UP; then
    echo -e "  ${GREEN}✓${NC} Server is up — open ${BOLD}http://localhost:8000${NC}"
    wait "$BACKEND_PID"
else
    echo -e "  ${RED}✖  Server did not become ready after ${MAX_WAIT}s.${NC}"
    echo -e "   Check the output above for errors, or re-run ${BOLD}./scripts/setup.sh${NC} if this is a first run."
    kill "$BACKEND_PID" 2>/dev/null || true
    exit 1
fi
