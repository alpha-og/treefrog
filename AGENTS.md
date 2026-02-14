# Agent Instructions for Treefrog

Guidelines for AI coding agents working in this repository.

## Build Commands

```bash
# Development (desktop app with Wails)
make dev                          # Start dev server with logging
make dev-debug                    # DEBUG level logging
make dev-info                     # INFO level logging

# Building
make build                        # Build for current platform
make build-all                    # Build for all platforms (macOS, Linux, Windows)
make build-backend                # Build Go backend binary
make build-cli                    # Build local CLI

# Docker
make compiler                     # Start Docker compiler (with Redis, Postgres)
make stop                         # Stop Docker services
make logs                         # View Docker logs

# Frontend only
cd apps/desktop/frontend && pnpm dev   # Frontend dev server
cd apps/desktop/frontend && pnpm build # Production build

# Backend only
cd apps/compiler && go build -o server ./cmd/server

# Website
make website-dev                  # Start website dev server
make website-build                # Build website
```

## Testing

```bash
# All tests
make test                         # Run all tests

# Go tests
make test-backend                 # Run Go tests
make test-backend-verbose         # Verbose Go tests with coverage
cd apps/compiler && go test ./internal/build -run TestCreateBuild  # Single test
cd apps/compiler && go test ./internal/build -v -run TestCreateBuild  # Single test verbose

# Frontend tests
make test-frontend                # Run frontend tests (placeholder)
cd apps/desktop/frontend && pnpm test  # Direct frontend test
```

## Linting and Formatting

```bash
make lint                         # Lint all code
make lint-backend                 # Lint Go code (golangci-lint)
make lint-frontend                # Lint frontend (ESLint)
make fmt                          # Format all code
make fmt-backend                  # Format Go code
make fmt-frontend                 # Format frontend code
make typecheck                    # Type check frontend
```

## Code Style

### TypeScript/React
- Use TypeScript strict mode with `noUnusedLocals` and `noUnusedParameters`
- Functional components with explicit return types when complex
- Path aliases: `@/components`, `@/hooks`, `@/services`, `@/stores`, `@/utils`, `@/lib`
- Import order: React → External libs (motion, lucide-react) → Internal aliases → Relative imports
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
- Components: PascalCase matching filename (e.g., `Sidebar.tsx` → `Sidebar`)
- Stores: camelCase with `Store` suffix (e.g., `appStore.ts`, `fileStore.ts`)

### Error Handling
- TypeScript: Try/catch with typed errors, user-facing messages via sonner
- Go: Early returns, wrap errors with context, log with structured logger
- Always validate user input before processing

## Monorepo Structure

```
apps/
  compiler/            # LaTeX compiler server (Go)
    cmd/server/        # HTTP server entry point
    internal/          # Private packages (auth, billing, build, etc.)
    migrations/        # SQL migrations
  local-cli/           # Standalone local LaTeX compiler CLI
  desktop/             # Wails desktop application
    frontend/          # React frontend (React 19)
    *.go               # Go backend (app.go, bindings.go, etc.)
  website/             # Marketing website (React 19)

packages/
  types/               # @treefrog/types - Shared TypeScript types
  services/            # @treefrog/services - API clients
  supabase/            # @treefrog/supabase - Database client + types
  ui/                  # @treefrog/ui - Shared React components
  eslint-config/       # @treefrog/eslint-config - Shared ESLint config

  go/                  # Shared Go packages
    config/            # Environment variable helpers
    http/              # HTTP client factory, JSON helpers
    logging/           # Shared logger initialization
    security/          # Path traversal validation
    signer/            # URL signing utility
    synctex/           # SyncTeX parser
    validation/        # UUID validation
```

Use `workspace:*` for internal dependencies. Run `pnpm install` from root.

## Go Workspace

The project uses Go workspaces (`go.work`) to manage multiple modules:

```go
go 1.24.0

use (
    ./apps/compiler
    ./apps/desktop
    ./apps/local-cli
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
- `github.com/alpha-og/treefrog/packages/go/config`
- `github.com/alpha-og/treefrog/packages/go/http`
- `github.com/alpha-og/treefrog/packages/go/logging`
- `github.com/alpha-og/treefrog/packages/go/security`
- `github.com/alpha-og/treefrog/packages/go/signer`
- `github.com/alpha-og/treefrog/packages/go/synctex`
- `github.com/alpha-og/treefrog/packages/go/validation`

## Environment Variables

Each component has its own `.env.local` file:

### Website (`apps/website/.env.local`)
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon/public key
- `VITE_API_URL` - Backend API URL
- `VITE_WEBSITE_URL` - Website URL (for redirects)

### Backend (`apps/compiler/.env.local`)
- `DATABASE_URL` - PostgreSQL connection string (SECRET)
- `SUPABASE_URL` - Supabase project URL (for JWKS token verification)
- `SUPABASE_SECRET_KEY` - Supabase service_role key (SECRET)
- `RAZORPAY_*` - Payment configuration
- `REDIS_URL` - Redis for rate limiting
- `COMPILER_*` - Compiler settings

### Desktop (`apps/desktop/frontend/.env.local`)
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon/public key
- `VITE_API_URL` - Backend API URL
- `VITE_WEBSITE_URL` - Website for auth/billing redirect

Copy `.env.example` to `.env.local` in each directory and fill in values.

## Important Notes

- Preserve existing features: local Docker renderer, custom compiler URLs
- All auth routes require Supabase JWT (passed in Authorization header)
- Delta-sync caching: compute SHA256 checksums before upload
- Build artifacts expire after 24 hours
- Frontend uses Tailwind 4 with oklch colors
- No breaking changes to existing stores (appStore, fileStore)
- Desktop and website both use React 19 for shared UI components
