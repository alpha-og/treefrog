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

## Installation

### macOS

**Homebrew (recommended):**
```bash
brew install treefrog/tap/treefrog
```

**Install script:**
```bash
curl -fsSL https://raw.githubusercontent.com/alpha-og/treefrog/main/scripts/install.sh | bash
```

**Download directly:**
Download the DMG from [GitHub Releases](https://github.com/alpha-og/treefrog/releases)

### Linux

**Arch Linux (AUR):**
```bash
yay -S treefrog-bin
```

**Install script:**
```bash
curl -fsSL https://raw.githubusercontent.com/alpha-og/treefrog/main/scripts/install.sh | bash
```

**Download directly:**
Download the tarball from [GitHub Releases](https://github.com/alpha-og/treefrog/releases)

### Windows

Download the ZIP from [GitHub Releases](https://github.com/alpha-og/treefrog/releases)

### Install Script Options

```bash
# Install specific version
curl -fsSL https://raw.githubusercontent.com/alpha-og/treefrog/main/scripts/install.sh | bash -s -- --version v1.0.0

# Install to custom location
curl -fsSL https://raw.githubusercontent.com/alpha-og/treefrog/main/scripts/install.sh | bash -s -- --prefix ~/.local

# Uninstall
curl -fsSL https://raw.githubusercontent.com/alpha-og/treefrog/main/scripts/install.sh | bash -s -- --uninstall
```

## Quick Start

### Prerequisites

- Go 1.24+
- Node.js 22+ and pnpm 9+
- Wails CLI: `go install github.com/wailsapp/wails/v2/cmd/wails@latest`
- Docker (optional, for local rendering)

### Development

```bash
pnpm install           # Install all dependencies
pnpm dev               # Start desktop app with local compiler
pnpm doctor            # Verify development environment
```

### Build for Distribution

```bash
pnpm build             # Build for current platform
pnpm build:all         # Build for macOS, Windows, Linux
```

Built binaries are in `apps/desktop/build/bin/`

## Project Structure

```
treefrog/
├── apps/
│   ├── local-latex-compiler/  # Local LaTeX compiler (no auth, pure rendering)
│   │   ├── cmd/server/        # HTTP server entry point
│   │   ├── internal/          # Private packages (storage, cleanup)
│   │   ├── Dockerfile         # Server container
│   │   └── compose.yml        # Docker Compose config
│   │
│   ├── remote-latex-compiler/ # Remote SaaS compiler (auth, billing)
│   │   ├── cmd/server/        # HTTP server entry point
│   │   ├── internal/          # Private packages (auth, billing, build, etc.)
│   │   ├── Dockerfile         # Server container
│   │   └── compose.yml        # Docker Compose config
│   │
│   ├── local-cli/             # Standalone local LaTeX compiler CLI
│   │   └── cmd/main.go        # CLI entry point
│   │
│   ├── desktop/               # Wails desktop application
│   │   ├── frontend/          # React frontend (React 19)
│   │   ├── app.go             # Application configuration
│   │   ├── bindings.go        # Go to frontend bindings
│   │   ├── docker.go          # Docker lifecycle management
│   │   └── wails.json         # Wails configuration
│   │
│   └── website/               # Marketing website (React 19)
│
├── packages/
│   ├── types/                 # @treefrog/types - Shared TypeScript types
│   ├── services/              # @treefrog/services - API clients
│   ├── supabase/              # @treefrog/supabase - Database client
│   ├── ui/                    # @treefrog/ui - Shared React components
│   └── go/                    # Shared Go packages
│       ├── build/             # DockerCompiler, Build types
│       ├── config/            # Environment variable helpers
│       ├── http/              # HTTP client factory
│       ├── logging/           # Shared logger initialization
│       ├── security/          # Path traversal validation
│       ├── signer/            # URL signing utility
│       ├── synctex/           # SyncTeX parser
│       └── validation/        # UUID validation
│
├── scripts/                   # Development and build scripts
├── go.work                    # Go workspace configuration
├── pnpm-workspace.yaml        # pnpm monorepo configuration
└── vercel.json                # Vercel deployment config
```

## Commands

```bash
# Development
pnpm dev                 # Start desktop app with local compiler
pnpm dev:desktop-local   # Desktop + Local compiler (no auth)
pnpm dev:desktop-remote  # Desktop + Remote compiler (auth required)
pnpm dev:website         # Website only
pnpm dev:compiler        # Remote compiler only

# Service Management
pnpm dev:status          # Show status of all services
pnpm dev:stop            # Stop services
pnpm dev:logs <service>  # View logs

# Building
pnpm build               # Build desktop app for current platform
pnpm build:all           # Build for macOS, Windows, Linux
pnpm build:docker        # Build Docker images
pnpm build:backend       # Build remote compiler binary
pnpm build:cli           # Build local CLI

# Production
pnpm prod:compiler       # Start remote compiler (production)
pnpm prod:stop           # Stop production services
pnpm prod:logs           # View production logs

# Testing
pnpm test                # Run all tests
pnpm test:backend        # Run Go tests
pnpm test:frontend       # Run frontend tests

# Code Quality
pnpm lint                # Lint all code
pnpm fmt                 # Format all code
pnpm typecheck           # Type check TypeScript

# Diagnostics
pnpm doctor              # Check development environment
pnpm clean               # Clean build artifacts
pnpm clean:all           # Deep clean (removes node_modules)
```

## Configuration

### Environment Variables

Run `pnpm env:setup` to create `.env.local` from the template.

**Remote Compiler (`apps/remote-latex-compiler/.env.local`):**
- `DATABASE_URL` - PostgreSQL connection string
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SECRET_KEY` - Supabase service role key (SECRET)
- `REDIS_URL` - Redis connection string
- `RAZORPAY_*` - Payment configuration (SECRETS)
- `COMPILER_SIGNING_KEY` - URL signing secret (SECRET)

**Desktop & Website (`VITE_*` vars are safe, client-side):**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key (public-safe)
- `VITE_API_URL` - Backend API URL
- `VITE_WEBSITE_URL` - Website URL

### Docker Compose

Each compiler has its own `compose.yml`:

```bash
# Local compiler (no auth)
cd apps/local-latex-compiler && docker compose up

# Remote compiler (requires .env.local)
cd apps/remote-latex-compiler && docker compose up
```

Or use the pnpm scripts:
```bash
pnpm dev:local      # Local compiler on port 8080
pnpm prod:compiler  # Remote compiler on port 9000
```

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
pnpm doctor            # Verify dependencies
pnpm install           # Reinstall dependencies
```

### Build compilation fails

- Verify Compiler URL is accessible
- Check API token in Settings
- Enable shell-escape if required
- Check compiler logs: `pnpm dev:logs remote-compiler`

### Docker Renderer issues

- Verify Docker is running
- Check port availability
- Review error logs in Settings

## Security

- Never commit `.env.local` files (gitignored)
- All `VITE_*` variables are client-side and public-safe
- Server secrets go in `apps/remote-latex-compiler/.env.local`

## License

MIT
