#!/bin/bash

# Docker Build Script for SOS App
# This script builds all Docker images without starting containers

set -e

echo "🔨 Building all Docker images..."
echo "================================="

cd "$(dirname "$0")/.."

docker-compose build

echo ""
echo "✅ Build complete!"
echo ""
echo "💡 To start services:"
echo "   ./scripts/docker-up.sh"
