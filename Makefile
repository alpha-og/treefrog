.PHONY: dev dev-debug dev-info dev-warn dev-error build build-all build-backend \
        compiler compiler-dev compiler-prod stop logs \
        local-compiler local-compiler-stop \
        test test-backend test-frontend test-backend-verbose \
        lint lint-backend lint-frontend \
        fmt fmt-backend fmt-frontend \
        typecheck typecheck-frontend \
        doctor clean clean-all \
        install deps env-dev env-prod

LOG_LEVEL ?= DEBUG
LOG_FORMAT ?= text
VITE_LOG_LEVEL ?= debug

install deps:
	@echo "Installing all dependencies..."
	pnpm install
	@echo "Dependencies installed!"

dev:
	@echo "Running Treefrog desktop app in development mode..."
	@echo "Generating Wails bindings..."
	@cd apps/desktop && wails build -s
	@echo "Installing frontend dependencies..."
	@cd apps/desktop/frontend && pnpm install
	@echo "Starting Wails dev server..."
	@echo "  Backend:  LOG_LEVEL=$(LOG_LEVEL), LOG_FORMAT=$(LOG_FORMAT)"
	@echo "  Frontend: VITE_LOG_LEVEL=$(VITE_LOG_LEVEL)"
	@echo "To change logging, use: make dev LOG_LEVEL=INFO VITE_LOG_LEVEL=warn"
	LOG_LEVEL=$(LOG_LEVEL) LOG_FORMAT=$(LOG_FORMAT) VITE_LOG_LEVEL=$(VITE_LOG_LEVEL) cd apps/desktop && wails dev

dev-debug:
	@$(MAKE) dev LOG_LEVEL=DEBUG VITE_LOG_LEVEL=debug

dev-info:
	@$(MAKE) dev LOG_LEVEL=INFO VITE_LOG_LEVEL=info

dev-warn:
	@$(MAKE) dev LOG_LEVEL=WARN VITE_LOG_LEVEL=warn

dev-error:
	@$(MAKE) dev LOG_LEVEL=ERROR VITE_LOG_LEVEL=error

build:
	@echo "Building Treefrog desktop app for current platform..."
	@echo "Generating Wails bindings..."
	@cd apps/desktop && wails build -s
	@echo "Building frontend..."
	@cd apps/desktop/frontend && pnpm install && pnpm build
	@echo "Building desktop app..."
	@cd apps/desktop && wails build
	@echo "Build complete: apps/desktop/build/bin/"

build-all:
	@echo "Building Treefrog desktop app for all platforms..."
	@echo "Generating Wails bindings..."
	@cd apps/desktop && wails build -s
	@echo "Building frontend..."
	@cd apps/desktop/frontend && pnpm install && pnpm build
	@echo "Building for macOS (Intel)..."
	@cd apps/desktop && wails build -platform darwin/amd64
	@echo "Building for macOS (Apple Silicon)..."
	@cd apps/desktop && wails build -platform darwin/arm64
	@echo "Building for Windows..."
	@cd apps/desktop && wails build -platform windows/amd64
	@echo "Building for Linux..."
	@cd apps/desktop && wails build -platform linux/amd64
	@echo "All builds complete!"

compiler:
	@echo "Starting remote LaTeX compiler backend with Docker..."
	cd apps/remote-latex-compiler && docker compose up --build -d

compiler-dev:
	@echo "Starting remote LaTeX compiler in development mode..."
	@echo "Using .env.development"
	cd apps/remote-latex-compiler && docker compose --env-file .env.development up --build -d

compiler-prod:
	@echo "Starting remote LaTeX compiler in production mode..."
	@echo "Using .env.production"
	cd apps/remote-latex-compiler && docker compose --env-file .env.production up --build -d

stop:
	@echo "Stopping services..."
	cd apps/remote-latex-compiler && docker compose down

logs:
	cd apps/remote-latex-compiler && docker compose logs -f remote-latex-compiler

local-compiler:
	@echo "Starting local LaTeX compiler with Docker..."
	cd apps/local-latex-compiler && docker compose up --build -d

local-compiler-stop:
	@echo "Stopping local LaTeX compiler..."
	cd apps/local-latex-compiler && docker compose down

build-backend:
	@echo "Building remote LaTeX compiler backend..."
	@cd apps/remote-latex-compiler && go build -o server ./cmd/server

