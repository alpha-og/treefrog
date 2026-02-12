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
make compiler                     # Start Docker compiler
make stop                         # Stop Docker services
make doctor                       # Check Wails setup

# Frontend only
cd desktop/frontend && pnpm dev   # Frontend dev server
cd desktop/frontend && pnpm build # Production build

# Backend only
cd latex-compiler && go build -o server ./cmd/server
```

## Testing

```bash
# Go tests
cd latex-compiler && go test ./...
cd latex-compiler && go test ./pkg/build -v                    # Verbose
cd latex-compiler && go test ./pkg/build -run TestCreateBuild  # Single test

# No frontend tests configured yet
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

Copy `.env.example` to `.env.local`:
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk auth
- `CLERK_SECRET_KEY` - Backend auth
- `DATABASE_URL` - SQLite path
- `COMPILER_WORKDIR` - Build artifacts

## Important Notes

- Preserve existing features: local Docker renderer, custom compiler URLs
- All auth routes require Clerk JWT
- Delta-sync caching: compute SHA256 checksums before upload
- Build artifacts expire after 24 hours
- Frontend uses Tailwind 4 with oklch colors
- No breaking changes to existing stores (appStore, fileStore)
