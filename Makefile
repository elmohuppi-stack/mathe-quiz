.PHONY: help build up start down stop logs clean restart db-reset db-seed test-unit dev dev-up dev-start dev-down dev-restart dev-logs dev-logs-backend dev-logs-frontend dev-logs-validator

# Colors for output
BLUE=\033[0;34m
GREEN=\033[0;32m
YELLOW=\033[0;33m
NC=\033[0m # No Color
COMPOSE=docker-compose
DEV_COMPOSE=$(COMPOSE) -f docker-compose.yml -f docker-compose.dev.yml

help:
	@echo "$(BLUE)Mathe-Quiz - Docker Management$(NC)"
	@echo ""
	@echo "$(GREEN)Available commands:$(NC)"
	@echo "  $(YELLOW)make build$(NC)          - Build Docker images"
	@echo "  $(YELLOW)make up$(NC)             - Start all containers (build if needed)"
	@echo "  $(YELLOW)make start$(NC)          - Start all containers (without rebuild)"
	@echo "  $(YELLOW)make down$(NC)           - Stop and remove containers"
	@echo "  $(YELLOW)make stop$(NC)           - Stop containers (keep data)"
	@echo "  $(YELLOW)make restart$(NC)        - Restart all containers"
	@echo "  $(YELLOW)make dev$(NC)            - Alias for fast dev mode with live reload"
	@echo "  $(YELLOW)make dev-up$(NC)         - Start fast dev mode with live reload"
	@echo "  $(YELLOW)make dev-restart$(NC)    - Restart fast dev mode containers"
	@echo "  $(YELLOW)make dev-down$(NC)       - Stop fast dev mode containers"
	@echo "  $(YELLOW)make dev-logs$(NC)       - Show logs from fast dev mode"
	@echo "  $(YELLOW)make logs$(NC)           - Show logs from all containers"
	@echo "  $(YELLOW)make logs-backend$(NC)   - Show backend logs"
	@echo "  $(YELLOW)make logs-frontend$(NC)  - Show frontend logs"
	@echo "  $(YELLOW)make logs-validator$(NC) - Show validator logs"
	@echo "  $(YELLOW)make logs-db$(NC)        - Show database logs"
	@echo "  $(YELLOW)make clean$(NC)          - Remove containers, volumes, and data"
	@echo "  $(YELLOW)make test-unit$(NC)      - Run backend unit tests"
	@echo "  $(YELLOW)make db-reset$(NC)       - Reset database (remove and recreate)"
	@echo "  $(YELLOW)make ps$(NC)             - Show running containers"
	@echo "  $(YELLOW)make shell-backend$(NC)  - SSH into backend container"
	@echo "  $(YELLOW)make shell-db$(NC)       - SSH into database container"
	@echo ""
	@echo "$(GREEN)Quick Start:$(NC)"
	@echo "  1. $(YELLOW)make up$(NC) - Start everything"
	@echo "     or $(YELLOW)make dev-up$(NC) - Start live-reload development mode"
	@echo "  2. Open http://localhost:3031 in your browser"
	@echo "  3. $(YELLOW)make logs$(NC) - Watch logs"
	@echo "  4. $(YELLOW)make down$(NC) - Stop everything"
	@echo ""

# Build Docker images
build:
	@echo "$(GREEN)Building Docker images...$(NC)"
	$(COMPOSE) build

# Start all containers (rebuild if needed)
up: build
	@echo "$(GREEN)Starting containers...$(NC)"
	$(COMPOSE) up -d
	@echo "$(GREEN)✓ All containers started!$(NC)"
	@echo "$(BLUE)Access the application at: http://localhost:3031$(NC)"
	@echo "$(BLUE)API available at: http://localhost:3032$(NC)"
	@echo "$(BLUE)Validator available at: http://localhost:3001$(NC)"
	@echo "$(BLUE)Database on: localhost:5432$(NC)"

# Start containers without rebuilding
start:
	@echo "$(GREEN)Starting containers...$(NC)"
	$(COMPOSE) up -d
	@echo "$(GREEN)✓ Containers started!$(NC)"

# Start live-reload development containers
dev: dev-up

dev-up: build
	@echo "$(GREEN)Starting live-reload development containers...$(NC)"
	$(DEV_COMPOSE) up -d
	@echo "$(GREEN)✓ Dev mode started!$(NC)"
	@echo "$(BLUE)Code changes now reload without make build / make restart.$(NC)"

# Start live-reload development containers without rebuilding
dev-start:
	@echo "$(GREEN)Starting live-reload development containers...$(NC)"
	$(DEV_COMPOSE) up -d
	@echo "$(GREEN)✓ Dev mode started!$(NC)"

# Stop containers but keep data
stop:
	@echo "$(YELLOW)Stopping containers...$(NC)"
	$(COMPOSE) stop
	@echo "$(GREEN)✓ Containers stopped (data preserved)$(NC)"

# Stop and remove containers
down:
	@echo "$(YELLOW)Stopping and removing containers...$(NC)"
	$(COMPOSE) down
	@echo "$(GREEN)✓ Containers removed$(NC)"

dev-down:
	@echo "$(YELLOW)Stopping live-reload development containers...$(NC)"
	$(DEV_COMPOSE) down
	@echo "$(GREEN)✓ Dev mode containers removed$(NC)"

# Restart all containers
restart: down start
	@echo "$(GREEN)✓ Containers restarted!$(NC)"

dev-restart: dev-down dev-start
	@echo "$(GREEN)✓ Dev mode containers restarted!$(NC)"

# View logs from all containers
logs:
	$(COMPOSE) logs -f

dev-logs:
	$(DEV_COMPOSE) logs -f

# View backend logs
logs-backend:
	$(COMPOSE) logs -f backend

dev-logs-backend:
	$(DEV_COMPOSE) logs -f backend

# View frontend logs
logs-frontend:
	$(COMPOSE) logs -f frontend

dev-logs-frontend:
	$(DEV_COMPOSE) logs -f frontend

# View validator logs
logs-validator:
	$(COMPOSE) logs -f validator

dev-logs-validator:
	$(DEV_COMPOSE) logs -f validator

# View database logs
logs-db:
	$(COMPOSE) logs -f postgres

# Show running containers
ps:
	@echo "$(GREEN)Running containers:$(NC)"
	$(COMPOSE) ps

# Shell into backend container
shell-backend:
	$(COMPOSE) exec backend sh

# Shell into database container
shell-db:
	$(COMPOSE) exec postgres psql -U mathe_user -d mathe_quiz

# Reset database (remove volume and recreate)
db-reset: down
	@echo "$(YELLOW)Removing database volume...$(NC)"
	docker volume rm mathe-quiz_postgres_data 2>/dev/null || true
	@echo "$(GREEN)✓ Database volume removed$(NC)"
	@echo "$(GREEN)Starting fresh database...$(NC)"
	$(COMPOSE) up -d postgres
	@sleep 5
	@echo "$(GREEN)✓ New database created!$(NC)"

# Clean up everything (containers, volumes, data)
clean: down
	@echo "$(YELLOW)Cleaning up Docker resources...$(NC)"
	docker volume rm mathe-quiz_postgres_data 2>/dev/null || true
	@echo "$(GREEN)✓ All Docker resources cleaned!$(NC)"

# Run backend unit tests
test-unit:
	@echo "$(GREEN)Running backend unit tests...$(NC)"
	npm run test --workspace=backend

# Health check
health:
	@echo "$(GREEN)Checking service health...$(NC)"
	@echo "Frontend (3031): $$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3031 || echo 'DOWN')"
	@echo "Backend (3032): $$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3032/health || echo 'DOWN')"
	@echo "Validator (3001): $$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/health || echo 'DOWN')"
	@echo "Database (5432): $$( $(COMPOSE) exec -T postgres pg_isready -U mathe_user 2>/dev/null || echo 'DOWN')"

# Default target
.DEFAULT_GOAL := help
