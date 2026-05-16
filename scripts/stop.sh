#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────
# Gemma CogniVault — Stop
#
# Usage:  ./scripts/stop.sh
# ──────────────────────────────────────────────────────────

BOLD="\033[1m"
GREEN="\033[0;32m"
NC="\033[0m"

cd "$(dirname "$0")/.."

echo -e "${BOLD}Gemma CogniVault — Stopping${NC}"

# Kill the backend server
if lsof -ti :8000 >/dev/null 2>&1; then
    lsof -ti :8000 | xargs kill -9 2>/dev/null
    echo -e "  ${GREEN}✓${NC} Backend stopped"
else
    echo "  Backend was not running"
fi

# Stop the database
docker compose down --remove-orphans 2>/dev/null || docker-compose down --remove-orphans 2>/dev/null
echo -e "  ${GREEN}✓${NC} Database stopped"

echo -e "\n${GREEN}Done.${NC}"
