.PHONY: help build up start down stop logs clean restart db-reset db-seed

# Colors for output
BLUE=\033[0;34m
GREEN=\033[0;32m
YELLOW=\033[0;33m
NC=\033[0m # No Color

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
	@echo "  $(YELLOW)make logs$(NC)           - Show logs from all containers"
	@echo "  $(YELLOW)make logs-backend$(NC)   - Show backend logs"
	@echo "  $(YELLOW)make logs-frontend$(NC)  - Show frontend logs"
	@echo "  $(YELLOW)make logs-validator$(NC) - Show validator logs"
	@echo "  $(YELLOW)make logs-db$(NC)        - Show database logs"
	@echo "  $(YELLOW)make clean$(NC)          - Remove containers, volumes, and data"
	@echo "  $(YELLOW)make db-reset$(NC)       - Reset database (remove and recreate)"
	@echo "  $(YELLOW)make ps$(NC)             - Show running containers"
	@echo "  $(YELLOW)make shell-backend$(NC)  - SSH into backend container"
	@echo "  $(YELLOW)make shell-db$(NC)       - SSH into database container"
	@echo ""
	@echo "$(GREEN)Quick Start:$(NC)"
	@echo "  1. $(YELLOW)make up$(NC) - Start everything"
	@echo "  2. Open http://localhost:3031 in your browser"
	@echo "  3. $(YELLOW)make logs$(NC) - Watch logs"
	@echo "  4. $(YELLOW)make down$(NC) - Stop everything"
	@echo ""

# Build Docker images
build:
	@echo "$(GREEN)Building Docker images...$(NC)"
	docker-compose build

# Start all containers (rebuild if needed)
up: build
	@echo "$(GREEN)Starting containers...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✓ All containers started!$(NC)"
	@echo "$(BLUE)Access the application at: http://localhost:3031$(NC)"
	@echo "$(BLUE)API available at: http://localhost:3032$(NC)"
	@echo "$(BLUE)Validator available at: http://localhost:3001$(NC)"
	@echo "$(BLUE)Database on: localhost:5432$(NC)"

# Start containers without rebuilding
start:
	@echo "$(GREEN)Starting containers...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✓ Containers started!$(NC)"

# Stop containers but keep data
stop:
	@echo "$(YELLOW)Stopping containers...$(NC)"
	docker-compose stop
	@echo "$(GREEN)✓ Containers stopped (data preserved)$(NC)"

# Stop and remove containers
down:
	@echo "$(YELLOW)Stopping and removing containers...$(NC)"
	docker-compose down
	@echo "$(GREEN)✓ Containers removed$(NC)"

# Restart all containers
restart: down start
	@echo "$(GREEN)✓ Containers restarted!$(NC)"

# View logs from all containers
logs:
	docker-compose logs -f

# View backend logs
logs-backend:
	docker-compose logs -f backend

# View frontend logs
logs-frontend:
	docker-compose logs -f frontend

# View validator logs
logs-validator:
	docker-compose logs -f validator

# View database logs
logs-db:
	docker-compose logs -f postgres

# Show running containers
ps:
	@echo "$(GREEN)Running containers:$(NC)"
	docker-compose ps

# Shell into backend container
shell-backend:
	docker-compose exec backend sh

# Shell into database container
shell-db:
	docker-compose exec postgres psql -U mathe_user -d mathe_quiz

# Reset database (remove volume and recreate)
db-reset: down
	@echo "$(YELLOW)Removing database volume...$(NC)"
	docker volume rm mathe-quiz_postgres_data 2>/dev/null || true
	@echo "$(GREEN)✓ Database volume removed$(NC)"
	@echo "$(GREEN)Starting fresh database...$(NC)"
	docker-compose up -d postgres
	@sleep 5
	@echo "$(GREEN)✓ New database created!$(NC)"

# Clean up everything (containers, volumes, data)
clean: down
	@echo "$(YELLOW)Cleaning up Docker resources...$(NC)"
	docker volume rm mathe-quiz_postgres_data 2>/dev/null || true
	@echo "$(GREEN)✓ All Docker resources cleaned!$(NC)"

# Health check
health:
	@echo "$(GREEN)Checking service health...$(NC)"
	@echo "Frontend (3031): $$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3031 || echo 'DOWN')"
	@echo "Backend (3032): $$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3032/health || echo 'DOWN')"
	@echo "Validator (3001): $$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/health || echo 'DOWN')"
	@echo "Database (5432): $$(docker-compose exec -T postgres pg_isready -U mathe_user 2>/dev/null || echo 'DOWN')"

# Default target
.DEFAULT_GOAL := help
