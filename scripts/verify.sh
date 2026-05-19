#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────
# Gemma CogniVault — Verify / Diagnose
#
# Run this at any time to check whether the app is ready to start.
# Usage:  ./scripts/verify.sh
# ──────────────────────────────────────────────────────────

BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
NC="\033[0m"

cd "$(dirname "$0")/.."

PASS=0
FAIL=0

check_pass() { echo -e "  ${GREEN}✓${NC}  $1"; ((PASS++)); }
check_fail() { echo -e "  ${RED}✖${NC}  $1"; echo -e "     ${YELLOW}→${NC}  $2"; ((FAIL++)); }
check_warn() { echo -e "  ${YELLOW}⚠${NC}  $1"; echo -e "     ${YELLOW}→${NC}  $2"; }

echo ""
echo -e "${BOLD}═══════════════════════════════════════════════${NC}"
echo -e "${BOLD}  Gemma CogniVault — Diagnostics${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════${NC}"
echo ""

# ── Prerequisites ─────────────────────────────────────────
echo -e "${BOLD}[1/6] Prerequisites${NC}"

command -v python3 >/dev/null 2>&1 \
    && check_pass "Python $(python3 --version 2>&1 | awk '{print $2}') found" \
    || check_fail "Python 3 not found" "Install from https://python.org"

command -v node >/dev/null 2>&1 \
    && check_pass "Node $(node --version) found" \
    || check_fail "Node.js not found" "Install from https://nodejs.org"

command -v docker >/dev/null 2>&1 \
    && check_pass "Docker found" \
    || check_fail "Docker not found" "Install Docker Desktop from https://docker.com"

command -v ollama >/dev/null 2>&1 \
    && check_pass "Ollama CLI found" \
    || check_fail "Ollama not found" "Install from https://ollama.com/download"

echo ""

# ── Ollama running & models ───────────────────────────────
echo -e "${BOLD}[2/6] Ollama runtime & models${NC}"

if ollama list >/dev/null 2>&1; then
    check_pass "Ollama is running"

    LLM_MODEL="gemma4:e4b"
    EMBED_MODEL="embeddinggemma"

    # Read from .env if present
    if [ -f ".env" ]; then
        _llm=$(grep -E '^LLM_MODEL=' .env | cut -d= -f2-)
        _embed=$(grep -E '^EMBEDDING_MODEL=' .env | cut -d= -f2-)
        [ -n "$_llm" ] && LLM_MODEL="$_llm"
        [ -n "$_embed" ] && EMBED_MODEL="$_embed"
    fi

    if ollama list 2>/dev/null | grep -q "^${LLM_MODEL}"; then
        check_pass "LLM model '${LLM_MODEL}' is pulled"
    else
        check_fail "LLM model '${LLM_MODEL}' not found" "Run: ollama pull ${LLM_MODEL}"
    fi

    if ollama list 2>/dev/null | grep -q "^${EMBED_MODEL}"; then
        check_pass "Embedding model '${EMBED_MODEL}' is pulled"
    else
        check_fail "Embedding model '${EMBED_MODEL}' not found" "Run: ollama pull ${EMBED_MODEL}"
    fi
else
    check_fail "Ollama is not running" "Open the Ollama desktop app first"
    check_warn "Skipping model checks" "Start Ollama first, then re-run this script"
fi

echo ""

# ── Setup artifacts ───────────────────────────────────────
echo -e "${BOLD}[3/6] Setup artifacts${NC}"

if [ -d ".venv" ]; then
    check_pass "Python virtual environment (.venv) exists"
else
    check_fail ".venv not found" "Run: ./scripts/setup.sh"
fi

if [ -f ".env" ]; then
    check_pass ".env file exists"
else
    check_warn ".env file missing — using built-in defaults" "Copy: cp .env.example .env"
fi

if [ -d "frontend/dist" ]; then
    check_pass "Frontend build (frontend/dist) exists"
else
    check_fail "Frontend not built (frontend/dist missing)" "Run: ./scripts/setup.sh  OR  cd frontend && npm run build"
fi

echo ""

# ── PostgreSQL ────────────────────────────────────────────
echo -e "${BOLD}[4/6] PostgreSQL (Docker)${NC}"

if docker info >/dev/null 2>&1; then
    check_pass "Docker daemon is running"

    DB_CONTAINER=$(docker compose ps -q db 2>/dev/null || docker-compose ps -q db 2>/dev/null)
    if [ -n "$DB_CONTAINER" ]; then
        DB_STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$DB_CONTAINER" 2>/dev/null || echo "running")
        if [ "$DB_STATUS" = "healthy" ] || [ "$DB_STATUS" = "running" ]; then
            check_pass "PostgreSQL container is up (status: ${DB_STATUS})"
        else
            check_fail "PostgreSQL container status: ${DB_STATUS}" "Run: docker compose up -d db"
        fi
    else
        check_fail "PostgreSQL container is not running" "Run: docker compose up -d db"
    fi
else
    check_fail "Docker daemon is not running" "Open Docker Desktop"
fi

echo ""

# ── Port 8000 ─────────────────────────────────────────────
echo -e "${BOLD}[5/6] Backend server${NC}"

if lsof -ti :8000 >/dev/null 2>&1; then
    check_pass "Something is listening on port 8000"

    # Try to hit /health
    if command -v curl >/dev/null 2>&1; then
        HTTP_CODE=$(curl -s -o /tmp/_cognivault_health.json -w "%{http_code}" --max-time 5 http://localhost:8000/health 2>/dev/null)
        if [ "$HTTP_CODE" = "200" ]; then
            check_pass "/health responded 200 — server is up"
            HEALTH=$(cat /tmp/_cognivault_health.json 2>/dev/null)
            echo -e "     ${NC}${HEALTH}"
        else
            check_fail "/health returned HTTP ${HTTP_CODE}" "Check server logs — the process on :8000 may not be CogniVault"
        fi
        rm -f /tmp/_cognivault_health.json
    fi
else
    check_fail "Nothing is listening on port 8000 — backend is not running" "Run: ./scripts/start.sh"
fi

echo ""

# ── Frontend reachable ────────────────────────────────────
echo -e "${BOLD}[6/6] Frontend at http://localhost:8000${NC}"

if lsof -ti :8000 >/dev/null 2>&1 && command -v curl >/dev/null 2>&1; then
    HTTP_ROOT=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:8000/ 2>/dev/null)
    if [ "$HTTP_ROOT" = "200" ]; then
        check_pass "http://localhost:8000/ returns 200 — frontend is served"
    else
        check_fail "http://localhost:8000/ returned HTTP ${HTTP_ROOT}" \
            "Frontend dist may be missing. Run: cd frontend && npm run build  then restart"
    fi
else
    check_warn "Skipped — server not running" "Start the backend first with ./scripts/start.sh"
fi

echo ""

# ── Summary ───────────────────────────────────────────────
echo -e "${BOLD}═══════════════════════════════════════════════${NC}"
if [ "$FAIL" -eq 0 ]; then
    echo -e "${BOLD}${GREEN}  ✅ All checks passed (${PASS} passed, 0 failed)${NC}"
    echo -e "${BOLD}${GREEN}     Open http://localhost:8000 in your browser${NC}"
else
    echo -e "${BOLD}${RED}  ✖  ${FAIL} check(s) failed, ${PASS} passed${NC}"
    echo -e "     Fix the issues above, then re-run ${BOLD}./scripts/verify.sh${NC}"
fi
echo -e "${BOLD}═══════════════════════════════════════════════${NC}"
echo ""

[ "$FAIL" -eq 0 ]
