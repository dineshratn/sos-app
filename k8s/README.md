# Kubernetes Deployment Files

This directory contains Kubernetes manifests for deploying the SOS App.

## Directory Structure

```
k8s/
├── base/                           # Base Kubernetes resources
│   ├── namespace.yaml             # Namespace definition
│   ├── configmap.yaml             # Environment configuration
│   ├── secrets.yaml               # Secrets (CHANGE IN PRODUCTION!)
│   ├── postgres-pvc.yaml          # PostgreSQL persistent volume claim
│   ├── redis-pvc.yaml             # Redis persistent volume claim
│   ├── postgres-deployment.yaml   # PostgreSQL deployment & service
│   ├── redis-deployment.yaml      # Redis deployment & service
│   ├── auth-service-deployment.yaml    # Auth service deployment & service
│   ├── user-service-deployment.yaml    # User service deployment & service
│   ├── medical-service-deployment.yaml # Medical service deployment & service
│   └── kustomization.yaml         # Kustomize configuration
├── overlays/                      # Environment-specific overlays (future)
│   ├── dev/                       # Development environment
│   └── prod/                      # Production environment
└── README.md                      # This file
```

## Quick Deployment

### Using the Deployment Script (Recommended)

```bash
# From the project root
./deploy-minikube.sh
```

This script will:
1. Check if Minikube is running
2. Build Docker images in Minikube's Docker environment
3. Deploy all Kubernetes resources
4. Wait for services to be ready
5. Display access information

### Manual Deployment

```bash
# Apply all resources at once
kubectl apply -k k8s/base/

# Or apply individually
kubectl apply -f k8s/base/namespace.yaml
kubectl apply -f k8s/base/configmap.yaml
kubectl apply -f k8s/base/secrets.yaml
kubectl apply -f k8s/base/postgres-pvc.yaml
kubectl apply -f k8s/base/redis-pvc.yaml
kubectl apply -f k8s/base/postgres-deployment.yaml
kubectl apply -f k8s/base/redis-deployment.yaml
kubectl apply -f k8s/base/auth-service-deployment.yaml
kubectl apply -f k8s/base/user-service-deployment.yaml
kubectl apply -f k8s/base/medical-service-deployment.yaml
```

## Resources Overview

### Namespace
- **Name**: `sos-app`
- All resources are deployed in this namespace

### ConfigMap
- **Name**: `sos-app-config`
- Contains non-sensitive configuration (service URLs, database names, ports)

### Secrets
- **Name**: `sos-app-secrets`
- Contains sensitive data (passwords, JWT secrets, encryption keys)
- **⚠️ IMPORTANT**: Change all secrets in production!

### Persistent Volumes
- **postgres-pvc**: 5Gi for PostgreSQL data
- **redis-pvc**: 1Gi for Redis data
- **StorageClass**: `standard` (Minikube default)

### Databases

#### PostgreSQL
- **Image**: `postgres:15-alpine`
- **Port**: 5432 (ClusterIP)
- **Replicas**: 1
- **Databases**: `sos_auth`, `sos_user`, `sos_medical`
- **Extensions**: `uuid-ossp`, `pgcrypto`
- **Init Script**: Automatically creates databases and extensions

#### Redis
- **Image**: `redis:7-alpine`
- **Port**: 6379 (ClusterIP)
- **Replicas**: 1
- **Persistence**: AOF enabled

### Microservices

All services use:
- **imagePullPolicy**: `Never` (uses local Minikube images)
- **Type**: NodePort (for external access)
- **Init Containers**: Wait for dependencies to be ready
- **Health Checks**: Liveness and readiness probes
- **Resource Limits**: CPU and memory limits defined

#### Auth Service
- **Image**: `sos-app/auth-service:latest`
- **Port**: 3001
- **NodePort**: 30001
- **Dependencies**: PostgreSQL, Redis

#### User Service
- **Image**: `sos-app/user-service:latest`
- **Port**: 3002
- **NodePort**: 30002
- **Dependencies**: PostgreSQL, Auth Service

#### Medical Service
- **Image**: `sos-app/medical-service:latest`
- **Port**: 3003
- **NodePort**: 30003
- **Dependencies**: PostgreSQL, Auth Service

