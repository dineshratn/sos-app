.PHONY: help build run test clean docker-build docker-run

help:
	@echo "Available commands:"
	@echo "  make build        - Build the location service binary"
	@echo "  make run          - Run the location service"
	@echo "  make test         - Run unit tests"
	@echo "  make test-coverage- Run tests with coverage"
	@echo "  make clean        - Remove build artifacts"
	@echo "  make docker-build - Build Docker image"
	@echo "  make docker-run   - Run Docker container"
	@echo "  make lint         - Run golangci-lint"

build:
	@echo "Building location service..."
	go build -o bin/location-service .

run:
	@echo "Running location service..."
	go run main.go

test:
	@echo "Running tests..."
	go test ./... -v

test-coverage:
	@echo "Running tests with coverage..."
	go test ./... -v -coverprofile=coverage.out
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

clean:
	@echo "Cleaning build artifacts..."
	rm -rf bin/
	rm -f coverage.out coverage.html

docker-build:
	@echo "Building Docker image..."
	docker build -t location-service:latest .

docker-run:
	@echo "Running Docker container..."
	docker run -p 3003:3003 --env-file .env location-service:latest

lint:
	@echo "Running linter..."
	golangci-lint run

deps:
	@echo "Downloading dependencies..."
	go mod download

tidy:
	@echo "Tidying go.mod..."
	go mod tidy

dev:
	@echo "Running in development mode with hot reload..."
	air

install-tools:
	@echo "Installing development tools..."
	go install github.com/cosmtrek/air@latest
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

.DEFAULT_GOAL := help
