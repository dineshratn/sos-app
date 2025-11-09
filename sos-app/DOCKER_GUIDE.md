# SOS App - Docker Deployment Guide

Complete guide for building, testing, and deploying SOS App services using Docker.

## 📦 Overview

The SOS App consists of 3 microservices, each with its own Docker image:

- **auth-service** (Port 3001) - Authentication & user management
- **user-service** (Port 3002) - User profiles & emergency contacts
- **medical-service** (Port 3003) - HIPAA-compliant medical records

Plus supporting services:
- **PostgreSQL** (Port 5432) - Database
- **Redis** (Port 6379) - Session storage

---

## 🚀 Quick Start

### 1. Development Mode (with hot reload)

```bash
# Clone the repository
cd sos-app

# Start all services
docker-compose up --build

# Services will be available at:
# - Auth:    http://localhost:3001
# - User:    http://localhost:3002
# - Medical: http://localhost:3003
```

### 2. Production Mode (optimized images)

```bash
# Build production images
./build-images.sh

# Start with production compose file
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

---

## 🔨 Building Docker Images

### Build All Services

```bash
# Build all images with default tags
./build-images.sh

# Build with custom version tag
VERSION=v1.0.0 ./build-images.sh

# Build with custom registry
DOCKER_REGISTRY=myregistry.com/sos VERSION=v1.0.0 ./build-images.sh
```

### Build Individual Services

```bash
# Auth Service
docker build -t sos-app/auth-service:latest ./services/auth-service

# User Service
docker build -t sos-app/user-service:latest ./services/user-service

# Medical Service
docker build -t sos-app/medical-service:latest ./services/medical-service
```

### Multi-Stage Build Benefits

Our Dockerfiles use multi-stage builds:
- **Stage 1 (builder)**: Compiles TypeScript
- **Stage 2 (production)**: Runs optimized JavaScript

Benefits:
- ✅ Smaller image size (~150MB vs 500MB+)
- ✅ Faster deployment
- ✅ No dev dependencies in production
- ✅ Improved security (fewer packages)

---

## 🏃 Running Services

### Development Mode

```bash
# Start services with hot reload
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes (fresh start)
docker-compose down -v
```

### Production Mode

```bash
# Create .env file from example
cp .env.example .env
# Edit .env with your production values

# Start production services
docker-compose -f docker-compose.prod.yml up -d

# Check service health
docker ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f auth-service
```

---

## 🧪 Testing

### Test with Automated Script

```bash
# Wait for services to be ready (~30 seconds)
docker-compose up -d

# Run integration tests
./test-services.sh
```

### Manual Testing

```bash
# Health checks
curl http://localhost:3001/health  # Auth
curl http://localhost:3002/health  # User
curl http://localhost:3003/health  # Medical

# Register a user
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

---

## 📊 Image Management

### List Images

```bash
# List all SOS App images
docker images | grep sos-app

# Check image sizes
docker images sos-app/*
```

### Remove Images

```bash
# Remove all SOS App images
docker rmi $(docker images -q sos-app/*)

# Remove specific image
docker rmi sos-app/auth-service:latest

# Remove dangling images
docker image prune
```

### Tag Images

```bash
# Tag for different environments
docker tag sos-app/auth-service:latest sos-app/auth-service:v1.0.0
docker tag sos-app/auth-service:latest myregistry.com/auth-service:latest
```

---

## 📤 Pushing to Registry

### Docker Hub

```bash
# Login to Docker Hub
docker login

# Tag images
docker tag sos-app/auth-service:latest username/auth-service:latest
docker tag sos-app/user-service:latest username/user-service:latest
docker tag sos-app/medical-service:latest username/medical-service:latest

# Push images
docker push username/auth-service:latest
docker push username/user-service:latest
docker push username/medical-service:latest
```

### Private Registry

```bash
# Login to private registry
docker login myregistry.com

# Tag images
docker tag sos-app/auth-service:latest myregistry.com/sos/auth-service:v1.0.0
docker tag sos-app/user-service:latest myregistry.com/sos/user-service:v1.0.0
docker tag sos-app/medical-service:latest myregistry.com/sos/medical-service:v1.0.0

# Push images
docker push myregistry.com/sos/auth-service:v1.0.0
docker push myregistry.com/sos/user-service:v1.0.0
docker push myregistry.com/sos/medical-service:v1.0.0
```

### AWS ECR

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

# Create repositories (if not exists)
aws ecr create-repository --repository-name sos/auth-service
aws ecr create-repository --repository-name sos/user-service
aws ecr create-repository --repository-name sos/medical-service

