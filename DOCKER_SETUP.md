# SOS App Docker Setup Guide

Complete guide for setting up and deploying SOS App services locally using Docker Desktop with debug enabled.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Services Overview](#services-overview)
- [Debug Configuration](#debug-configuration)
- [Troubleshooting](#troubleshooting)
- [Advanced Usage](#advanced-usage)

## Prerequisites

### System Requirements

- **Docker Desktop**: Version 4.0 or higher
  - Windows 10/11 Pro, Enterprise, or Education
  - macOS 11 (Big Sur) or later
  - Linux with Docker and Docker Compose installed

- **Node.js & npm**: Version 20.x (for local development)
- **Git**: For version control
- **Minimum Resources**:
  - CPU: 4 cores
  - RAM: 8GB free (recommended 12GB+)
  - Disk: 20GB free space

### Installation Steps

1. **Install Docker Desktop**:
   - Windows/Mac: Download from https://www.docker.com/products/docker-desktop
   - Linux: Follow https://docs.docker.com/engine/install/

2. **Verify Installation**:
   ```bash
   docker --version
   docker-compose --version
   ```

3. **Clone Repository**:
   ```bash
   git clone <repository-url>
   cd sos-app
   ```

4. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

## Quick Start

### Start All Services

```bash
./scripts/docker-up.sh
```

This script will:
1. Check if Docker is running
2. Create `.env` file if needed
3. Build all Docker images
4. Start all containers with healthchecks
5. Display service URLs and debug ports

### Verify Services

```bash
docker-compose ps
```

Expected output shows all services running:
```
NAME                              STATUS
sos-api-gateway                   Up (healthy)
sos-auth-service                  Up (healthy)
sos-user-service                  Up (healthy)
sos-communication-service         Up (healthy)
sos-medical-service               Up (healthy)
sos-notification-service          Up (healthy)
sos-device-service                Up (healthy)
sos-location-service              Up (healthy)
sos-emergency-service             Up (healthy)
sos-llm-service                   Up (healthy)
sos-postgres                       Up (healthy)
sos-mongodb                        Up (healthy)
sos-redis                          Up (healthy)
sos-kafka                          Up (healthy)
sos-zookeeper                      Up (healthy)
```

### Stop Services

```bash
./scripts/docker-down.sh
```

### View Logs

```bash
# All services
./scripts/docker-logs.sh

# Specific service
./scripts/docker-logs.sh auth-service
```

## Services Overview

### Node.js Services (Port 3000-3005)

| Service | Port | Debug Port | Purpose |
|---------|------|-----------|---------|
| API Gateway | 3000 | 9229 | Central entry point, reverse proxy |
| Auth Service | 3001 | 9230 | Authentication, JWT, OAuth, MFA |
| User Service | 3002 | 9231 | User profiles, emergency contacts |
| Communication | 3003 | 9232 | Real-time messaging, WebSocket |
| Medical Service | 3004 | 9233 | HIPAA-compliant medical records |
| Notification | 3005 | 9234 | Push, SMS, email notifications |

### Go Services (Port 3006-3008)

| Service | Port | Debug Port | Purpose |
|---------|------|-----------|---------|
| Device Service | 3006 | 40000 | IoT device management |
| Location Service | 3007 | 40001 | Real-time location tracking |
| Emergency Service | 3008 | 40002 | Emergency handling & dispatch |

### Python Services (Port 3009)

| Service | Port | Debug Port | Purpose |
|---------|------|-----------|---------|
| LLM Service | 3009 | 5678 | AI/ML operations |

### Infrastructure Services

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5432 | Primary relational database |
| MongoDB | 27017 | Document database |
| Redis | 6379 | Cache & session store |
| Kafka | 9092 | Message streaming |
| Zookeeper | 2181 | Kafka coordination |

### Web Frontend (Port 3010)

| Service | Port | Purpose |
|---------|------|---------|
| Web | 3010 | Next.js frontend application |

## Debug Configuration

### Node.js Debugging

Debug Node.js services using Chrome DevTools:

1. **Open Chrome DevTools**:
   - Navigate to: `chrome://inspect`
   - Click "Configure" and add:
     - localhost:9229
     - localhost:9230
     - localhost:9231
     - localhost:9232
     - localhost:9233
     - localhost:9234

2. **Set Breakpoints**:
   - Select service in DevTools
   - Click "inspect"
   - Set breakpoints in editor

3. **Using VS Code**:
   ```json
   {
     "version": "0.2.0",
     "configurations": [
       {
         "name": "Attach to API Gateway",
         "type": "node",
         "request": "attach",
         "port": 9229,
         "address": "localhost",
         "restart": true
       }
     ]
   }
   ```

### Go Debugging (Delve)

Debug Go services using Delve:

1. **VS Code Configuration**:
   ```json
   {
     "name": "Connect to Device Service",
     "type": "go",
     "request": "attach",
     "mode": "local",
     "remotePath": "/app",
     "port": 40000,
     "host": "localhost"
   }
   ```

2. **GoLand/IntelliJ Configuration**:
   - Run → Edit Configurations
   - Add "Go Remote"
   - Host: localhost
   - Port: 40000 (or 40001, 40002)

### Python Debugging

Debug Python service using debugpy:

1. **VS Code Configuration**:
   ```json
   {
     "name": "Python: Attach LLM Service",
     "type": "python",
     "request": "attach",
     "connect": {
       "host": "localhost",
       "port": 5678
     }
   }
   ```

2. **PyCharm Configuration**:
   - Run → Edit Configurations
   - Add "Python Debug Server"
   - Host: localhost
   - Port: 5678

### Environment Variable Debug Mode

Control debug output via `.env`:

```bash
# Enable debug for all services
DEBUG=sos:*

# Enable debug for specific services
DEBUG=sos:auth-service,sos:user-service

# Set log level
LOG_LEVEL=debug    # debug, info, warn, error
```

## Troubleshooting

### Port Already in Use

If a port is already in use:

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port in docker-compose.yml
```

### Services Won't Start

1. **Check logs**:
   ```bash
   docker-compose logs [service_name]
   ```

2. **Verify database connectivity**:
   ```bash
   docker-compose exec postgres psql -U sos_user -d sos_db -c "SELECT 1"
   ```

3. **Check environment variables**:
   ```bash
   docker-compose config
   ```

### Database Connection Issues

1. **PostgreSQL**:
   ```bash
   docker-compose exec postgres psql -U sos_user -d sos_db
   ```

2. **MongoDB**:
   ```bash
   docker-compose exec mongodb mongosh -u admin -p admin_password
   ```

### Memory Issues

Increase Docker memory allocation:
- Docker Desktop → Settings → Resources
- Increase "Memory" slider (minimum 8GB recommended)

### Network Issues

Rebuild network:
```bash
docker network rm sos-network
docker-compose up -d
```

## Advanced Usage

### Build Specific Service

```bash
docker-compose build auth-service
```

### Rebuild Without Cache

```bash
./scripts/docker-rebuild.sh

# Or specific service
docker-compose build --no-cache auth-service
```

### Run One-Off Commands

```bash
# Run migration in auth-service
docker-compose exec auth-service npm run migrate:up

# Run tests
docker-compose exec auth-service npm test

# Execute shell
docker-compose exec auth-service sh
```

### View Resource Usage

```bash
docker stats

# Continuous monitoring
docker stats --no-stream=false
```

### Access Database Directly

```bash
# PostgreSQL
docker-compose exec postgres psql -U sos_user -d sos_db

# MongoDB
docker-compose exec mongodb mongosh -u admin -p admin_password

# Redis
docker-compose exec redis redis-cli
```

### Export/Import Data

```bash
# Backup PostgreSQL
docker-compose exec postgres pg_dump -U sos_user sos_db > backup.sql

# Restore PostgreSQL
docker-compose exec -T postgres psql -U sos_user sos_db < backup.sql

# Backup MongoDB
docker-compose exec mongodb mongodump --out=/backup

# Restore MongoDB
docker-compose exec mongodb mongorestore /backup
```

### Scale Services

```bash
# Run multiple instances of a service
docker-compose up -d --scale notification-service=3
```

## Development Workflow

### Making Code Changes

1. **Edit source code** in `services/[name]/src/`
2. **Save file** - services restart automatically (hot reload enabled)
3. **Check logs**:
   ```bash
   ./scripts/docker-logs.sh [service_name]
   ```

### Running Tests

```bash
# All tests
docker-compose exec auth-service npm test

# Watch mode
docker-compose exec auth-service npm run test:watch

# Coverage
docker-compose exec auth-service npm run test:coverage
```

### Database Migrations

```bash
# Create migration
docker-compose exec medical-service npm run migrate:create

# Run pending migrations
docker-compose exec medical-service npm run migrate:up

# Rollback
docker-compose exec medical-service npm run migrate:down
```

### Clean Up Everything

```bash
# Remove all containers and volumes (WARNING: Deletes data!)
./scripts/docker-clean.sh
```

## Performance Optimization

### For Development

1. Use hot reloading (already enabled)
2. Disable unnecessary services:
   ```bash
   # Edit docker-compose.yml and comment out services
   ```

3. Reduce logging verbosity:
   ```bash
   LOG_LEVEL=info  # Instead of debug
   ```

### For Production-Like Testing

1. Rebuild without caches:
   ```bash
   ./scripts/docker-rebuild.sh
   ```

2. Set NODE_ENV to production:
   ```bash
   NODE_ENV=production
   ```

3. Remove debug ports from docker-compose.yml

## Security Notes

⚠️ **WARNING**: This setup is for LOCAL DEVELOPMENT ONLY

Never use in production:
- Default database passwords
- Exposed debug ports
- NODE_ENV=development
- Default JWT_SECRET

For production deployment, see `DEPLOYMENT.md`

## Common Commands Reference

```bash
# Start services
./scripts/docker-up.sh

# Stop services
./scripts/docker-down.sh

# View logs
./scripts/docker-logs.sh [service_name]

# Rebuild images
./scripts/docker-rebuild.sh

# Clean everything
./scripts/docker-clean.sh

# Check service status
docker-compose ps

# Execute command in container
docker-compose exec [service] [command]

# View environment
docker-compose config
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Node.js Inspector](https://nodejs.org/en/docs/guides/debugging-getting-started/)
- [Delve Debugger](https://github.com/go-delve/delve)
- [Python debugpy](https://github.com/microsoft/debugpy)

## Support

For issues or questions:
1. Check the Troubleshooting section
2. Review service logs: `./scripts/docker-logs.sh [service]`
3. Check Docker Desktop logs
4. Open an issue on GitHub with logs and environment details