build-cli:
	@echo "Building local CLI..."
	@cd apps/local-cli && go build -o latex-local ./cmd

test: test-backend test-frontend
	@echo "All tests completed!"

test-backend:
	@echo "Running Go backend tests..."
	@cd apps/remote-latex-compiler && go test ./...

test-backend-verbose:
	@echo "Running Go backend tests (verbose)..."
	@cd apps/remote-latex-compiler && go test ./... -v -race -coverprofile=coverage.out

test-frontend:
	@echo "Running frontend tests..."
	@cd apps/desktop/frontend && pnpm test

lint: lint-backend lint-frontend
	@echo "Linting complete!"

lint-backend:
	@echo "Linting backend..."
	@cd apps/remote-latex-compiler && golangci-lint run --timeout=5m

lint-frontend:
	@echo "Linting frontend..."
	@cd apps/desktop/frontend && pnpm lint

fmt: fmt-backend fmt-frontend
	@echo "Formatting complete!"

fmt-backend:
	@echo "Formatting backend code..."
	@cd apps/remote-latex-compiler && go fmt ./...
	@cd apps/desktop && go fmt ./...

fmt-frontend:
	@echo "Formatting frontend code..."
	@cd apps/desktop/frontend && pnpm format

typecheck: typecheck-frontend
	@echo "Type checking complete!"

typecheck-frontend:
	@echo "Type checking frontend..."
	@cd apps/desktop/frontend && pnpm typecheck

website-dev:
	@echo "Starting website development server..."
	@cd apps/website && pnpm dev

website-build:
	@echo "Building website..."
	@cd apps/website && pnpm build

website-preview:
	@cd apps/website && pnpm preview

doctor:
	@echo "Checking development environment..."
	@echo "Checking Wails setup..."
	@cd apps/desktop && wails doctor
	@echo ""
	@echo "Checking Go setup..."
	@go version
	@echo ""
	@echo "Checking Node.js setup..."
	@node --version
	@npm --version
	@echo ""
	@echo "Checking pnpm setup..."
	@pnpm --version
	@echo ""
	@echo "Environment check complete!"

clean:
	@echo "Cleaning build artifacts..."
	@rm -rf apps/desktop/build/bin/*
	@rm -rf apps/remote-latex-compiler/server
	@rm -rf apps/local-latex-compiler/server
	@rm -rf apps/local-cli/latex-local
	@rm -rf apps/remote-latex-compiler/coverage.out
	@rm -rf **/dist/
	@rm -rf **/node_modules/.cache/
	@echo "Clean complete!"

clean-all: clean
	@echo "Removing all node_modules..."
	@rm -rf node_modules
	@rm -rf apps/desktop/frontend/node_modules
	@rm -rf apps/website/node_modules
	@rm -rf packages/*/node_modules
	@echo "Deep clean complete!"

env-dev:
	@if [ ! -f apps/remote-latex-compiler/.env.development ]; then \
		echo "Error: apps/remote-latex-compiler/.env.development not found"; \
		exit 1; \
	fi
	@echo "Copying .env.development to .env.local..."
	@cp apps/remote-latex-compiler/.env.development apps/remote-latex-compiler/.env.local
	@echo "Development environment configured!"
	@echo "Edit apps/remote-latex-compiler/.env.local with your actual values."

env-prod:
	@if [ ! -f apps/remote-latex-compiler/.env.production ]; then \
		echo "Error: apps/remote-latex-compiler/.env.production not found"; \
		exit 1; \
	fi
	@echo "Copying .env.production to .env.local..."
	@cp apps/remote-latex-compiler/.env.production apps/remote-latex-compiler/.env.local
	@echo "Production environment configured!"
	@echo "Edit apps/remote-latex-compiler/.env.local with your actual values."

env-check:
	@echo "Checking environment configuration..."
	@test -f apps/remote-latex-compiler/.env.local && echo "✓ apps/remote-latex-compiler/.env.local exists" || echo "✗ apps/remote-latex-compiler/.env.local missing (run 'make env-dev' or 'make env-prod')"
	@test -f apps/remote-latex-compiler/.env.development && echo "✓ apps/remote-latex-compiler/.env.development exists" || echo "✗ apps/remote-latex-compiler/.env.development missing"
	@test -f apps/remote-latex-compiler/.env.production && echo "✓ apps/remote-latex-compiler/.env.production exists" || echo "✗ apps/remote-latex-compiler/.env.production missing"