# Tag and push
docker tag sos-app/auth-service:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/sos/auth-service:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/sos/auth-service:latest
```

---

## 🔍 Debugging

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f auth-service

# Last 100 lines
docker-compose logs --tail=100 auth-service

# Follow logs with timestamps
docker-compose logs -f -t auth-service
```

### Execute Commands in Container

```bash
# Open shell in running container
docker exec -it sos-auth-service sh

# Run specific command
docker exec sos-auth-service node -v

# Check environment variables
docker exec sos-auth-service env
```

### Inspect Container

```bash
# Container details
docker inspect sos-auth-service

# Container stats (CPU, memory)
docker stats sos-auth-service

# Network information
docker inspect sos-auth-service | grep IPAddress
```

### Database Access

```bash
# Connect to PostgreSQL
docker exec -it sos-postgres psql -U postgres

# List databases
docker exec -it sos-postgres psql -U postgres -c "\l"

# Query a table
docker exec -it sos-postgres psql -U postgres -d sos_auth -c "SELECT * FROM users;"
```

---

## 🔧 Troubleshooting

### Service Won't Start

```bash
# Check logs
docker logs sos-auth-service

# Check if port is in use
lsof -i :3001

# Restart service
docker restart sos-auth-service
```

### Database Connection Errors

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check database logs
docker logs sos-postgres

# Verify databases exist
docker exec -it sos-postgres psql -U postgres -c "\l"
```

### Build Failures

```bash
# Clear Docker cache
docker builder prune

# Build without cache
docker build --no-cache -t sos-app/auth-service:latest ./services/auth-service

# Check Dockerfile syntax
docker build --dry-run -t test ./services/auth-service
```

### Out of Disk Space

```bash
# Check disk usage
docker system df

# Clean up
docker system prune -a --volumes

# Remove stopped containers
docker container prune

# Remove unused images
docker image prune -a
```

---

## 🔒 Security Best Practices

### 1. Use Non-Root User

✅ All our Dockerfiles create and use a non-root `nodejs` user

### 2. Scan Images for Vulnerabilities

```bash
# Using Docker Scout
docker scout cves sos-app/auth-service:latest

# Using Trivy
trivy image sos-app/auth-service:latest
```

### 3. Use Secrets Management

```bash
# Docker Swarm secrets
docker secret create jwt_secret jwt_secret.txt

# Or use environment variables from .env file
docker-compose --env-file .env.prod up
```

### 4. Keep Images Updated

```bash
# Update base image
docker pull node:20-alpine

# Rebuild images
./build-images.sh
```

---

## 📈 Performance Optimization

### Build Cache

```bash
# Use BuildKit for faster builds
export DOCKER_BUILDKIT=1
docker build -t sos-app/auth-service:latest ./services/auth-service
```

### Image Size

Our optimized images:
- Auth Service: ~150MB
- User Service: ~145MB
- Medical Service: ~148MB

Compare with non-optimized:
- Before: ~500MB
- After: ~150MB
- **70% reduction!**

### Resource Limits

Edit `docker-compose.prod.yml`:

```yaml
services:
  auth-service:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

---

## 🌐 Production Deployment

### Using Docker Compose (Simple)

```bash
# On your server
git clone <repository>
cd sos-app

# Create production .env
cp .env.example .env
nano .env  # Edit with production values

# Build and start
./build-images.sh
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker ps
```

### Using Docker Swarm (Scalable)

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.prod.yml sos-app

# Scale services
docker service scale sos-app_auth-service=3

# Check services
docker stack services sos-app
```

### Using Kubernetes (Advanced)

See separate Kubernetes deployment guide.

---

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Multi-Stage Builds](https://docs.docker.com/develop/develop-images/multistage-build/)
- [Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Security Scanning](https://docs.docker.com/scout/)

---

## 🆘 Common Commands Reference

```bash
# Build
./build-images.sh
docker-compose build

# Start
docker-compose up -d
docker-compose -f docker-compose.prod.yml up -d

# Stop
docker-compose down
docker-compose -f docker-compose.prod.yml down

# Restart
docker-compose restart
docker restart sos-auth-service

# Logs
docker-compose logs -f
docker logs -f sos-auth-service

# Health
curl http://localhost:3001/health
docker inspect --format='{{.State.Health.Status}}' sos-auth-service

# Clean up
docker-compose down -v
docker system prune -a
```

---

**Need Help?** Check [TESTING_GUIDE.md](./TESTING_GUIDE.md) or [QUICKSTART.md](./QUICKSTART.md)
