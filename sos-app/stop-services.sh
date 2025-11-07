#!/bin/bash

# SOS App - Stop All Services Script

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   🛑  SOS App - Stopping All Services                    ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Stop all services
echo "🛑  Stopping all services..."
docker-compose stop
echo ""

echo "✅  All services stopped successfully!"
echo ""
echo "💡  Tips:"
echo "    - Restart services:    ./start-services.sh"
echo "    - Remove containers:   docker-compose down"
echo "    - Remove all data:     docker-compose down -v"
echo ""
