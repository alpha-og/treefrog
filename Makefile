.PHONY: dev build build-all doctor stop

# Desktop App Development
dev:
	@echo "Running Treefrog in development mode..."
	cd wails && wails dev

build:
	@echo "Building Treefrog for current platform..."
	cd wails && wails build

build-all:
	@echo "Building Treefrog for all platforms..."
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
