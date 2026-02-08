#!/usr/bin/env bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
  echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

print_success() {
  echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

print_error() {
  echo -e "${RED}[$(date +'%H:%M:%S')]${NC} $1"
}

# Cleanup function to kill processes on exit
cleanup() {
  print_info "Shutting down..."
  kill $LOCAL_SERVER_PID $WEB_UI_PID 2>/dev/null || true
  wait $LOCAL_SERVER_PID $WEB_UI_PID 2>/dev/null || true
  print_success "Shutdown complete"
}

trap cleanup EXIT

# Check dependencies
if ! command -v go >/dev/null 2>&1; then
  print_error "Go is required but not installed"
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  print_error "pnpm is required. Install with: npm i -g pnpm"
  exit 1
fi

print_info "Starting Treefrog (Local Server + Web UI, no Builder)..."
echo ""

# Start local server
print_info "Starting local server on http://localhost:8080..."
cd /Users/athulanoop/software_projects/treefrog/local-server
go run . &
LOCAL_SERVER_PID=$!

# Give local server a moment to start
sleep 2

# Start web UI
print_info "Starting web UI on http://localhost:5173..."
cd /Users/athulanoop/software_projects/treefrog/web
pnpm install >/dev/null 2>&1
pnpm dev &
WEB_UI_PID=$!

# Give web UI a moment to start
sleep 2

echo ""
print_success "✓ Local Server running on http://localhost:8080"
print_success "✓ Web UI running on http://localhost:5173"
echo ""
print_info "Web UI will open in your browser. Configure the Builder URL in Settings."
print_info "Press Ctrl+C to stop both services"
echo ""

# Wait for both processes
wait $LOCAL_SERVER_PID $WEB_UI_PID 2>/dev/null || true
