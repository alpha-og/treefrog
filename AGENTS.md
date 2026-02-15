# Agent Instructions for Treefrog

Guidelines for AI coding agents working in this repository.

## Development Commands

```bash
# Development profiles (concurrent services with health checks)
pnpm dev                      # Default: desktop-local
pnpm dev:desktop-local        # Desktop + Local compiler (no auth)
pnpm dev:desktop-remote       # Desktop + Remote compiler + Website (auth required)
pnpm dev:website-compiler     # Website + Remote compiler
pnpm dev:full                 # All services
pnpm dev:compiler             # Remote compiler only
pnpm dev:local                # Local compiler only
pnpm dev:website              # Website only
pnpm dev:desktop              # Desktop only (needs external compiler)

# Development options
pnpm dev <profile> --log-dir ./logs    # Write logs to directory
pnpm dev <profile> --detach            # Run in background
pnpm dev <profile> --no-health-check   # Skip health checks

# Service management
pnpm dev:status               # Show status of all services
pnpm dev:stop                 # Show stop options
pnpm dev:stop:all             # Stop all Treefrog services
pnpm dev:stop <profile>       # Stop services in a profile
pnpm dev:logs <service>       # View logs (local-compiler, remote-compiler)
pnpm dev:logs <service> -f    # Follow logs

# Production
pnpm prod:compiler            # Start remote compiler (production)
pnpm prod:stop                # Stop production services
pnpm prod:logs                # View production logs

# Building
pnpm build                    # Desktop app (current platform)
pnpm build:all                # Desktop app (all platforms)
pnpm build:docker             # Show Docker build options
pnpm build:docker:local       # Build local compiler image
pnpm build:docker:remote      # Build remote compiler image
pnpm build:docker:all         # Build all Docker images
pnpm build:backend            # Build backend binary
pnpm build:cli                # Build local CLI

# Testing
pnpm test                     # All tests
pnpm test:backend             # Go tests
pnpm test:backend:verbose     # Go tests with coverage
pnpm test:frontend            # Frontend tests

# Linting and Formatting
pnpm lint                     # All linting
pnpm lint:backend             # Go linting
pnpm lint:frontend            # Frontend linting
pnpm typecheck                # TypeScript checking
pnpm fmt                      # Format all code

# Environment
pnpm env:setup               # Create .env.local from template (first time)
pnpm env:check                # Check environment files

# Utility
pnpm clean                    # Remove build artifacts
pnpm clean:all                # Deep clean (includes node_modules)
pnpm doctor                   # Check development environment
```

## Development Profiles

| Profile | Desktop | Website | Local Compiler | Remote Compiler | Redis |
|---------|:-------:|:-------:|:--------------:|:---------------:|:-----:|
| `desktop-local` | X | | X | | |
| `desktop-remote` | X | X | | X | X |
| `website-compiler` | | X | | X | X |
| `full` | X | X | X | X | X |
| `compiler-only` | | | | X | X |
| `local-only` | | | X | | |

## Service Ports

| Service | Port | Health Endpoint |
|---------|------|-----------------|
| Local Compiler | 8080 | http://localhost:8080/health |
| Remote Compiler | 9000 | http://localhost:9000/health |
| Website | 3000 | http://localhost:3000 |
| Redis | 6379 | redis-cli ping |

## Architecture

### Compiler Services

| Compiler | Auth | Use Case |
|----------|------|----------|
| **local-latex-compiler** | No auth | Local Docker rendering, pure compilation |
| **remote-latex-compiler** | Supabase JWT | SaaS with auth, billing, rate limiting |

### Monorepo Structure

```
apps/
  local-latex-compiler/  # Local LaTeX compiler (no auth, pure rendering)
    cmd/server/          # HTTP server entry point
    internal/            # Private packages (storage, cleanup)
  remote-latex-compiler/ # Remote SaaS compiler (auth, billing, etc.)
    cmd/server/          # HTTP server entry point
    internal/            # Private packages (auth, billing, build, etc.)
  local-cli/             # Standalone local LaTeX compiler CLI
  desktop/               # Wails desktop application
    frontend/            # React frontend (React 19)
    *.go                 # Go backend (app.go, bindings.go, etc.)
  website/               # Marketing website (React 19)

packages/
  types/                 # @treefrog/types - Shared TypeScript types
  services/              # @treefrog/services - API clients
  supabase/              # @treefrog/supabase - Database client + types
  ui/                    # @treefrog/ui - Shared React components
  eslint-config/         # @treefrog/eslint-config - Shared ESLint config

  go/                    # Shared Go packages
    build/               # DockerCompiler, Build types, ExtractZip
    config/              # Environment variable helpers
    http/                # HTTP client factory, JSON helpers
    logging/             # Shared logger initialization
    security/            # Path traversal validation
    signer/              # URL signing utility
    synctex/             # SyncTeX parser
    validation/          # UUID validation

scripts/
  lib/                   # Shared utilities (services, profiles, docker, health)
  dev/                   # Development scripts (start, stop, status, logs)
  build/                 # Build scripts (desktop, docker, backend, cli)
  prod/                  # Production scripts (start, stop, logs)

supabase/
  schema.sql             # Database schema (managed by Supabase)
```

Use `workspace:*` for internal dependencies. Run `pnpm install` from root.

## Go Workspace

The project uses Go workspaces (`go.work`) to manage multiple modules:

```go
go 1.24.0

use (
    ./apps/desktop
    ./apps/local-cli
    ./apps/local-latex-compiler
    ./apps/remote-latex-compiler
    ./packages/go/build
    ./packages/go/config
    ./packages/go/http
    ./packages/go/logging
    ./packages/go/security
    ./packages/go/signer
    ./packages/go/synctex
    ./packages/go/validation
)
```

