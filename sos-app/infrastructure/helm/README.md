# SOS App - Helm Charts

Comprehensive Helm charts for deploying SOS App microservices to Kubernetes.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Chart Structure](#chart-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [Upgrade](#upgrade)
- [Uninstall](#uninstall)
- [Individual Services](#individual-services)
- [Production Deployment](#production-deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Overview

This directory contains Helm charts for all SOS App microservices:

- **auth-service** - Authentication and authorization (Port 3001)
- **user-service** - User profiles and emergency contacts (Port 3002)
- **medical-service** - HIPAA-compliant medical records (Port 3003)
- **emergency-service** - Emergency alert management (Port 8080)
- **location-service** - Real-time location tracking (Port 8081)
- **notification-service** - Multi-channel notifications (Port 3005)
- **communication-service** - Real-time chat and messaging (Port 3004)
- **device-service** - IoT device integration (Port 8082)
- **api-gateway** - API Gateway and routing (Port 3000)
- **llm-service** - LLM-based assistance (Port 8083)

## Prerequisites

### Required Tools

1. **Kubernetes Cluster** >= 1.24
   - EKS, GKE, AKS, or Minikube
   - Minimum 8GB RAM, 4 CPU cores

2. **Helm** >= 3.12
   ```bash
   curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
   helm version
   ```

3. **kubectl** configured for your cluster
   ```bash
   kubectl cluster-info
   kubectl get nodes
   ```

### Optional Tools

- **k9s** - Kubernetes CLI UI
- **kubectx/kubens** - Context and namespace switching
- **stern** - Multi-pod log tailing

## Quick Start

### 1. Deploy All Services (Umbrella Chart)

```bash
# Navigate to helm directory
cd infrastructure/helm

# Update dependencies
cd sos-app
helm dependency update

# Install all services
helm install sos-app . \
  --namespace sos-app \
  --create-namespace \
  --values values.yaml

# Wait for all pods to be ready
kubectl wait --for=condition=ready pod \
  --all \
  --namespace sos-app \
  --timeout=300s

# Check status
helm list -n sos-app
kubectl get all -n sos-app
```

### 2. Deploy Individual Service

```bash
# Install single service
helm install auth-service ./auth-service \
  --namespace sos-app \
  --create-namespace

# Check deployment
kubectl get pods -n sos-app -l app=auth-service
```

### 3. Test Deployment

```bash
# Port forward to test
kubectl port-forward svc/auth-service 3001:3001 -n sos-app

# Test health endpoint
curl http://localhost:3001/health
```

## Chart Structure

```
helm/
├── sos-app/                    # Umbrella chart (deploys all)
│   ├── Chart.yaml              # Chart metadata with dependencies
│   ├── values.yaml             # Default values for all services
│   └── templates/              # Optional global resources
│
├── auth-service/               # Individual service chart
│   ├── Chart.yaml              # Service metadata
│   ├── values.yaml             # Service-specific values
│   └── templates/              # Kubernetes manifests
│       ├── _helpers.tpl        # Template helpers
│       ├── deployment.yaml     # Deployment resource
│       ├── service.yaml        # Service resource
│       ├── ingress.yaml        # Ingress rules
│       ├── hpa.yaml            # Horizontal Pod Autoscaler
│       ├── pdb.yaml            # Pod Disruption Budget
│       ├── serviceaccount.yaml # Service Account
│       ├── networkpolicy.yaml  # Network policies
│       └── servicemonitor.yaml # Prometheus monitoring
│
├── user-service/               # Similar structure
├── medical-service/
├── emergency-service/
├── location-service/
├── notification-service/
├── communication-service/
├── device-service/
├── api-gateway/
├── llm-service/
│
├── create-service-chart.sh     # Script to generate new charts
└── README.md                   # This file
```

## Installation

### Install All Services (Recommended)

```bash
# Production installation with custom values
helm install sos-app ./sos-app \
  --namespace sos-app \
  --create-namespace \
  --values ./sos-app/values.yaml \
  --values ./sos-app/values-prod.yaml \
  --timeout 10m \
  --wait

# Dry run to preview
helm install sos-app ./sos-app \
  --namespace sos-app \
  --dry-run \
  --debug > preview.yaml
```

### Install Specific Services Only

```bash
# Deploy only auth, user, and emergency services
helm install sos-app ./sos-app \
  --namespace sos-app \
  --create-namespace \
  --set auth-service.enabled=true \
  --set user-service.enabled=true \
  --set emergency-service.enabled=true \
  --set medical-service.enabled=false \
  --set location-service.enabled=false \
  --set notification-service.enabled=false \
  --set communication-service.enabled=false \
  --set device-service.enabled=false \
  --set api-gateway.enabled=false \
  --set llm-service.enabled=false
```

### Install Individual Service

```bash
helm install auth-service ./auth-service \
  --namespace sos-app \
  --create-namespace \
  --set image.tag=v1.2.3 \
  --set replicaCount=5
```

## Configuration

### Common Configuration Options

Each service chart supports these configuration options:

```yaml
# Deployment
replicaCount: 3                     # Number of pod replicas

# Image
image:
  repository: "your-registry/service"
  tag: "latest"
  pullPolicy: IfNotPresent

# Resources
resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 250m
    memory: 512Mi

# Autoscaling
autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

# Ingress
ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  hosts:
    - host: api.sos-app.com
      paths:
        - path: /api/v1/auth
          pathType: Prefix
  tls:
    - secretName: sos-app-tls
      hosts:
        - api.sos-app.com

# Health Checks
livenessProbe:
  httpGet:
    path: /health
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 5

# Environment Variables
env:
  - name: NODE_ENV
    value: "production"
  - name: LOG_LEVEL
    value: "info"

envFrom:
  - secretRef:
      name: auth-service-secrets
  - configMapRef:
      name: auth-service-config

# Pod Disruption Budget
podDisruptionBudget:
  enabled: true
  minAvailable: 2

# Network Policy
networkPolicy:
  enabled: true

# Service Monitor (Prometheus)
serviceMonitor:
  enabled: true
  interval: 30s
```

### Environment-Specific Values

Create separate values files for different environments:

**values-dev.yaml:**
```yaml
global:
  environment: dev

auth-service:
  replicaCount: 1
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
  autoscaling:
    enabled: false
```

**values-staging.yaml:**
```yaml
global:
  environment: staging

auth-service:
  replicaCount: 2
  autoscaling:
    minReplicas: 2
    maxReplicas: 5
```

**values-prod.yaml:**
```yaml
global:
  environment: production

auth-service:
  replicaCount: 5
  resources:
    limits:
      cpu: 2000m
      memory: 2Gi
    requests:
      cpu: 500m
      memory: 1Gi
  autoscaling:
    minReplicas: 5
    maxReplicas: 20
```

## Upgrade

### Upgrade All Services

```bash
# Update dependencies first
cd sos-app
helm dependency update

# Upgrade release
helm upgrade sos-app . \
  --namespace sos-app \
  --values values.yaml \
  --values values-prod.yaml \
  --timeout 10m \
  --wait

# Check rollout status
kubectl rollout status deployment/auth-service -n sos-app
```

### Upgrade Single Service

```bash
# Upgrade individual service
helm upgrade auth-service ./auth-service \
  --namespace sos-app \
  --set image.tag=v1.2.4 \
  --reuse-values

# Rollback if needed
helm rollback auth-service 1 -n sos-app
```

### Rolling Update Strategies

```bash
# Update image tag for all services
helm upgrade sos-app ./sos-app \
  --namespace sos-app \
  --set auth-service.image.tag=v1.2.3 \
  --set user-service.image.tag=v1.2.3 \
  --reuse-values

# Update specific configuration
helm upgrade sos-app ./sos-app \
  --namespace sos-app \
  --set auth-service.replicaCount=5 \
  --reuse-values
```

## Uninstall

### Uninstall All Services

```bash
# Delete release (keeps namespace)
helm uninstall sos-app --namespace sos-app

# Delete namespace and all resources
kubectl delete namespace sos-app

# Clean up PVCs
kubectl delete pvc --all -n sos-app
```

### Uninstall Single Service

```bash
helm uninstall auth-service --namespace sos-app
```

## Individual Services

### Auth Service

```bash
# Install
helm install auth-service ./auth-service \
  --namespace sos-app \
  --create-namespace \
  --set env[0].name=JWT_SECRET \
  --set env[0].value=your-secret-key

# Test
kubectl port-forward svc/auth-service 3001:3001 -n sos-app
curl http://localhost:3001/api/v1/auth/health
```

### User Service

```bash
# Install with custom database
helm install user-service ./user-service \
  --namespace sos-app \
  --set env[0].name=DATABASE_URL \
  --set env[0].value=postgresql://user:pass@host:5432/db
```

### Emergency Service

```bash
# Install with increased resources
helm install emergency-service ./emergency-service \
  --namespace sos-app \
  --set resources.limits.cpu=2000m \
  --set resources.limits.memory=2Gi
```

## Production Deployment

### Pre-deployment Checklist

- [ ] Container images built and pushed to registry
- [ ] Secrets created in Kubernetes
- [ ] ConfigMaps prepared
- [ ] SSL certificates configured
- [ ] Ingress controller installed
- [ ] Monitoring stack ready (Prometheus/Grafana)
- [ ] Database migrations completed
- [ ] Resource quotas defined
- [ ] Network policies reviewed

### Production Installation

```bash
# 1. Create namespace with labels
kubectl create namespace sos-app
kubectl label namespace sos-app environment=production

# 2. Create secrets
kubectl create secret generic auth-service-secrets \
  --from-literal=JWT_SECRET=your-jwt-secret \
  --from-literal=DATABASE_URL=postgresql://... \
  --namespace sos-app

# 3. Install Helm release
helm install sos-app ./sos-app \
  --namespace sos-app \
  --values values.yaml \
  --values values-prod.yaml \
  --timeout 15m \
  --wait \
  --atomic

# 4. Verify deployment
helm test sos-app --namespace sos-app
kubectl get all -n sos-app
```

### Production Best Practices

1. **Use specific image tags** (not `latest`)
2. **Enable Pod Disruption Budgets** for high availability
3. **Configure resource limits** to prevent resource exhaustion
4. **Enable network policies** for security
5. **Set up monitoring** with Prometheus/Grafana
6. **Configure horizontal pod autoscaling**
7. **Use secrets** for sensitive data
8. **Enable TLS** for all services
9. **Implement health checks** properly
10. **Plan for disaster recovery**

## Monitoring

### Prometheus Integration

All services expose metrics at `/metrics`:

```yaml
# ServiceMonitor automatically created
serviceMonitor:
  enabled: true
  interval: 30s
  path: /metrics
```

### Grafana Dashboards

Import dashboards from `../monitoring/grafana-dashboards/`:
- API Performance Dashboard
- Emergency Alert Metrics
- Location Tracking Dashboard

### Health Checks

```bash
# Check all service health
kubectl get pods -n sos-app

# Get pod logs
kubectl logs -f deployment/auth-service -n sos-app

# Stream logs from all pods
stern auth-service -n sos-app
```

## Troubleshooting

### Common Issues

#### 1. Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n sos-app

# Check events
kubectl get events -n sos-app --sort-by='.lastTimestamp'

# Check logs
kubectl logs <pod-name> -n sos-app --previous
```

#### 2. ImagePullBackOff

```bash
# Verify image exists
docker pull 173148986859.dkr.ecr.ap-south-2.amazonaws.com/sos-app/auth-service:latest

# Create image pull secret
kubectl create secret docker-registry ecr-secret \
  --docker-server=173148986859.dkr.ecr.ap-south-2.amazonaws.com \
  --docker-username=AWS \
  --docker-password=$(aws ecr get-login-password --region ap-south-2) \
  --namespace sos-app

# Update values.yaml
imagePullSecrets:
  - name: ecr-secret
```

#### 3. CrashLoopBackOff

```bash
# Check logs
kubectl logs <pod-name> -n sos-app

# Common causes:
# - Missing environment variables
# - Database connection failure
# - Port already in use
# - Application code error
```

#### 4. Helm Install Fails

```bash
# Debug mode
helm install sos-app ./sos-app \
  --namespace sos-app \
  --debug \
  --dry-run

# Check Helm status
helm status sos-app -n sos-app

# Get release history
helm history sos-app -n sos-app
```

#### 5. Service Not Accessible

```bash
# Check service
kubectl get svc -n sos-app
kubectl describe svc auth-service -n sos-app

# Check endpoints
kubectl get endpoints -n sos-app

# Test internal connectivity
kubectl run -it --rm debug \
  --image=curlimages/curl \
  --restart=Never \
  -- curl http://auth-service.sos-app.svc.cluster.local:3001/health
```

### Debug Commands

```bash
# Get all resources
kubectl get all -n sos-app

# Describe deployment
kubectl describe deployment auth-service -n sos-app

# Get pod YAML
kubectl get pod <pod-name> -n sos-app -o yaml

# Execute command in pod
kubectl exec -it <pod-name> -n sos-app -- /bin/sh

# Port forward for testing
kubectl port-forward deployment/auth-service 3001:3001 -n sos-app

# Check resource usage
kubectl top pods -n sos-app
kubectl top nodes
```

## Chart Development

### Create New Service Chart

```bash
# Use the helper script
./create-service-chart.sh new-service 8000

# Or manually
helm create new-service
```

### Test Charts Locally

```bash
# Lint chart
helm lint ./auth-service

# Template chart (dry-run)
helm template auth-service ./auth-service \
  --namespace sos-app \
  --values ./auth-service/values.yaml

# Install to test cluster
helm install test-auth ./auth-service \
  --namespace test \
  --create-namespace \
  --dry-run
```

### Package Charts

```bash
# Package individual chart
helm package ./auth-service

# Package all charts
for chart in */Chart.yaml; do
  helm package $(dirname $chart)
done

# Create chart repository index
helm repo index .
```

## Advanced Usage

### Using Helm Secrets

```bash
# Install helm-secrets plugin
helm plugin install https://github.com/jkroepke/helm-secrets

# Encrypt values file
helm secrets encrypt values-secrets.yaml

# Install with encrypted values
helm secrets install sos-app ./sos-app \
  --namespace sos-app \
  -f values.yaml \
  -f secrets://values-secrets.yaml.enc
```

### Blue-Green Deployment

```bash
# Deploy green version
helm install sos-app-green ./sos-app \
  --namespace sos-app-green \
  --create-namespace \
  --set image.tag=v2.0.0

# Switch traffic
kubectl patch ingress sos-app-ingress \
  -n sos-app \
  --type=json \
  -p='[{"op": "replace", "path": "/spec/rules/0/http/paths/0/backend/service/name", "value": "auth-service-green"}]'

# Cleanup blue
helm uninstall sos-app -n sos-app
```

## Support

For issues or questions:
- Check pod logs: `kubectl logs`
- Review events: `kubectl get events`
- Consult Helm documentation: https://helm.sh/docs
- Open issue in project repository

---

**Generated**: 2025-11-07
**Version**: 1.0.0
**Maintainer**: DevOps Team