## Accessing Services

### Get Minikube IP

```bash
minikube ip
# Example: 192.168.49.2
```

### Service URLs

Replace `<MINIKUBE_IP>` with your Minikube IP:

- Auth Service: `http://<MINIKUBE_IP>:30001`
- User Service: `http://<MINIKUBE_IP>:30002`
- Medical Service: `http://<MINIKUBE_IP>:30003`

### Health Checks

```bash
MINIKUBE_IP=$(minikube ip)
curl http://${MINIKUBE_IP}:30001/health
curl http://${MINIKUBE_IP}:30002/health
curl http://${MINIKUBE_IP}:30003/health
```

## Monitoring

### View All Resources

```bash
kubectl get all -n sos-app
```

### View Logs

```bash
# Auth Service
kubectl logs -f -l app=auth-service -n sos-app

# User Service
kubectl logs -f -l app=user-service -n sos-app

# Medical Service
kubectl logs -f -l app=medical-service -n sos-app

# PostgreSQL
kubectl logs -f -l app=postgres -n sos-app

# Redis
kubectl logs -f -l app=redis -n sos-app
```

### View Events

```bash
kubectl get events -n sos-app --sort-by='.lastTimestamp'
```

### Resource Usage

```bash
kubectl top nodes
kubectl top pods -n sos-app
```

## Cleanup

### Delete All Resources

```bash
# Delete entire namespace (removes everything)
kubectl delete namespace sos-app

# Or delete using kustomize
kubectl delete -k k8s/base/
```

### Stop Minikube

```bash
# Stop Minikube (preserves cluster)
minikube stop

# Delete Minikube cluster completely
minikube delete
```

## Troubleshooting

### Pods Not Starting

Check pod status and logs:
```bash
kubectl get pods -n sos-app
kubectl describe pod <pod-name> -n sos-app
kubectl logs <pod-name> -n sos-app
```

### Image Not Found

Make sure you're using Minikube's Docker daemon:
```bash
eval $(minikube docker-env)
docker images | grep sos-app
```

If images are missing, rebuild them:
```bash
docker build -t sos-app/auth-service:latest ./services/auth-service
docker build -t sos-app/user-service:latest ./services/user-service
docker build -t sos-app/medical-service:latest ./services/medical-service
```

### Database Connection Issues

Check if databases are ready:
```bash
kubectl get pods -n sos-app | grep postgres
kubectl get pods -n sos-app | grep redis
```

Wait for them to be Running:
```bash
kubectl wait --for=condition=ready pod -l app=postgres -n sos-app --timeout=120s
kubectl wait --for=condition=ready pod -l app=redis -n sos-app --timeout=120s
```

### Service Not Accessible

Verify NodePort services:
```bash
kubectl get svc -n sos-app
```

Check Minikube IP:
```bash
minikube ip
```

Try port forwarding as alternative:
```bash
kubectl port-forward svc/auth-service 3001:3001 -n sos-app
# Then access http://localhost:3001
```

## Production Considerations

When deploying to production Kubernetes:

1. **Change all secrets** in `secrets.yaml`
2. **Use proper storage classes** instead of `standard`
3. **Implement Ingress** for better routing
4. **Add TLS certificates** for HTTPS
5. **Increase replicas** for high availability
6. **Configure HPA** (Horizontal Pod Autoscaler)
7. **Set resource limits** appropriately
8. **Use managed databases** (RDS, Cloud SQL, etc.)
9. **Implement proper monitoring** (Prometheus, Grafana)
10. **Use proper secrets management** (Vault, Sealed Secrets)
11. **Change imagePullPolicy** to `IfNotPresent` or `Always`
12. **Use image tags** instead of `latest`

## Using Kustomize

To customize for different environments:

```bash
# Apply with Kustomize
kubectl apply -k k8s/base/

# View generated YAML
kubectl kustomize k8s/base/

# Create overlays for different environments
# Then apply: kubectl apply -k k8s/overlays/prod/
```

## Further Reading

- [Minikube Guide](../MINIKUBE_GUIDE.md) - Complete WSL2 + Minikube setup
- [Kubernetes Documentation](https://kubernetes.io/docs/home/)
- [Kustomize Documentation](https://kustomize.io/)
