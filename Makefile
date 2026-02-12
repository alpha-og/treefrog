.PHONY: dev dev-debug dev-info build build-all test test-backend test-frontend compiler stop doctor lint fmt

# Development configuration
LOG_LEVEL ?= DEBUG
LOG_FORMAT ?= text
VITE_LOG_LEVEL ?= debug

# ==================== Desktop App ====================

# Development
dev:
	@echo "Running Treefrog desktop app in development mode..."
	@echo "Building frontend..."
	@cd desktop/frontend && pnpm install && pnpm build
	@echo "Generating Wails bindings..."
	@cd desktop && wails build -s
	@echo "Wails dev server:"
	@echo "  Backend:  LOG_LEVEL=$(LOG_LEVEL), LOG_FORMAT=$(LOG_FORMAT)"
	@echo "  Frontend: VITE_LOG_LEVEL=$(VITE_LOG_LEVEL)"
	@echo "To change logging, use: make dev LOG_LEVEL=INFO VITE_LOG_LEVEL=warn"
	LOG_LEVEL=$(LOG_LEVEL) LOG_FORMAT=$(LOG_FORMAT) VITE_LOG_LEVEL=$(VITE_LOG_LEVEL) cd desktop && wails dev

dev-debug:
	@$(MAKE) dev LOG_LEVEL=DEBUG VITE_LOG_LEVEL=debug

dev-info:
	@$(MAKE) dev LOG_LEVEL=INFO VITE_LOG_LEVEL=info

dev-warn:
	@$(MAKE) dev LOG_LEVEL=WARN VITE_LOG_LEVEL=warn

dev-error:
	@$(MAKE) dev LOG_LEVEL=ERROR VITE_LOG_LEVEL=error

# Build desktop app
build:
	@echo "Building Treefrog desktop app for current platform..."
	@echo "Generating Wails bindings..."
	@cd desktop && wails build -s
	@echo "Building frontend..."
	@cd desktop/frontend && pnpm install && pnpm build
	@echo "Building desktop app..."
	@cd desktop && wails build

build-all:
	@echo "Building Treefrog desktop app for all platforms..."
	@echo "Generating Wails bindings..."
	@cd desktop && wails build -s
	@echo "Building frontend..."
	@cd desktop/frontend && pnpm install && pnpm build
	@echo "Building for macOS (Intel)..."
	@cd desktop && wails build -platform darwin/amd64
	@echo "Building for macOS (Apple Silicon)..."
	@cd desktop && wails build -platform darwin/arm64
	@echo "Building for Windows..."
	@cd desktop && wails build -platform windows/amd64
	@echo "Building for Linux..."
	@cd desktop && wails build -platform linux/amd64

# ==================== Backend (LaTeX Compiler) ====================

# Backend development
compiler:
	@echo "Starting LaTeX compiler backend with Docker..."
	docker compose up --build -d

stop:
	@echo "Stopping services..."
	docker compose down

# Build backend
build-backend:
	@echo "Building LaTeX compiler backend..."
	@cd latex-compiler && go build -o server ./cmd/server

# ==================== Testing ====================

test: test-backend test-frontend
	@echo "All tests completed!"

test-backend:
	@echo "Running Go backend tests..."
	@cd latex-compiler && go test ./...

test-backend-verbose:
	@echo "Running Go backend tests (verbose)..."
	@cd latex-compiler && go test ./... -v

test-frontend:
	@echo "Running frontend tests..."
	@cd desktop/frontend && pnpm install && pnpm test

# ==================== Code Quality ====================

lint:
	@echo "Linting backend..."
	@cd latex-compiler && go fmt ./...
	@echo "Linting frontend..."
	@cd desktop/frontend && pnpm install && pnpm lint

fmt:
	@echo "Formatting backend code..."
	@cd latex-compiler && go fmt ./...
	@echo "Formatting frontend code..."
	@cd desktop/frontend && pnpm install && pnpm format

# ==================== Diagnostics ====================

doctor:
	@echo "Checking development environment..."
	@echo "Checking Wails setup..."
	@cd desktop && wails doctor
	@echo "Checking Go setup..."
	@go version
	@echo "Checking Node.js setup..."
	@node --version && npm --version
	@echo "Environment check complete!"
