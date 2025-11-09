#!/bin/bash

# SOS App - Start All Services Script
# This script starts all services using Docker Compose

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   🚀  SOS App - Starting All Services                    ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "📝  Creating .env from .env.example..."
    cp .env.example .env
    echo "✅  .env file created. Please update it with your configuration."
    echo ""
fi

# Check Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌  Error: Docker is not running!"
    echo "Please start Docker and try again."
    exit 1
fi

echo "🔍  Checking Docker Compose version..."
docker-compose --version
echo ""

# Pull latest images
echo "📥  Pulling latest base images..."
docker-compose pull
echo ""

# Build services
echo "🔨  Building all services..."
docker-compose build
echo ""

# Start services
echo "🚀  Starting all services..."
docker-compose up -d
echo ""

# Wait for services to be healthy
echo "⏳  Waiting for services to be healthy..."
echo "This may take 1-2 minutes..."
echo ""

# Function to check service health
check_service_health() {
    local service=$1
    local port=$2
    local max_attempts=30
    local attempt=1

    echo -n "Checking $service on port $port... "

    while [ $attempt -le $max_attempts ]; do
        if curl -f -s http://localhost:$port/health > /dev/null 2>&1; then
            echo "✅ Healthy"
            return 0
        fi
        sleep 2
        attempt=$((attempt + 1))
    done

    echo "❌ Failed to start"
    return 1
}

# Check databases first
echo "📊  Checking databases..."
sleep 10

# Check services
echo ""
echo "🔍  Checking backend services..."
check_service_health "API Gateway" 3000
check_service_health "Auth Service" 3001
check_service_health "User Service" 3002
check_service_health "Emergency Service" 3003
check_service_health "Location Service" 3004
check_service_health "Notification Service" 3005
check_service_health "Communication Service" 3006

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   ✅  All Services Started Successfully!                 ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "🌐  API Gateway:           http://localhost:3000"
echo "🔐  Auth Service:          http://localhost:3001"
echo "👤  User Service:          http://localhost:3002"
echo "🚨  Emergency Service:     http://localhost:3003"
echo "📍  Location Service:      http://localhost:3004"
echo "🔔  Notification Service:  http://localhost:3005"
echo "💬  Communication Service: http://localhost:3006"
echo ""
echo "📊  Databases:"
echo "    PostgreSQL (Auth):     localhost:5432"
echo "    PostgreSQL (User):     localhost:5433"
echo "    MongoDB:               localhost:27017"
echo "    Redis:                 localhost:6379"
echo "    Kafka:                 localhost:9092"
echo ""
echo "📝  View logs:             docker-compose logs -f [service-name]"
echo "📊  View all logs:         docker-compose logs -f"
echo "🛑  Stop services:         ./stop-services.sh"
echo "🔄  Restart services:      docker-compose restart"
echo ""
