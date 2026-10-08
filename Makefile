# Spec Studio — lệnh dev thường dùng. Gõ `make` hoặc `make help` để xem danh sách.
#
# Mọi target gọi pnpm script trong package.json; Makefile chỉ là lối tắt thống nhất.
# Node lấy theo .nvmrc qua nvm, pnpm lấy theo "packageManager" qua corepack.

SHELL := /usr/bin/env bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := help
MAKEFLAGS += --no-print-directory

# Nạp nvm + Node theo .nvmrc trước mỗi lệnh, để make chạy đúng Node 24 kể cả khi shell đang ở bản khác.
NVM_DIR ?= $(HOME)/.nvm
NODE := source "$(NVM_DIR)/nvm.sh" --no-use && nvm use --silent >/dev/null &&
REQUIRE_PKG := { test -f package.json || { echo "Chưa có package.json: project chưa được khởi tạo (Phase −1 trong spec)."; exit 1; }; } &&
PNPM := $(REQUIRE_PKG) $(NODE) corepack pnpm

SPEC_STUDIO_HOME ?= $(HOME)/.spec-studio
export SPEC_STUDIO_HOME

# DATA_DRIVER (JSON | POSTGRES) đọc từ .env.local; script db:* tự xử lý theo driver.
COMPOSE := docker compose

# PORT/PORT_START đọc từ .env.local (ưu tiên) hoặc .env, để next dev/start nhận đúng port.
LOAD_ENV := set -a; for f in .env .env.local; do [ -f "$$f" ] && . "./$$f"; done; set +a;

##@ Cài đặt

.PHONY: setup
setup: ## Cài đặt toàn bộ cho máy mới (nvm, Node, pnpm, deps, migrate, sinh API)
	@./setup.sh

.PHONY: install
install: ## Cài dependencies theo pnpm-lock.yaml
	@$(PNPM) install --frozen-lockfile

.PHONY: doctor
doctor: ## Kiểm tra phiên bản Node/pnpm và các CLI tuỳ chọn
	@$(NODE) printf 'node  %s (yêu cầu %s)\n' "$$(node -v)" "$$(cat .nvmrc)"
	@$(NODE) printf 'pnpm  %s\n' "$$(corepack pnpm --version 2>/dev/null || echo 'lỗi: chạy make setup')"
	@for bin in git gh glab claude codex agy aider nlm; do \
		if command -v $$bin >/dev/null 2>&1; then printf '  ✓ %s\n' "$$bin"; \
		else printf '  - %s (chưa cài)\n' "$$bin"; fi; \
	done

##@ Phát triển

.PHONY: dev
dev: ## Chạy dev server (tự sinh lại API trước khi chạy)
	@$(LOAD_ENV) $(PNPM) dev

.PHONY: build
build: ## Build production
	@$(PNPM) build

.PHONY: start
start: ## Chạy bản build production
	@$(LOAD_ENV) PORT="$${PORT_START:-$$PORT}" $(PNPM) start

##@ API (OpenAPI)

.PHONY: api
api: ## Sinh docs/api.json, lint spec, sinh client FE (Orval)
	@$(PNPM) api

.PHONY: api-build
api-build: ## Chỉ sinh docs/api.json từ các defineRoute
	@$(PNPM) api:build

.PHONY: api-gen
api-gen: ## Chỉ sinh client FE từ docs/api.json
	@$(PNPM) api:gen

.PHONY: api-check
api-check: api ## Kiểm tra docs/api.json và client sinh ra đã được commit (dùng trong CI)
	@git diff --exit-code -- docs/api.json src/client/api/generated \
		|| { echo "API chưa đồng bộ: chạy 'make api' rồi commit thay đổi."; exit 1; }

##@ Data (DATA_DRIVER = JSON | POSTGRES)

.PHONY: db-up
db-up: ## Bật Postgres dev bằng docker compose (chỉ cần khi DATA_DRIVER=POSTGRES)
	@$(COMPOSE) up -d --wait postgres

.PHONY: db-down
db-down: ## Tắt Postgres dev (giữ dữ liệu trong volume)
	@$(COMPOSE) down

.PHONY: migrate
migrate: ## Chạy migration chưa áp dụng (POSTGRES); JSON thì bỏ qua
	@$(PNPM) db:migrate

.PHONY: migrate-down
migrate-down: ## Rollback migration gần nhất (POSTGRES)
	@$(PNPM) db:rollback

.PHONY: migration
migration: ## Tạo migration (POSTGRES): make migration name=create_workspaces container=Studio/Workspace
	@test -n "$(name)" || { echo "Thiếu name=<tên_migration>"; exit 2; }
	@test -n "$(container)" || { echo "Thiếu container=<Section>/<Container>"; exit 2; }
	@$(PNPM) db:make --name "$(name)" --container "$(container)"

.PHONY: migrate-status
migrate-status: ## Xem migration đã/chưa áp dụng
	@$(PNPM) db:status

.PHONY: seed
seed: ## Nạp dữ liệu mẫu qua repository (chạy được cả hai driver)
	@$(PNPM) db:seed

.PHONY: db-reset
db-reset: ## XOÁ toàn bộ dữ liệu của driver hiện tại rồi migrate + seed lại (cần CONFIRM=1)
	@test "$(CONFIRM)" = "1" || { echo "Lệnh này xoá toàn bộ dữ liệu (DATA_DIR hoặc database Postgres). Chạy lại với: make db-reset CONFIRM=1"; exit 2; }
	@$(PNPM) db:reset
	@$(MAKE) migrate
	@$(MAKE) seed

##@ Chất lượng

.PHONY: lint
lint: ## ESLint
	@$(PNPM) lint

.PHONY: format
format: ## Prettier ghi đè file
	@$(PNPM) format

.PHONY: typecheck
typecheck: ## tsc --noEmit
	@$(PNPM) typecheck

.PHONY: test
test: ## Chạy toàn bộ test (Vitest)
	@$(PNPM) test

.PHONY: test-watch
test-watch: ## Test ở chế độ watch
	@$(PNPM) test:watch

.PHONY: check
check: lint typecheck test api-check ## Toàn bộ kiểm tra như CI

##@ Dọn dẹp

.PHONY: clean
clean: ## Xoá cache build (.next, cache của tool)
	@rm -rf .next node_modules/.cache coverage

.PHONY: clean-all
clean-all: clean ## Xoá thêm node_modules (cài lại bằng make install)
	@rm -rf node_modules

##@ Trợ giúp

.PHONY: help
help: ## Hiện danh sách lệnh
	@awk 'BEGIN {FS = ":.*## "; printf "\nCách dùng: make \033[36m<target>\033[0m\n"} \
		/^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } \
		/^[a-zA-Z0-9_-]+:.*## / { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
	@echo
