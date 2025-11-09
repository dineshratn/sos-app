#!/bin/bash

# Docker Clean Script for SOS App
# This script removes all services and volumes (WARNING: Deletes data!)

set -e

echo "⚠️  WARNING: This will delete all data!"
read -p "Are you sure? Type 'yes' to continue: " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Cancelled"
    exit 0
fi

cd "$(dirname "$0")/.."

echo "🗑️  Removing containers and volumes..."
docker-compose down -v

echo "✅ Cleanup complete"
echo ""
echo "💡 To restart everything:"
echo "   ./scripts/docker-up.sh"
