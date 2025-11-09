#!/bin/bash

# Docker Compose Down Script for SOS App
# This script stops and removes all services

set -e

echo "🛑 Stopping SOS App Services..."
echo "================================="

cd "$(dirname "$0")/.."

# Stop and remove containers
docker-compose down

echo "✅ All services stopped"
echo ""
echo "💡 To remove volumes and persistent data:"
echo "   ./scripts/docker-clean.sh"
