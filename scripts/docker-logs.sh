#!/bin/bash

# Docker Logs Script for SOS App
# Usage: ./scripts/docker-logs.sh [service_name]

cd "$(dirname "$0")/.."

if [ -z "$1" ]; then
    echo "📋 Showing logs for all services..."
    docker-compose logs -f
else
    echo "📋 Showing logs for $1..."
    docker-compose logs -f "$1"
fi
