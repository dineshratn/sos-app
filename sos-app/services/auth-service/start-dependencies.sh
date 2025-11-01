#!/bin/bash

# Start Dependencies Script for Auth Service
# This script starts PostgreSQL and Redis using Docker

echo "=================================================="
echo "  Starting Auth Service Dependencies"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}✗ Docker is not running. Please start Docker Desktop first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker is running${NC}"
echo ""

# Start PostgreSQL
echo "Starting PostgreSQL..."
docker rm -f postgres-sos 2>/dev/null

docker run -d \
  --name postgres-sos \
  -e POSTGRES_DB=sos_app_auth \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres123 \
  -p 5432:5432 \
  postgres:15-alpine

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ PostgreSQL started on port 5432${NC}"
else
    echo -e "${RED}✗ Failed to start PostgreSQL${NC}"
    exit 1
fi

echo ""

# Start Redis
echo "Starting Redis..."
docker rm -f redis-sos 2>/dev/null

docker run -d \
  --name redis-sos \
  -p 6379:6379 \
  redis:7-alpine

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Redis started on port 6379${NC}"
else
    echo -e "${RED}✗ Failed to start Redis${NC}"
    exit 1
fi

echo ""
echo "=================================================="
echo -e "${GREEN}✓ All dependencies started successfully!${NC}"
echo "=================================================="
echo ""
echo "Services running:"
echo "  - PostgreSQL: localhost:5432 (DB: sos_app_auth)"
echo "  - Redis: localhost:6379"
echo ""
echo "To stop these services, run:"
echo "  docker stop postgres-sos redis-sos"
echo ""
echo "To remove these services, run:"
echo "  docker rm -f postgres-sos redis-sos"
echo ""
echo -e "${YELLOW}Next step: Start the auth service${NC}"
echo "  npm run dev"
echo ""
