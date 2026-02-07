# Treefrog

Local Overleaf-style editor with a remote LaTeX builder.

## Structure
- `local-server/` Go API for local app
- `remote-builder/` Go API for remote builds (runs with TeX Live)
- `web/` React frontend
- `scripts/` ergonomic start scripts

## Quick Start (Dev)
```bash
export BUILDER_TOKEN=devtoken
export BUILDER_URL=http://localhost:9000

make dev
```

Open `http://localhost:5173` and set your project folder in the UI.

## Individual Services
### Remote Builder (Docker)
```bash
export BUILDER_TOKEN=devtoken
./scripts/start-builder.sh
```

### Local Server
```bash
export BUILDER_URL=http://localhost:9000
export BUILDER_TOKEN=devtoken
./scripts/start-local.sh
```

### Frontend (pnpm)
```bash
./scripts/start-web.sh
```

## Notes
- The remote builder container includes TeX Live + `latexmk`.
- `Shell-escape` is enabled by default (toggle in UI).
