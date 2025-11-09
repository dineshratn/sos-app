#!/bin/bash

# Docker Rebuild Script for SOS App
# This script rebuilds all images without using cache

set -e

echo "🔨 Rebuilding all Docker images (no cache)..."
echo "=============================================="

cd "$(dirname "$0")/.."

docker-compose build --no-cache

echo ""
echo "✅ Rebuild complete!"
echo ""
echo "💡 To restart services:"
echo "   ./scripts/docker-down.sh && ./scripts/docker-up.sh"
