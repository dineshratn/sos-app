@echo off
REM Start Dependencies Script for Auth Service (Windows)
REM This script starts PostgreSQL and Redis using Docker

echo ==================================================
echo   Starting Auth Service Dependencies
echo ==================================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [31mX Docker is not running. Please start Docker Desktop first.[0m
    pause
    exit /b 1
)

echo [32m✓ Docker is running[0m
echo.

REM Start PostgreSQL
echo Starting PostgreSQL...
docker rm -f postgres-sos 2>nul

docker run -d ^
  --name postgres-sos ^
  -e POSTGRES_DB=sos_app_auth ^
  -e POSTGRES_USER=postgres ^
  -e POSTGRES_PASSWORD=postgres123 ^
  -p 5432:5432 ^
  postgres:15-alpine

if %errorlevel% equ 0 (
    echo [32m✓ PostgreSQL started on port 5432[0m
) else (
    echo [31mX Failed to start PostgreSQL[0m
    pause
    exit /b 1
)

echo.

REM Start Redis
echo Starting Redis...
docker rm -f redis-sos 2>nul

docker run -d ^
  --name redis-sos ^
  -p 6379:6379 ^
  redis:7-alpine

if %errorlevel% equ 0 (
    echo [32m✓ Redis started on port 6379[0m
) else (
    echo [31mX Failed to start Redis[0m
    pause
    exit /b 1
)

echo.
echo ==================================================
echo [32m✓ All dependencies started successfully![0m
echo ==================================================
echo.
echo Services running:
echo   - PostgreSQL: localhost:5432 (DB: sos_app_auth)
echo   - Redis: localhost:6379
echo.
echo To stop these services, run:
echo   docker stop postgres-sos redis-sos
echo.
echo To remove these services, run:
echo   docker rm -f postgres-sos redis-sos
echo.
echo [33mNext step: Start the auth service[0m
echo   npm run dev
echo.
pause
