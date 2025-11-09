#!/bin/bash

# Docker Compose Up Script for SOS App - LIGHTWEIGHT VERSION
# This script starts all services using optimized Bitnami images
# Much faster startup and lower resource usage

set -e

echo "🚀 Starting SOS App Services (Lightweight Version)..."
echo "===================================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

cd "$(dirname "$0")/.."

# Check if we need to use the lightweight compose file
COMPOSE_FILE="docker-compose-light.yml"

if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ Error: $COMPOSE_FILE not found!"
    echo "Please ensure docker-compose-light.yml exists in the project root."
    exit 1
fi

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

# Clean up old containers if requested
if [ "$1" == "--clean" ]; then
    echo "🧹 Cleaning up old containers..."
    docker-compose -f "$COMPOSE_FILE" down -v 2>/dev/null || true
    sleep 2
fi

echo ""
echo "🔨 Building Docker images..."
docker-compose -f "$COMPOSE_FILE" build --no-cache 2>&1 | grep -E "(Building|Successfully|ERROR|error)" || true

echo ""
echo "📦 Starting infrastructure services (databases, cache, message queue)..."
docker-compose -f "$COMPOSE_FILE" up -d postgres mongodb redis zookeeper

# Wait for infrastructure to be ready
echo ""
echo "⏳ Waiting for infrastructure services to be healthy..."
echo "   This may take 30-60 seconds..."

# Wait for Zookeeper (required for Kafka)
echo "   ⏳ Waiting for Zookeeper..."
for i in {1..30}; do
    if docker exec sos-zookeeper echo "ruok" | nc -w 1 localhost 2181 2>/dev/null | grep -q "imok"; then
        echo "   ✅ Zookeeper is ready"
        break
    fi
    echo -n "."
    sleep 2
done

# Start Kafka
echo ""
echo "📦 Starting Kafka..."
docker-compose -f "$COMPOSE_FILE" up -d kafka

# Wait for Kafka
echo "   ⏳ Waiting for Kafka broker..."
for i in {1..30}; do
    if docker exec sos-kafka kafka-broker-api-versions.sh --bootstrap-server localhost:9092 > /dev/null 2>&1; then
        echo "   ✅ Kafka is ready"
        break
    fi
    echo -n "."
    sleep 2
done

# Wait for other infrastructure
echo ""
echo "   ⏳ Waiting for other services..."
sleep 10

# Start all services
echo ""
echo "📦 Starting all services..."
docker-compose -f "$COMPOSE_FILE" up -d

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for all services to be healthy..."
echo "   This may take another 30-60 seconds..."

SERVICES=(
    "sos-auth-service:3001"
    "sos-user-service:3002"
    "sos-communication-service:3003"
    "sos-medical-service:3004"
    "sos-notification-service:3005"
    "sos-api-gateway:3000"
)

for service_info in "${SERVICES[@]}"; do
    IFS=':' read -r container port <<< "$service_info"
    echo "   ⏳ Waiting for $container..."

    for i in {1..30}; do
        if curl -sf http://localhost:$port/health > /dev/null 2>&1; then
            echo "   ✅ $container is ready"
            break
        fi
        echo -n "."
        sleep 2
    done
done

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
echo ""
echo "🔍 Database Connection Info:"
echo "   PostgreSQL: localhost:5432"
echo "   MongoDB: localhost:27017"
echo "   Redis: localhost:6379"
echo "   Kafka: localhost:9092"
echo "   Zookeeper: localhost:2181"
echo ""
echo "🔍 Debug Ports:"
echo "   Node.js Inspector: 9229-9234"
echo ""
echo "📝 View logs:"
echo "   ./scripts/docker-logs.sh"
echo ""
echo "🛑 Stop services:"
echo "   ./scripts/docker-down.sh"
echo ""
echo "🌐 Testing Website:"
echo "   http://localhost:8000/login.html (if running local server)"
echo ""
echo "Happy testing! 🚀"

# Show service status
echo ""
echo "Service Status:"
docker-compose -f "$COMPOSE_FILE" ps
