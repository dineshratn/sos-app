#!/bin/bash

#############################################
# Emergency Service - Database Migration Runner
#############################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database connection parameters
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_NAME="${DB_NAME:-sos_emergency}"
DB_SSLMODE="${DB_SSLMODE:-disable}"

# PostgreSQL connection string
PGPASSWORD="$DB_PASSWORD"
export PGPASSWORD

PSQL_CMD="psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"

echo -e "${BLUE}==================================${NC}"
echo -e "${BLUE}Emergency Service Database Migrations${NC}"
echo -e "${BLUE}==================================${NC}\n"

# Check if database is accessible
echo -e "${YELLOW}Checking database connection...${NC}"
if ! $PSQL_CMD -c '\q' 2>/dev/null; then
    echo -e "${RED}✗ Failed to connect to database${NC}"
    echo "  Host: $DB_HOST:$DB_PORT"
    echo "  Database: $DB_NAME"
    echo "  User: $DB_USER"
    exit 1
fi
echo -e "${GREEN}✓ Database connection successful${NC}\n"

# Create migrations table if it doesn't exist
echo -e "${YELLOW}Creating migrations tracking table...${NC}"
$PSQL_CMD -c "
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
" 2>/dev/null
echo -e "${GREEN}✓ Migrations table ready${NC}\n"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/../internal/db/migrations"

if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo -e "${RED}✗ Migrations directory not found: $MIGRATIONS_DIR${NC}"
    exit 1
fi

# Run migrations
echo -e "${YELLOW}Running migrations...${NC}"

for migration_file in "$MIGRATIONS_DIR"/*.sql; do
    if [ -f "$migration_file" ]; then
        migration_name=$(basename "$migration_file")
        version="${migration_name%.sql}"

        # Check if migration has already been applied
        applied=$(PSQL_CMD -t -c "SELECT COUNT(*) FROM schema_migrations WHERE version = '$version';" 2>/dev/null | tr -d ' ')

        if [ "$applied" -eq "0" ]; then
            echo -e "  ${BLUE}Applying migration: ${migration_name}${NC}"

            if $PSQL_CMD -f "$migration_file" 2>&1; then
                # Record migration as applied
                $PSQL_CMD -c "INSERT INTO schema_migrations (version) VALUES ('$version');" 2>/dev/null
                echo -e "  ${GREEN}✓ Migration applied successfully${NC}"
            else
                echo -e "  ${RED}✗ Migration failed: ${migration_name}${NC}"
                exit 1
            fi
        else
            echo -e "  ${GREEN}✓ Already applied: ${migration_name}${NC}"
        fi
    fi
done

echo -e "\n${GREEN}==================================${NC}"
echo -e "${GREEN}All migrations completed successfully!${NC}"
echo -e "${GREEN}==================================${NC}\n"

# Show applied migrations
echo -e "${BLUE}Applied Migrations:${NC}"
$PSQL_CMD -c "SELECT version, applied_at FROM schema_migrations ORDER BY applied_at;"

echo ""
