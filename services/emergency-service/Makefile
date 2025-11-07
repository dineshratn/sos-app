.PHONY: help build run test clean docker-build docker-run deps migrate

# Variables
BINARY_NAME=emergency-service
DOCKER_IMAGE=sos-app/emergency-service
DOCKER_TAG=latest

help: ## Display this help message
	@echo "Emergency Service - Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

deps: ## Download Go dependencies
	@echo "Downloading dependencies..."
	go mod download
	go mod tidy

build: deps ## Build the service binary
	@echo "Building $(BINARY_NAME)..."
	go build -o $(BINARY_NAME) main.go
	@echo "Build complete: $(BINARY_NAME)"

run: ## Run the service locally
	@echo "Running $(BINARY_NAME)..."
	go run main.go

test: ## Run unit tests
	@echo "Running tests..."
	go test -v ./tests/... -cover

test-coverage: ## Run tests with coverage report
	@echo "Running tests with coverage..."
	go test -v ./tests/... -coverprofile=coverage.out
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

lint: ## Run linter
	@echo "Running linter..."
	golangci-lint run ./...

fmt: ## Format code
	@echo "Formatting code..."
	go fmt ./...
	goimports -w .

clean: ## Clean build artifacts
	@echo "Cleaning..."
	rm -f $(BINARY_NAME)
	rm -f coverage.out coverage.html
	@echo "Clean complete"

docker-build: ## Build Docker image
	@echo "Building Docker image..."
	docker build -t $(DOCKER_IMAGE):$(DOCKER_TAG) .
	@echo "Docker image built: $(DOCKER_IMAGE):$(DOCKER_TAG)"

docker-run: ## Run Docker container
	@echo "Running Docker container..."
	docker run -p 8080:8080 --env-file .env $(DOCKER_IMAGE):$(DOCKER_TAG)

docker-push: ## Push Docker image to registry
	@echo "Pushing Docker image..."
	docker push $(DOCKER_IMAGE):$(DOCKER_TAG)

migrate-up: ## Run database migrations up
	@echo "Running migrations up..."
	psql $(DATABASE_URL) -f internal/db/migrations/001_create_emergencies_table.sql
	psql $(DATABASE_URL) -f internal/db/migrations/002_create_acknowledgments_table.sql
	@echo "Migrations complete"

migrate-down: ## Run database migrations down (destructive!)
	@echo "WARNING: This will drop all tables!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		psql $(DATABASE_URL) -c "DROP TABLE IF EXISTS emergency_acknowledgments CASCADE;"; \
		psql $(DATABASE_URL) -c "DROP TABLE IF EXISTS emergencies CASCADE;"; \
		echo "Tables dropped"; \
	fi

dev: ## Run in development mode with hot reload (requires air)
	@echo "Starting development mode..."
	air

install-tools: ## Install development tools
	@echo "Installing development tools..."
	go install github.com/cosmtrek/air@latest
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	go install golang.org/x/tools/cmd/goimports@latest
	@echo "Tools installed"

.DEFAULT_GOAL := help
