@echo off
REM Fix Database - Recreate tables with proper UUID support

echo ==================================================
echo   Fixing Database Tables
echo ==================================================
echo.

echo Step 1: Dropping existing database...
docker exec postgres-sos psql -U postgres -c "DROP DATABASE IF EXISTS sos_app_auth"
echo [32m✓ Database dropped[0m
echo.

echo Step 2: Creating fresh database...
docker exec postgres-sos psql -U postgres -c "CREATE DATABASE sos_app_auth"
echo [32m✓ Database created[0m
echo.

echo Step 3: Enabling UUID extension...
docker exec postgres-sos psql -U postgres -d sos_app_auth -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\""
echo [32m✓ UUID extension enabled[0m
echo.

echo ==================================================
echo [32m✓ Database reset complete![0m
echo ==================================================
echo.
echo [33mNext steps:[0m
echo 1. Restart the auth service (Ctrl+C and npm run dev)
echo 2. Wait for 'Database synced successfully'
echo 3. Run tests: node test-features.js
echo.
pause
