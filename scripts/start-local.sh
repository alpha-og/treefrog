#!/usr/bin/env bash
set -euo pipefail

export BUILDER_URL="${BUILDER_URL:-http://localhost:9000}"

cd /Users/athulanoop/software_projects/treefrog/local-server

go run .
