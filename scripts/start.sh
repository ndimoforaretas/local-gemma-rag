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
    echo -e "${RED}✖  Ollama is not running. Please open the Ollama app first.${NC}"
    exit 1
fi
echo -e "  ${GREEN}✓${NC} Ollama is running"

# ── Kill any existing server on port 8000 ─────────────────
if lsof -ti :8000 >/dev/null 2>&1; then
    echo -e "  ${YELLOW}⚠${NC}  Killing existing process on port 8000..."
    lsof -ti :8000 | xargs kill -9 2>/dev/null
    sleep 1
fi

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
    echo -e "   Run ${BOLD}./scripts/verify.sh${NC} to diagnose the issue."
    kill "$BACKEND_PID" 2>/dev/null || true
    exit 1
fi
