#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${BUILDER_TOKEN:-}" ]]; then
  echo "BUILDER_TOKEN is required"
  exit 1
fi

export BUILDER_URL="${BUILDER_URL:-http://localhost:9000}"

cd /Users/athulanoop/software_projects/treefrog

docker compose up --build -d

( cd /Users/athulanoop/software_projects/treefrog/local-server && go run . ) &
LOCAL_PID=$!

( cd /Users/athulanoop/software_projects/treefrog/web && if ! command -v pnpm >/dev/null 2>&1; then echo "pnpm is required. Install with: npm i -g pnpm"; exit 1; fi && pnpm install && pnpm dev ) &
WEB_PID=$!

cleanup() {
  kill $LOCAL_PID $WEB_PID || true
}
trap cleanup EXIT

wait
