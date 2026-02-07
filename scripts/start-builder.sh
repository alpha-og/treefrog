#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${BUILDER_TOKEN:-}" ]]; then
  echo "BUILDER_TOKEN is required"
  exit 1
fi

cd /Users/athulanoop/software_projects/treefrog

docker compose up --build -d

echo "Remote builder running on http://localhost:9000"
