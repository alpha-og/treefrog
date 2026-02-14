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

# Docker
make compiler                     # Start Docker compiler (with Redis, Postgres)
make stop                         # Stop Docker services
make logs                         # View Docker logs

# Frontend only
cd desktop/frontend && pnpm dev   # Frontend dev server
cd desktop/frontend && pnpm build # Production build

# Backend only
cd latex-compiler && go build -o server ./cmd/server

# Website
make website-dev                  # Start website dev server
make website-build                # Build website

# Diagnostics
make doctor                       # Check Wails setup
make clean                        # Clean build artifacts
make clean-all                    # Deep clean (removes node_modules)
```

## Testing

```bash
# All tests
make test                         # Run all tests

# Go tests
make test-backend                 # Run Go tests
make test-backend-verbose         # Verbose Go tests with coverage
cd latex-compiler && go test ./pkg/build -run TestCreateBuild  # Single test

# Frontend tests
make test-frontend                # Run frontend tests (placeholder)
cd desktop/frontend && pnpm test  # Direct frontend test
```

## Linting and Formatting

```bash
# Linting
make lint                         # Lint all code
make lint-backend                 # Lint Go code (golangci-lint)
make lint-frontend                # Lint frontend (ESLint)

# Formatting
make fmt                          # Format all code
make fmt-backend                  # Format Go code
make fmt-frontend                 # Format frontend code

# Type checking
make typecheck                    # Type check frontend
```

## Code Style

### TypeScript/React
- Use TypeScript strict mode
- Functional components with explicit return types
- Path aliases: `@/components`, `@/hooks`, `@/services`, `@/stores`, `@/utils`, `@/lib`
- Import order: React → External libs → Internal aliases → Relative imports
- Zustand for state management
- React Query/Tanstack Router for data/routing

### Go
- Standard Go formatting (gofmt)
- Package structure: `pkg/` for libraries, `cmd/` for binaries
- Handler functions return `http.HandlerFunc`
- Errors wrapped with context: `fmt.Errorf("context: %w", err)`
- HTTP status codes: `http.StatusBadRequest`, not 400

### Naming
- TypeScript: PascalCase types/interfaces, camelCase functions/variables
- Go: PascalCase exports, camelCase internals
- Files: kebab-case (e.g., `build-service.ts`)
- Components: PascalCase matching filename

### Error Handling
- TypeScript: Try/catch with typed errors, user-facing messages
- Go: Early returns, check `ok` booleans, log with context
- Always validate user input

## Monorepo Structure

```
packages/               # Shared packages
  types/               # API types
  services/            # HTTP clients
  hooks/               # React hooks
  ui/                  # Shared components

desktop/frontend/      # Desktop app (Wails + React)
latex-compiler/        # Go backend
website/               # Marketing site
```

Use `workspace:*` for internal dependencies. Run `pnpm install` from root.

## Environment Variables

Each component has its own `.env.local` file:

### Website (`website/.env.local`)
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon/public key
- `VITE_API_URL` - Backend API URL
- `VITE_WEBSITE_URL` - Website URL (for redirects)

### Backend (`latex-compiler/.env.local`)
- `DATABASE_URL` - PostgreSQL connection string (SECRET)
- `SUPABASE_URL` - Supabase project URL (for JWKS token verification)
- `SUPABASE_SECRET_KEY` - Supabase service_role key for admin ops (SECRET)
- `RAZORPAY_*` - Payment configuration
- `REDIS_URL` - Redis for rate limiting
- `COMPILER_*` - Compiler settings

### Desktop (`desktop/frontend/.env.local`)
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
