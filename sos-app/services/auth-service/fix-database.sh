#!/bin/bash

# Fix Database - Recreate tables with proper UUID support

echo "=================================================="
echo "  Fixing Database Tables"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Step 1: Dropping existing database...${NC}"
docker exec postgres-sos psql -U postgres -c "DROP DATABASE IF EXISTS sos_app_auth"
echo -e "${GREEN}✓ Database dropped${NC}"
echo ""

echo -e "${YELLOW}Step 2: Creating fresh database...${NC}"
docker exec postgres-sos psql -U postgres -c "CREATE DATABASE sos_app_auth"
echo -e "${GREEN}✓ Database created${NC}"
echo ""

echo -e "${YELLOW}Step 3: Enabling UUID extension...${NC}"
docker exec postgres-sos psql -U postgres -d sos_app_auth -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\""
echo -e "${GREEN}✓ UUID extension enabled${NC}"
echo ""

echo "=================================================="
echo -e "${GREEN}✓ Database reset complete!${NC}"
echo "=================================================="
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Restart the auth service (Ctrl+C and npm run dev)"
echo "2. Wait for 'Database synced successfully'"
echo "3. Run tests: node test-features.js"
echo ""
