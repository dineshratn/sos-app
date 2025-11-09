# SOS App Docker Deployment Guide

This guide provides instructions for deploying SOS App to your local machine using Docker Desktop with debug enabled.

## What's Included

This Docker setup includes:

### Services (11 Total)

**Node.js Services (6):**
1. **API Gateway** (Port 3000) - Central reverse proxy, request routing
2. **Auth Service** (Port 3001) - JWT, OAuth 2.0, MFA, token management
3. **User Service** (Port 3002) - User profiles, emergency contacts
4. **Communication Service** (Port 3003) - Real-time messaging, WebSocket
5. **Medical Service** (Port 3004) - HIPAA-compliant medical records
6. **Notification Service** (Port 3005) - Push, SMS, email notifications

**Go Services (3):**
7. **Device Service** (Port 3006) - IoT device management
8. **Location Service** (Port 3007) - Real-time location tracking, geofencing
9. **Emergency Service** (Port 3008) - Emergency dispatch, SOS handling

**Python Service (1):**
10. **LLM Service** (Port 3009) - AI/ML operations

**Frontend (1):**
11. **Web** (Port 3010) - Next.js frontend application

### Infrastructure Services

- **PostgreSQL** (Port 5432) - Primary relational database
- **MongoDB** (Port 27017) - Document database for real-time data
- **Redis** (Port 6379) - In-memory cache and session store
- **Kafka** (Port 9092) - Message streaming for event-driven architecture
- **Zookeeper** (Port 2181) - Kafka coordination

## Quick Setup (3 Steps)

### Step 1: Clone Repository
```bash
git clone <repository-url>
cd sos-app
```

### Step 2: Start Services
```bash
./scripts/docker-up.sh
```

This script will:
- ✅ Check if Docker is running
- ✅ Create `.env` configuration file
- ✅ Build all Docker images
- ✅ Start all containers
- ✅ Display service URLs and debug ports

### Step 3: Verify Services
```bash
docker-compose ps
```

All services should show "Up (healthy)"

## Service Access

### API Endpoints
```
API Gateway:         http://localhost:3000
Auth Service:        http://localhost:3001
User Service:        http://localhost:3002
Communication:       http://localhost:3003
Medical Service:     http://localhost:3004
Notification:        http://localhost:3005
Device Service:      http://localhost:3006
Location Service:    http://localhost:3007
Emergency Service:   http://localhost:3008
LLM Service:         http://localhost:3009
Web Frontend:        http://localhost:3010
```

Check health status:
```bash
curl http://localhost:3000/health
curl http://localhost:3001/health
# ... and so on
```

### Debug Ports

**Node.js Services (Chrome DevTools):**
```
Port 9229: API Gateway
Port 9230: Auth Service
Port 9231: User Service
Port 9232: Communication Service
Port 9233: Medical Service
Port 9234: Notification Service
```

Access via: `chrome://inspect`

**Go Services (Delve Debugger):**
```
Port 40000: Device Service
Port 40001: Location Service
Port 40002: Emergency Service
```

Configure in VS Code or GoLand

**Python Service (debugpy):**
```
Port 5678: LLM Service
```

Configure in VS Code or PyCharm

## Available Scripts

Located in `./scripts/`:

```bash
# Start all services
./scripts/docker-up.sh

# Stop all services
./scripts/docker-down.sh

# View logs
./scripts/docker-logs.sh [optional: service_name]

# Build images
./scripts/docker-build.sh

# Rebuild without cache
./scripts/docker-rebuild.sh

# Remove everything (WARNING: Deletes data)
./scripts/docker-clean.sh
```

## Configuration

### Environment Variables

Edit `.env` to customize:

```bash
# Database credentials
POSTGRES_USER=sos_user
POSTGRES_PASSWORD=sos_password

# Application settings
NODE_ENV=development
LOG_LEVEL=debug

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRY=24h
```

See `.env.example` for all available options.

## Development Workflow

### 1. Make Code Changes
```bash
# Edit source code
vim sos-app/services/auth-service/src/index.ts
```

### 2. Services Auto-Reload
Services automatically restart when source files change (hot reload enabled)

### 3. View Logs
```bash
./scripts/docker-logs.sh auth-service
```

### 4. Debug in IDE
- Open Chrome DevTools or IDE debugger
- Connect to debug port (see above)
- Set breakpoints and debug

## Testing

### Run Tests
```bash
docker-compose exec auth-service npm test
docker-compose exec user-service npm test:watch
```

### Run Database Migrations
```bash
docker-compose exec medical-service npm run migrate:up
docker-compose exec auth-service npm run migrate:down
```

## Database Access

### PostgreSQL
```bash
docker-compose exec postgres psql -U sos_user -d sos_db

# Common queries
\dt                    # List tables
SELECT * FROM users;   # Query table
```

