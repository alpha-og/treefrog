# Treefrog

A native LaTeX editor with remote compilation support and local Docker rendering.

## Overview

Treefrog is a desktop application providing a complete LaTeX editing and compilation environment:

- **Monaco Editor** - Syntax highlighting and LaTeX autocompletion
- **Live PDF Preview** - Real-time PDF viewer with SyncTeX support (click to navigate)
- **Git Integration** - Version control operations within the editor
- **Remote Compilation** - Offload builds to a remote compiler service
- **Local Docker Renderer** - Optional bundled LaTeX compilation environment
- **Project Management** - File browser and multi-file project support

## Quick Start

### Prerequisites

- Go 1.23+
- Node.js 20+ and pnpm 9+
- Wails CLI: `go install github.com/wailsapp/wails/v2/cmd/wails@latest`
- Docker (optional, for local rendering)

### Development

```bash
pnpm install           # Install all dependencies
make dev               # Start development server with hot reload
make doctor            # Verify Wails setup
```

### Build for Distribution

```bash
make build             # Build for current platform
make build-all         # Build for macOS, Windows, Linux
```

Built binaries are in `apps/desktop/build/bin/`

## Project Structure

```
treefrog/
├── apps/
│   ├── compiler/           # LaTeX compiler server (Go)
│   │   ├── cmd/server/     # HTTP server entry point
│   │   ├── internal/       # Private packages (auth, billing, build, etc.)
│   │   ├── migrations/     # SQL migrations
│   │   └── Dockerfile      # Server container
│   │
│   ├── local-cli/          # Standalone local LaTeX compiler CLI
│   │   └── cmd/main.go     # CLI entry point
│   │
│   ├── desktop/            # Wails desktop application
│   │   ├── frontend/       # React frontend (React 19)
│   │   ├── app.go          # Application configuration
│   │   ├── bindings.go     # Go to frontend bindings
│   │   ├── docker.go       # Docker lifecycle management
│   │   └── wails.json      # Wails configuration
│   │
│   └── website/            # Marketing website (React 19)
│
├── packages/
│   ├── types/              # @treefrog/types - Shared TypeScript types
│   ├── services/           # @treefrog/services - API clients
│   ├── supabase/           # @treefrog/supabase - Database client
│   ├── ui/                 # @treefrog/ui - Shared React components
│   └── go/                 # Shared Go packages
│       ├── synctex/        # SyncTeX parser
│       └── signer/         # URL signing utility
│
├── go.work                 # Go workspace configuration
├── pnpm-workspace.yaml     # pnpm monorepo configuration
├── Makefile                # Build targets
└── docker-compose.yml      # Docker services (compiler, redis, db)
```

## Make Commands

```bash
# Development
make dev                # Start desktop app with hot reload
make dev-debug          # Dev with DEBUG logging
make website-dev        # Start website dev server

# Building
make build              # Build desktop app for current platform
make build-all          # Build for macOS, Windows, Linux
make build-backend      # Build compiler server binary
make build-cli          # Build local CLI

# Docker
make compiler           # Start compiler with Docker Compose
make stop               # Stop Docker services
make logs               # View Docker logs

# Testing
make test               # Run all tests
make test-backend       # Run Go tests
make test-frontend      # Run frontend tests

# Code Quality
make lint               # Lint all code
make fmt                # Format all code
make typecheck          # Type check frontend

# Diagnostics
make doctor             # Check Wails setup
make clean              # Clean build artifacts
make clean-all          # Deep clean (removes node_modules)
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env.local` in each directory:

**Backend (`apps/compiler/.env.local`):**
- `DATABASE_URL` - PostgreSQL connection string
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SECRET_KEY` - Supabase service role key
- `REDIS_URL` - Redis connection string
- `RAZORPAY_*` - Payment configuration

**Desktop (`apps/desktop/frontend/.env.local`):**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key
- `VITE_API_URL` - Backend API URL

**Website (`apps/website/.env.local`):**
- Same as Desktop

### Docker Compose

Start the full development stack:

```bash
make compiler
```

This starts:
- LaTeX renderer on port 9000
- Redis on port 6379
- PostgreSQL on port 5432

## Features

- Monaco Editor with LaTeX syntax highlighting
- Live PDF viewer with SyncTeX support
- Native file browser
- Git integration (status, commit, push, pull)
- Multiple TeX engines: pdflatex, xelatex, lualatex
- Local Docker rendering with health checks
- Delta-sync caching for faster builds

## Troubleshooting

### Application fails to start

```bash
make doctor             # Verify dependencies
pnpm install            # Reinstall dependencies
```

### Build compilation fails

- Verify Compiler URL is accessible
- Check API token in Settings
- Enable shell-escape if required
- Check compiler logs: `make logs`

### Docker Renderer issues

- Verify Docker is running
- Check port availability
- Review error logs in Settings

## Security

See `.env.example` files for required environment variables. Never commit `.env.local` files.

## License

MIT