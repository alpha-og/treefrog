.PHONY: dev dev-debug dev-info dev-warn dev-error build build-all build-backend \
        compiler stop logs \
        test test-backend test-frontend test-backend-verbose \
        lint lint-backend lint-frontend \
        fmt fmt-backend fmt-frontend \
        typecheck typecheck-frontend \
        doctor clean clean-all \
        install deps

LOG_LEVEL ?= DEBUG
LOG_FORMAT ?= text
VITE_LOG_LEVEL ?= debug

# ==================== Installation ====================

install deps:
	@echo "Installing all dependencies..."
	pnpm install
	@echo "Dependencies installed!"

# ==================== Desktop App ====================

dev:
	@echo "Running Treefrog desktop app in development mode..."
	@echo "Generating Wails bindings..."
	@cd desktop && wails build -s
	@echo "Installing frontend dependencies..."
	@cd desktop/frontend && pnpm install
	@echo "Starting Wails dev server..."
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

build:
	@echo "Building Treefrog desktop app for current platform..."
	@echo "Generating Wails bindings..."
	@cd desktop && wails build -s
	@echo "Building frontend..."
	@cd desktop/frontend && pnpm install && pnpm build
	@echo "Building desktop app..."
	@cd desktop && wails build
	@echo "Build complete: desktop/build/bin/"

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
	@echo "All builds complete!"

# ==================== Backend (LaTeX Compiler) ====================

compiler:
	@echo "Starting LaTeX compiler backend with Docker..."
	docker compose up --build -d

stop:
	@echo "Stopping services..."
	docker compose down

logs:
	docker compose logs -f latex-renderer

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
	@cd latex-compiler && go test ./... -v -race -coverprofile=coverage.out

test-frontend:
	@echo "Running frontend tests..."
	@cd desktop/frontend && pnpm test

# ==================== Code Quality ====================

lint: lint-backend lint-frontend
	@echo "Linting complete!"

lint-backend:
	@echo "Linting backend..."
	@cd latex-compiler && golangci-lint run --timeout=5m

lint-frontend:
	@echo "Linting frontend..."
	@cd desktop/frontend && pnpm lint

fmt: fmt-backend fmt-frontend
	@echo "Formatting complete!"

fmt-backend:
	@echo "Formatting backend code..."
	@cd latex-compiler && go fmt ./...

fmt-frontend:
	@echo "Formatting frontend code..."
	@cd desktop/frontend && pnpm format

typecheck: typecheck-frontend
	@echo "Type checking complete!"

typecheck-frontend:
	@echo "Type checking frontend..."
	@cd desktop/frontend && pnpm typecheck

# ==================== Website ====================

website-dev:
	@echo "Starting website development server..."
	@cd website && pnpm dev

website-build:
	@echo "Building website..."
	@cd website && pnpm build

website-preview:
	@cd website && pnpm preview

# ==================== Diagnostics ====================

doctor:
	@echo "Checking development environment..."
	@echo "Checking Wails setup..."
	@cd desktop && wails doctor
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

# ==================== Cleanup ====================

clean:
	@echo "Cleaning build artifacts..."
	@rm -rf desktop/build/bin/*
	@rm -rf latex-compiler/server
	@rm -rf latex-compiler/coverage.out
	@rm -rf **/dist/
	@rm -rf **/node_modules/.cache/
	@echo "Clean complete!"

clean-all: clean
	@echo "Removing all node_modules..."
	@rm -rf node_modules
	@rm -rf desktop/frontend/node_modules
	@rm -rf website/node_modules
	@rm -rf packages/*/node_modules
	@echo "Deep clean complete!"
