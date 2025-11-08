# SOS App Docker Quick Start

Get SOS App running locally in 5 minutes!

## Prerequisites

- Docker Desktop installed and running
- 8GB+ RAM available
- 20GB+ free disk space

## 5-Minute Setup

### 1. Start Services
```bash
cd sos-app
./scripts/docker-up.sh
```

Wait for the output "All services started!"

### 2. Verify Services
```bash
docker-compose ps
```

All services should show "Up (healthy)"

### 3. Access Services

**API & Services:**
- API Gateway: http://localhost:3000/health
- Auth Service: http://localhost:3001/health
- User Service: http://localhost:3002/health
- Communication: http://localhost:3003/health
- Medical: http://localhost:3004/health
- Notification: http://localhost:3005/health
- Web Frontend: http://localhost:3010

**Debugging:**
- Node.js: chrome://inspect (ports 9229-9234)
- Go: VS Code or GoLand (ports 40000-40002)
- Python: VS Code or PyCharm (port 5678)

## Common Tasks

### View Service Logs
```bash
# All services
./scripts/docker-logs.sh

# Specific service
./scripts/docker-logs.sh auth-service
```

### Stop Services
```bash
./scripts/docker-down.sh
```

### Rebuild Services
```bash
./scripts/docker-rebuild.sh
```

### Clean Everything
```bash
./scripts/docker-clean.sh  # WARNING: Deletes all data!
```

## Service Ports

| Service | Port | Debug Port |
|---------|------|-----------|
| API Gateway | 3000 | 9229 |
| Auth Service | 3001 | 9230 |
| User Service | 3002 | 9231 |
| Communication | 3003 | 9232 |
| Medical | 3004 | 9233 |
| Notification | 3005 | 9234 |
| Device | 3006 | 40000 |
| Location | 3007 | 40001 |
| Emergency | 3008 | 40002 |
| LLM Service | 3009 | 5678 |
| Web Frontend | 3010 | - |
| PostgreSQL | 5432 | - |
| MongoDB | 27017 | - |
| Redis | 6379 | - |
| Kafka | 9092 | - |

## Debug Services

### Node.js (Chrome DevTools)
1. Open: chrome://inspect
2. Click "Configure" → add localhost:9229-9234
3. Select service → "inspect"
4. Set breakpoints and debug

### Go (VS Code)
1. Open VS Code
2. Add to `.vscode/launch.json`:
```json
{
  "name": "Connect to Device Service",
  "type": "go",
  "request": "attach",
  "mode": "local",
  "port": 40000
}
```
3. Press F5 to debug

## Troubleshooting

**Port already in use?**
```bash
lsof -i :3000  # Find process
kill -9 <PID>  # Kill process
```

**Services won't start?**
```bash
docker-compose logs [service_name]  # Check logs
```

**Memory issues?**
- Docker Desktop → Settings → Resources
- Increase "Memory" to 12GB+

**Database connection failed?**
```bash
docker-compose ps  # Check if databases are running
docker-compose logs postgres  # Check PostgreSQL logs
```

## File Structure

```
sos-app/
├── scripts/
│   ├── docker-up.sh          # Start services
│   ├── docker-down.sh         # Stop services
│   ├── docker-logs.sh         # View logs
│   ├── docker-build.sh        # Build images
│   ├── docker-rebuild.sh      # Rebuild (no cache)
│   └── docker-clean.sh        # Remove all (⚠️ warning)
├── docker-compose.yml         # Service orchestration
├── .env.example               # Environment template
├── .env                       # Environment (auto-created)
├── DOCKER_SETUP.md            # Full documentation
├── DOCKER_QUICK_START.md      # This file
└── sos-app/
    ├── services/
    │   ├── api-gateway/
    │   ├── auth-service/
    │   ├── user-service/
    │   ├── communication-service/
    │   ├── medical-service/
    │   ├── notification-service/
    │   ├── device-service/
    │   ├── location-service/
    │   ├── emergency-service/
    │   └── llm-service/
    ├── apps/
    │   └── web/               # Next.js frontend
    └── libs/                  # Shared libraries
```

## Making Changes

1. Edit code in `services/[name]/src/`
2. Service automatically restarts (hot reload enabled)
3. Check logs: `./scripts/docker-logs.sh [service]`

## Useful Commands

```bash
# List all containers
docker ps

# Execute command in container
docker-compose exec [service] [command]

# Run tests
docker-compose exec auth-service npm test

# Run migrations
docker-compose exec medical-service npm run migrate:up

# Access database shell
docker-compose exec postgres psql -U sos_user -d sos_db

# View resource usage
docker stats

# Show running services
docker-compose ps
```

## Next Steps

- Read full docs: [DOCKER_SETUP.md](DOCKER_SETUP.md)
- Check service health: `curl http://localhost:3000/health`
- View API docs at each service URL
- Start debugging with browser DevTools

## Need Help?

1. Check logs: `./scripts/docker-logs.sh [service]`
2. Verify services: `docker-compose ps`
3. Check `.env` configuration
4. Read [DOCKER_SETUP.md](DOCKER_SETUP.md) troubleshooting section
5. Check individual service documentation

---

**Happy Coding! 🚀**
