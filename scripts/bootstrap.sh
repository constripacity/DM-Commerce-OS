#!/usr/bin/env bash
set -euo pipefail

RESET="\033[0m"
BOLD="\033[1m"
GREEN="\033[32m"
YELLOW="\033[33m"
BLUE="\033[34m"

info() {
  printf "%b%s%b\n" "$BLUE" "$1" "$RESET"
}

success() {
  printf "%b%s%b\n" "$GREEN" "$1" "$RESET"
}

warn() {
  printf "%b%s%b\n" "$YELLOW" "$1" "$RESET"
}

error_exit() {
  printf "%b%s%b\n" "\033[31m" "$1" "$RESET"
  exit 1
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

info "DM-Commerce-OS One-Click Setup (macOS/Linux)"

if ! command -v node >/dev/null 2>&1; then
  error_exit "Node.js is required. Please install Node 18 or later and rerun this script."
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 18 ]; then
  error_exit "Node.js 18+ is required. Current version: $(node -v)."
fi

PACKAGE_MANAGER="pnpm"
if ! command -v pnpm >/dev/null 2>&1; then
  warn "pnpm not found. Falling back to npm. Install pnpm later for faster installs."
  PACKAGE_MANAGER="npm"
fi

ENV_FILE="$PROJECT_ROOT/.env.local"
if [ ! -f "$ENV_FILE" ]; then
  info "Creating .env.local with secure APP_SECRET"
  if command -v openssl >/dev/null 2>&1; then
    SECRET="$(openssl rand -hex 32 | tr -d '\r')"
  else
    SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
  fi
  printf "APP_SECRET=%s\n" "$SECRET" > "$ENV_FILE"
else
  if ! grep -q '^APP_SECRET=' "$ENV_FILE"; then
    info "Adding APP_SECRET to existing .env.local"
    if command -v openssl >/dev/null 2>&1; then
      SECRET="$(openssl rand -hex 32 | tr -d '\r')"
    else
      SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
    fi
    printf "\nAPP_SECRET=%s\n" "$SECRET" >> "$ENV_FILE"
  elif grep -q 'APP_SECRET=GENERATE_AT_INSTALL' "$ENV_FILE"; then
    info "Replacing placeholder APP_SECRET"
    if command -v openssl >/dev/null 2>&1; then
      SECRET="$(openssl rand -hex 32 | tr -d '\r')"
    else
      SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
    fi
    tmp_file="$ENV_FILE.tmp"
    sed "s|^APP_SECRET=.*|APP_SECRET=$SECRET|" "$ENV_FILE" > "$tmp_file"
    mv "$tmp_file" "$ENV_FILE"
  else
    info ".env.local already has an APP_SECRET"
  fi
fi

install_deps() {
  if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
    pnpm install
  else
    npm install
  fi
}

run_prisma_generate() {
  if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
    pnpm prisma generate
  else
    npm run --if-present prisma:generate || npx prisma generate
  fi
}

run_prisma_migrate() {
  if [ -d "$PROJECT_ROOT/prisma/migrations" ] && [ "$(find "$PROJECT_ROOT/prisma/migrations" -mindepth 1 -maxdepth 1 -type d | wc -l)" -gt 0 ]; then
    if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
      pnpm prisma migrate deploy
    else
      npm exec prisma migrate deploy || npx prisma migrate deploy
    fi
  else
    if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
      pnpm prisma migrate dev --name init
    else
      npm exec prisma migrate dev -- --name init || npx prisma migrate dev --name init
    fi
  fi
}

run_seed() {
  if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
    pnpm db:seed
  else
    npm run db:seed
  fi
}

install_deps
run_prisma_generate
run_prisma_migrate
run_seed

PORT_TO_USE=3000
if command -v lsof >/dev/null 2>&1; then
  if lsof -Pi :3000 -sTCP:LISTEN >/dev/null 2>&1; then
    warn "Port 3000 is busy. Starting dev server on port 3001 instead."
    PORT_TO_USE=3001
  fi
else
  warn "lsof not available to check ports. Assuming port 3000 is free."
fi

info "Starting development server on port $PORT_TO_USE..."

start_dev() {
  if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
    if [ "$PORT_TO_USE" = "3000" ]; then
      pnpm dev
    else
      PORT=$PORT_TO_USE pnpm dev
    fi
  else
    if [ "$PORT_TO_USE" = "3000" ]; then
      npm run dev
    else
      PORT=$PORT_TO_USE npm run dev
    fi
  fi
}

start_dev &
DEV_PID=$!

sleep 3
read -r -p "Press Enter to open http://localhost:$PORT_TO_USE/login " _

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "http://localhost:$PORT_TO_USE/login" >/dev/null 2>&1 || true
elif command -v open >/dev/null 2>&1; then
  open "http://localhost:$PORT_TO_USE/login" >/dev/null 2>&1 || true
else
  warn "Could not detect a command to open the browser automatically. Please open http://localhost:$PORT_TO_USE/login manually."
fi

wait $DEV_PID
