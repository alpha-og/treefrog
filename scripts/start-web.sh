#!/usr/bin/env bash
set -euo pipefail

cd /Users/athulanoop/software_projects/treefrog/web

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is required. Install with: npm i -g pnpm"
  exit 1
fi

pnpm install
pnpm dev
