# SOS App - Deployment Guide

Complete guide for deploying the SOS App using Docker Compose or Kubernetes.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development (Docker Compose)](#local-development-docker-compose)
3. [Kubernetes Deployment](#kubernetes-deployment)
4. [Deployment Verification](#deployment-verification)
5. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Common Requirements

- **Docker** 20.10+ with Docker Compose
- **Git** for cloning the repository
- **Node.js** 20+ (for local development)
- **Go** 1.21+ (for Go services)

### For Kubernetes Deployment

- **Kubernetes** 1.24+ cluster
- **kubectl** configured with cluster access
- **NGINX Ingress Controller** installed
- Minimum **8GB RAM** and **4 CPU cores** available

---

## Local Development (Docker Compose)

Best for: Local development, testing, and quick demos.

### 1. Setup Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 2. Start All Services

```bash
# Make scripts executable
chmod +x start-services.sh stop-services.sh test-integration.sh

# Start all services
./start-services.sh
```

This will:
- Pull base images
- Build all services
- Start databases (PostgreSQL, MongoDB, Redis, Kafka)
- Start backend services (Auth, User, Emergency, Location, Notification, Communication)
- Start API Gateway
- Wait for health checks

### 3. Verify Deployment

```bash
# Run integration tests
./test-integration.sh
```

### 4. Access Services

| Service | URL | Description |
|---------|-----|-------------|
| API Gateway | http://localhost:3000 | Main entry point |
| Auth Service | http://localhost:3001 | Authentication |
| User Service | http://localhost:3002 | User profiles |
| Emergency Service | http://localhost:3003 | Emergency alerts |
| Location Service | http://localhost:3004 | Location tracking |
| Notification Service | http://localhost:3005 | Push notifications |
| Communication Service | http://localhost:3006 | WebSocket/messaging |

### 5. View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api-gateway

# Last 100 lines
docker-compose logs --tail=100 auth-service
```

### 6. Stop Services

```bash
./stop-services.sh
```

### 7. Clean Up

```bash
# Stop and remove containers
docker-compose down

# Remove all data (including volumes)
docker-compose down -v
```

---

## Kubernetes Deployment

Best for: Production, staging, and scalable deployments.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Ingress (NGINX)                         │
│                   (sos-app.local)                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │    API Gateway (x3)    │
        │      Port: 3000        │
        └───────────┬────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────┐      ┌───────────────┐
│ Auth Service  │      │ User Service  │
│    (x2)       │      │    (x2)       │
│  Port: 3001   │      │  Port: 3002   │
└───────┬───────┘      └───────┬───────┘
        │                      │
        ▼                      ▼
┌───────────────┐      ┌───────────────┐
│  PostgreSQL   │      │  PostgreSQL   │
│     (Auth)    │      │     (User)    │
└───────────────┘      └───────────────┘

        ┌───────────────────────┐
        │  MongoDB (Shared)     │
        │  - Emergency DB       │
        │  - Location DB        │
        │  - Notification DB    │
        │  - Communication DB   │
        └───────────────────────┘

        ┌───────────────────────┐
        │  Redis (Caching)      │
        └───────────────────────┘

        ┌───────────────────────┐
        │  Kafka + Zookeeper    │
        │  (Event Streaming)    │
        └───────────────────────┘
```

### 1. Prepare Cluster

#### Option A: Minikube (Local)

```bash
# Start Minikube with sufficient resources
minikube start --cpus=4 --memory=8192

# Enable ingress
minikube addons enable ingress

# Get Minikube IP
minikube ip
```

#### Option B: Cloud Provider (AWS EKS, GCP GKE, Azure AKS)

```bash
# Example for AWS EKS
eksctl create cluster \
  --name sos-app-dev \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type t3.large \
  --nodes 3 \
  --nodes-min 1 \
  --nodes-max 5
```

### 2. Install NGINX Ingress Controller

```bash
# For Minikube (already enabled above)
minikube addons enable ingress

# For cloud clusters
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml
```

### 3. Configure Secrets

Edit `k8s/01-secrets/secrets.yaml` with your production values:

```yaml
# Update these values:
- JWT secrets (32+ characters)
- Database passwords
- OAuth credentials
- External service API keys
```

### 4. Build and Push Images

```bash
# Build all images
docker-compose build

# Tag for your registry (replace with your registry)
docker tag sos-app/auth-service:latest YOUR_REGISTRY/sos-app/auth-service:latest
docker tag sos-app/user-service:latest YOUR_REGISTRY/sos-app/user-service:latest
# ... repeat for all services

# Push to registry
docker push YOUR_REGISTRY/sos-app/auth-service:latest
docker push YOUR_REGISTRY/sos-app/user-service:latest
# ... repeat for all services
```

Update image references in `k8s/04-backend/*.yaml`:

```yaml
# Change from:
image: sos-app/auth-service:latest

# To:
image: YOUR_REGISTRY/sos-app/auth-service:latest
```

### 5. Deploy to Kubernetes

```bash
# Make deployment script executable
chmod +x k8s-deploy.sh

# Run deployment
./k8s-deploy.sh
```

This will deploy:
1. Namespace (`sos-app`)
2. Secrets and ConfigMaps
3. Databases (6 StatefulSets)
4. Backend Services (7 Deployments)
5. Ingress

### 6. Configure DNS

Add to `/etc/hosts`:

```
# For Minikube
<minikube-ip> sos-app.local

# For cloud (use LoadBalancer IP)
<load-balancer-ip> sos-app.local
```

Get LoadBalancer IP:

```bash
kubectl get ingress -n sos-app
```

### 7. Verify Deployment

```bash
# Check all resources
kubectl get all -n sos-app

# Check pod status
kubectl get pods -n sos-app

# Check ingress
kubectl get ingress -n sos-app

# Test health endpoint
curl http://sos-app.local/health
```

---

## Deployment Verification

### Health Checks

```bash
# Docker Compose
curl http://localhost:3000/health

# Kubernetes
curl http://sos-app.local/health
```

Expected response:

```json
{
  "status": "healthy",
  "service": "api-gateway",
  "uptime": 123.45,
  "timestamp": "2025-10-31T12:00:00.000Z"
}
```

### Integration Tests

```bash
# Docker Compose
./test-integration.sh

# Kubernetes (port-forward first)
kubectl port-forward svc/api-gateway 3000:3000 -n sos-app
./test-integration.sh
```

### Service Endpoints Test

```bash
# Register user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "deviceId": "test-device-123"
  }'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "deviceId": "test-device-123"
  }'

# Get profile (use token from login response)
curl http://localhost:3000/api/v1/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Troubleshooting

### Docker Compose Issues

#### Containers Not Starting

```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs

# Check specific service
docker-compose logs auth-service

# Restart service
docker-compose restart auth-service
```

#### Database Connection Errors

```bash
# Check database logs
docker-compose logs postgres-auth
docker-compose logs mongodb

# Verify database is healthy
docker-compose exec postgres-auth pg_isready -U postgres
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
```

#### Port Already in Use

```bash
# Find process using port
lsof -i :3000

# Kill process or change port in docker-compose.yml
```

### Kubernetes Issues

#### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n sos-app

# Describe pod for events
kubectl describe pod <pod-name> -n sos-app

# View pod logs
kubectl logs <pod-name> -n sos-app

# View previous crash logs
kubectl logs <pod-name> -n sos-app --previous
```

#### ImagePullBackOff

```bash
# Check image name and tag
kubectl describe pod <pod-name> -n sos-app

# Verify image exists in registry
docker pull YOUR_REGISTRY/sos-app/auth-service:latest

# Create image pull secret if needed
kubectl create secret docker-registry regcred \
  --docker-server=YOUR_REGISTRY \
  --docker-username=YOUR_USERNAME \
  --docker-password=YOUR_PASSWORD \
  -n sos-app
```

#### CrashLoopBackOff

```bash
# View logs
kubectl logs <pod-name> -n sos-app

# Common causes:
# - Missing environment variables
# - Database connection failure
# - Application error

# Check environment variables
kubectl exec <pod-name> -n sos-app -- env
```

#### Service Not Accessible

```bash
# Check service endpoints
kubectl get endpoints -n sos-app

# Check ingress
kubectl describe ingress sos-app-ingress -n sos-app

# Test internal connectivity
kubectl run -it --rm debug \
  --image=curlimages/curl \
  --restart=Never \
  -n sos-app \
  -- curl http://api-gateway:3000/health
```

#### Insufficient Resources

```bash
# Check node resources
kubectl top nodes

# Check pod resources
kubectl top pods -n sos-app

# Describe node for events
kubectl describe node <node-name>
```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `connect ECONNREFUSED` | Service not reachable | Check service is running and network |
| `getaddrinfo ENOTFOUND` | DNS resolution failed | Check service name in environment variables |
| `EADDRINUSE` | Port already in use | Change port or kill conflicting process |
| `ImagePullBackOff` | Cannot pull image | Check image name, tag, and registry credentials |
| `CrashLoopBackOff` | Application crashes | Check logs for application errors |
| `Pending` | Pod cannot be scheduled | Check resources, PVC, and node selectors |

---

## Performance Optimization

### Docker Compose

```yaml
# Add resource limits
services:
  api-gateway:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

### Kubernetes

```bash
# Scale deployments
kubectl scale deployment api-gateway -n sos-app --replicas=5

# Enable autoscaling
kubectl autoscale deployment api-gateway \
  --cpu-percent=70 \
  --min=3 \
  --max=10 \
  -n sos-app
```

---

## Cleanup

### Docker Compose

```bash
# Stop services
./stop-services.sh

# Remove all
docker-compose down -v
```

### Kubernetes

```bash
# Run cleanup script
chmod +x k8s-undeploy.sh
./k8s-undeploy.sh

# Or manually
kubectl delete namespace sos-app
```

---

## Next Steps

1. **Configure External Services**: Set up SendGrid, Twilio, FCM in secrets
2. **Enable SSL/TLS**: Add TLS certificates to Ingress
3. **Setup Monitoring**: Deploy Prometheus and Grafana
4. **Configure Backups**: Set up database backup schedules
5. **CI/CD Pipeline**: Automate builds and deployments
6. **Load Testing**: Test application under load

---

## Support

For issues or questions:
- Check logs first
- Review this troubleshooting guide
- Consult service-specific READMEs in `services/` directories
- Open an issue in the project repository