Shared Go packages in `packages/go/` can be imported using their module paths:
- `github.com/alpha-og/treefrog/packages/go/build`
- `github.com/alpha-og/treefrog/packages/go/config`
- `github.com/alpha-og/treefrog/packages/go/http`
- `github.com/alpha-og/treefrog/packages/go/logging`
- `github.com/alpha-og/treefrog/packages/go/security`
- `github.com/alpha-og/treefrog/packages/go/signer`
- `github.com/alpha-og/treefrog/packages/go/synctex`
- `github.com/alpha-og/treefrog/packages/go/validation`

## Environment Variables

Each app has its own environment configuration:

### Remote Compiler (`apps/remote-latex-compiler/`)
- `.env.example` - Template with all variables (committed)
- `.env.development` - Non-secret dev config only (committed)
- `.env.production` - Non-secret prod config only (committed)
- `.env.local` - All secrets + overrides (gitignored)

Run `pnpm env:setup` to create `.env.local` from the template, then add your secrets.

### Docker Compose

Each compiler has its own `compose.yml`:
- `apps/local-latex-compiler/compose.yml` - Local compiler (no auth)
- `apps/remote-latex-compiler/compose.yml` - Remote compiler (loads `.env.local` for secrets)

### Desktop (`apps/desktop/frontend/`)
- `.env.example` - Template (committed)
- `.env.development` - Auto-loaded by `vite dev` (committed - safe, client-side only)
- `.env.production` - Auto-loaded by `vite build` (committed - safe, client-side only)
- `.env.local` - Local overrides (gitignored)

### Website (`apps/website/`)
- `.env.example` - Template (committed)
- `.env.development` - Auto-loaded by `vite dev` (committed - safe, client-side only)
- `.env.production` - Auto-loaded by `vite build` (committed - safe, client-side only)
- `.env.local` - Local overrides (gitignored)

### What's Safe to Commit

| Variable | Safe? | Reason |
|----------|-------|--------|
| `VITE_*` (frontend) | **Yes** | Client-side, Supabase anon key is public-safe |
| `SUPABASE_URL` | Yes | Public URL |
| `SUPABASE_SECRET_KEY` | **NO** | Full access, bypasses RLS |
| `DATABASE_URL` | **NO** | Database credentials |
| `RAZORPAY_*` | **NO** | Payment secrets |
| `COMPILER_SIGNING_KEY` | **NO** | URL signing secret |

### Environment Variables

#### Remote Compiler (`apps/remote-latex-compiler/`)
- `DATABASE_URL` - Supabase PostgreSQL connection string
- `SUPABASE_URL` - Supabase project URL (for JWKS token verification)
- `SUPABASE_SECRET_KEY` - Supabase service_role key (SECRET, bypasses RLS)
- `RAZORPAY_*` - Payment configuration
- `REDIS_URL` - Redis for rate limiting
- `COMPILER_*` - Compiler settings

#### Desktop (`apps/desktop/frontend/`)
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon/public key
- `VITE_API_URL` - Backend API URL
- `VITE_WEBSITE_URL` - Website for auth/billing redirect

#### Website (`apps/website/`)
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon/public key
- `VITE_API_URL` - Backend API URL
- `VITE_WEBSITE_URL` - Website URL (for redirects)

Copy `.env.example` to `.env.local` in each directory and fill in values.

## Code Style

### TypeScript/React
- Use TypeScript strict mode with `noUnusedLocals` and `noUnusedParameters`
- Functional components with explicit return types when complex
- Path aliases: `@/components`, `@/hooks`, `@/services`, `@/stores`, `@/utils`, `@/lib`
- Import order: React -> External libs (motion, lucide-react) -> Internal aliases -> Relative imports
- Zustand for state management with `persist` middleware
- React 19 for desktop and website
- Components export as `export default function ComponentName()`
- Use `cn()` utility from `@/lib/utils` for conditional classNames

### Go
- Standard Go formatting (gofmt)
- Package structure: `internal/` for app-private code, `cmd/` for binaries
- Errors wrapped with context: `fmt.Errorf("failed to create container: %w", err)`
- HTTP status codes: `http.StatusBadRequest`, not 400
- Config structs with nested types (ServerConfig, BuildConfig, etc.)
- Helper functions for env vars: `getEnvOrDefault`, `getIntEnv`, `getDurationEnv`

### Naming
- TypeScript: PascalCase types/interfaces, camelCase functions/variables
- Go: PascalCase exports, camelCase internals
- Files: kebab-case (e.g., `build-service.ts`, `renderer-service.ts`)
- Components: PascalCase matching filename (e.g., `Sidebar.tsx` -> `Sidebar`)
- Stores: camelCase with `Store` suffix (e.g., `appStore.ts`, `fileStore.ts`)

### Error Handling
- TypeScript: Try/catch with typed errors, user-facing messages via sonner
- Go: Early returns, wrap errors with context, log with structured logger
- Always validate user input before processing

## Important Notes

- Preserve existing features: local Docker renderer, custom compiler URLs
- All auth routes require Supabase JWT (passed in Authorization header)
- Delta-sync caching: compute SHA256 checksums before upload
- Build artifacts expire after 24 hours
- Frontend uses Tailwind 4 with oklch colors
- No breaking changes to existing stores (appStore, fileStore)
- Desktop and website both use React 19 for shared UI components
- Windows development requires WSL for shell scripts
