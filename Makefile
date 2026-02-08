.PHONY: builder local web dev dev-no-builder stop

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
