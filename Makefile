.PHONY: builder local web dev dev-no-builder stop wails wails-dev wails-build

builder:
	BUILDER_TOKEN=$${BUILDER_TOKEN} ./scripts/start-builder.sh

local:
	PROJECT_ROOT=$${PROJECT_ROOT} BUILDER_URL=$${BUILDER_URL} BUILDER_TOKEN=$${BUILDER_TOKEN} ./scripts/start-local.sh

web:
	./scripts/start-web.sh

dev:
	PROJECT_ROOT=$${PROJECT_ROOT} BUILDER_URL=$${BUILDER_URL} BUILDER_TOKEN=$${BUILDER_TOKEN} ./scripts/dev.sh

dev-no-builder:
	./scripts/dev-no-builder.sh

stop:
	docker compose down

# Wails Desktop App Commands
wails:
	@echo "Building Wails desktop app..."
	cd wails && wails build

wails-dev:
	@echo "Running Wails in development mode..."
	cd wails && wails dev

wails-build:
	@echo "Building Wails for current platform..."
	cd wails && wails build

wails-build-all:
	@echo "Building Wails for all platforms..."
	cd wails && wails build -platform darwin/amd64
	cd wails && wails build -platform darwin/arm64
	cd wails && wails build -platform windows/amd64
	cd wails && wails build -platform linux/amd64

wails-doctor:
	cd wails && wails doctor
