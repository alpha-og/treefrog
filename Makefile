.PHONY: dev build build-all doctor stop

# Development configuration
LOG_LEVEL ?= DEBUG
LOG_FORMAT ?= text
VITE_LOG_LEVEL ?= debug

# Desktop App Development
dev:
	@echo "Running Treefrog in development mode..."
	@echo "Generating Wails bindings..."
	@cd wails && wails build -s
	@echo "Logging configuration:"
	@echo "  Backend:  LOG_LEVEL=$(LOG_LEVEL), LOG_FORMAT=$(LOG_FORMAT)"
	@echo "  Frontend: VITE_LOG_LEVEL=$(VITE_LOG_LEVEL)"
	@echo "To change logging, use: make dev LOG_LEVEL=INFO VITE_LOG_LEVEL=warn"
	LOG_LEVEL=$(LOG_LEVEL) LOG_FORMAT=$(LOG_FORMAT) VITE_LOG_LEVEL=$(VITE_LOG_LEVEL) cd wails && wails dev

build:
	@echo "Building Treefrog for current platform..."
	@echo "Generating Wails bindings..."
	@cd wails && wails build -s
	@echo "Building frontend..."
	@cd frontend && pnpm install && pnpm build
	@echo "Copying frontend dist to wails..."
	@mkdir -p wails/frontend/dist
	@cp -r frontend/dist/* wails/frontend/dist/
	@cd wails && wails build

build-all:
	@echo "Building Treefrog for all platforms..."
	@echo "Generating Wails bindings..."
	@cd wails && wails build -s
	@echo "Building frontend..."
	@cd frontend && pnpm install && pnpm build
	@echo "Copying frontend dist to wails..."
	@mkdir -p wails/frontend/dist
	@cp -r frontend/dist/* wails/frontend/dist/
	cd wails && wails build -platform darwin/amd64
	cd wails && wails build -platform darwin/arm64
	cd wails && wails build -platform windows/amd64
	cd wails && wails build -platform linux/amd64

# Remote Builder (Docker)
builder:
	@echo "Starting remote builder..."
	docker compose up --build -d

stop:
	@echo "Stopping services..."
	docker compose down

# Diagnostics
doctor:
	@echo "Checking Wails setup..."
	cd wails && wails doctor

# Helper targets for different log levels
.PHONY: dev-debug dev-info dev-warn dev-error

dev-debug:
	@$(MAKE) dev LOG_LEVEL=DEBUG VITE_LOG_LEVEL=debug

dev-info:
	@$(MAKE) dev LOG_LEVEL=INFO VITE_LOG_LEVEL=info

dev-warn:
	@$(MAKE) dev LOG_LEVEL=WARN VITE_LOG_LEVEL=warn

dev-error:
	@$(MAKE) dev LOG_LEVEL=ERROR VITE_LOG_LEVEL=error