### MongoDB
```bash
docker-compose exec mongodb mongosh -u admin -p admin_password

# Common commands
db.users.find()
db.messages.count()
```

### Redis
```bash
docker-compose exec redis redis-cli

# Common commands
KEYS *
GET key_name
SET key value
```

## Troubleshooting

### Services Won't Start
```bash
# Check logs
docker-compose logs [service_name]

# Check if port is in use
lsof -i :3000

# Verify Docker is running
docker ps
```

### Database Connection Failed
```bash
# Check database service
docker-compose logs postgres

# Test connection
docker-compose exec postgres pg_isready -U sos_user
```

### High Memory Usage
```bash
# View resource usage
docker stats

# Reduce memory in Docker Desktop Settings
# Or reduce number of services
```

### Port Already in Use
```bash
# Change port in docker-compose.yml
# Or stop the process using the port
lsof -i :3000 | grep LISTEN
kill -9 <PID>
```

## Production Considerations

⚠️ **This setup is for LOCAL DEVELOPMENT only**

For production deployment:
1. Change database passwords in `.env`
2. Set `NODE_ENV=production`
3. Use secure JWT secret
4. Remove debug ports from docker-compose.yml
5. Enable HTTPS/TLS
6. Set up proper logging and monitoring
7. Configure backup and disaster recovery
8. Use environment-specific configurations

See `DEPLOYMENT.md` for production deployment guide.

## File Structure

```
sos-app/
├── docker-compose.yml              # Main orchestration file
├── .env.example                    # Environment template
├── .env                            # Environment (created on first run)
├── DOCKER_QUICK_START.md           # Quick start guide
├── DOCKER_SETUP.md                 # Full documentation
├── DOCKER_DEPLOYMENT.md            # This file
│
├── scripts/
│   ├── docker-up.sh               # Start services
│   ├── docker-down.sh             # Stop services
│   ├── docker-logs.sh             # View logs
│   ├── docker-build.sh            # Build images
│   ├── docker-rebuild.sh          # Rebuild (no cache)
│   └── docker-clean.sh            # Clean everything
│
├── sos-app/
│   ├── services/                  # Microservices
│   │   ├── api-gateway/
│   │   ├── auth-service/
│   │   ├── user-service/
│   │   ├── communication-service/
│   │   ├── medical-service/
│   │   ├── notification-service/
│   │   ├── device-service/
│   │   ├── location-service/
│   │   ├── emergency-service/
│   │   └── llm-service/
│   │
│   ├── apps/
│   │   └── web/                   # Next.js frontend
│   │
│   └── libs/                      # Shared libraries
│       ├── shared/
│       └── api-client/
│
└── [Root configuration files]
```

## System Requirements

### Minimum
- Docker Desktop 4.0+
- 4 CPU cores
- 8GB RAM
- 20GB disk space

### Recommended
- Docker Desktop 4.10+
- 6+ CPU cores
- 12GB+ RAM
- 30GB+ disk space

## Support & Resources

### Documentation
- [DOCKER_QUICK_START.md](DOCKER_QUICK_START.md) - 5-minute guide
- [DOCKER_SETUP.md](DOCKER_SETUP.md) - Complete documentation
- Service README files in each service directory

### Debugging
- Node.js: Use Chrome DevTools (chrome://inspect)
- Go: Use VS Code or GoLand debugger
- Python: Use VS Code or PyCharm debugger

### Common Issues
See [DOCKER_SETUP.md](DOCKER_SETUP.md) Troubleshooting section

### Additional Help
1. Check logs: `./scripts/docker-logs.sh [service]`
2. Verify services: `docker-compose ps`
3. Review `.env` configuration
4. Check Docker Desktop logs
5. Search documentation or create issue

## Next Steps

1. ✅ Start services: `./scripts/docker-up.sh`
2. ✅ Verify all running: `docker-compose ps`
3. ✅ Access web frontend: http://localhost:3010
4. ✅ Check API health: curl http://localhost:3000/health
5. ✅ Set up IDE debugging
6. ✅ Read individual service documentation

## Quick Reference

```bash
# Essential commands
./scripts/docker-up.sh           # Start
./scripts/docker-down.sh         # Stop
./scripts/docker-logs.sh         # View logs
docker-compose ps               # Status
docker-compose exec auth-service npm test  # Run tests

# Database access
docker-compose exec postgres psql -U sos_user -d sos_db
docker-compose exec mongodb mongosh -u admin -p admin_password

# Advanced
docker-compose build auth-service          # Rebuild one service
docker-compose exec postgres psql -l       # List databases
docker stats                               # Resource usage
```

## License & Contributing

See main project README for license and contribution guidelines.

---

**Ready to deploy? Run `./scripts/docker-up.sh` now! 🚀**
