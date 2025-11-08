#!/bin/bash

# Docker Compose Up Script for SOS App
# This script starts all services with Docker Desktop

set -e

echo "🚀 Starting SOS App Services..."
echo "=================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

cd "$(dirname "$0")/.."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << 'ENV_EOF'
# Database Configuration
POSTGRES_USER=sos_user
POSTGRES_PASSWORD=sos_password
POSTGRES_DB=sos_db
POSTGRES_PORT=5432

MONGO_USER=admin
MONGO_PASSWORD=admin_password
MONGO_DB=sos_db
MONGO_PORT=27017

# Redis Configuration
REDIS_PORT=6379

# Kafka Configuration
KAFKA_PORT=9092

# Application Configuration
NODE_ENV=development
LOG_LEVEL=debug

# JWT Configuration
JWT_SECRET=your-super-secret-key-change-in-production-12345
JWT_EXPIRY=24h
ENV_EOF
    echo "✅ .env file created"
fi

# Build services
echo ""
echo "🔨 Building Docker images..."
docker-compose build

# Start services
echo ""
echo "📦 Starting containers..."
docker-compose up -d

# Wait for services
echo ""
echo "⏳ Waiting for services to be ready..."
sleep 15

# Show status
echo ""
echo "🏥 Service Status:"
docker-compose ps

echo ""
echo "✅ All services started!"
echo ""
echo "📡 Service URLs:"
echo "   🌐 API Gateway: http://localhost:3000"
echo "   🔐 Auth Service: http://localhost:3001"
echo "   👤 User Service: http://localhost:3002"
echo "   💬 Communication Service: http://localhost:3003"
echo "   🏥 Medical Service: http://localhost:3004"
echo "   📢 Notification Service: http://localhost:3005"
echo "   📱 Device Service: http://localhost:3006"
echo "   📍 Location Service: http://localhost:3007"
echo "   🚨 Emergency Service: http://localhost:3008"
echo "   🤖 LLM Service: http://localhost:3009"
echo "   🖥️  Web Frontend: http://localhost:3010"
echo ""
echo "🔍 Debug Ports:"
echo "   Node.js (9229-9234): Use Chrome DevTools chrome://inspect"
echo "   Go Delve (40000-40002): Use VS Code Go debugger"
echo "   Python (5678): Use Python debugger"
