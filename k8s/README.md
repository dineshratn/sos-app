# SOS App - Kubernetes Deployment

This directory contains Kubernetes manifests for deploying the SOS App to a Kubernetes cluster.

## 📁 Directory Structure

```
k8s/
├── 00-namespace/          # Namespace definition
├── 01-secrets/            # Secrets (JWT, database credentials, OAuth)
├── 02-configmaps/         # Configuration maps (service URLs, database hosts)
├── 03-databases/          # Database StatefulSets (PostgreSQL, MongoDB, Redis, Kafka)
├── 04-backend/            # Backend service Deployments
├── 05-ingress/            # Ingress configuration
└── README.md              # This file
```

## 🚀 Quick Start

### Prerequisites

- Kubernetes cluster (v1.24+)
- kubectl installed and configured
- NGINX Ingress Controller installed
- At least 8GB RAM and 4 CPU cores available

### Deploy All Services

```bash
# Make deployment script executable
chmod +x k8s-deploy.sh

# Run deployment
./k8s-deploy.sh
```

### Access the Application

Add the following to your `/etc/hosts` file:

```
127.0.0.1 sos-app.local
```

Then access:
- API Gateway: http://sos-app.local
- Health Check: http://sos-app.local/health

## 📦 Components

### Databases (StatefulSets)

| Component | Replicas | Port | Storage |
|-----------|----------|------|---------|
| PostgreSQL (Auth) | 1 | 5432 | 5Gi |
| PostgreSQL (User) | 1 | 5432 | 5Gi |
| MongoDB | 1 | 27017 | 10Gi |
| Redis | 1 | 6379 | 1Gi |
| Zookeeper | 1 | 2181 | 2Gi |
| Kafka | 1 | 9092 | 10Gi |

### Backend Services (Deployments)

| Service | Replicas | Port | Resources |
|---------|----------|------|-----------|
| API Gateway | 3 | 3000 | 256Mi RAM, 250m CPU |
| Auth Service | 2 | 3001 | 256Mi RAM, 250m CPU |
| User Service | 2 | 3002 | 256Mi RAM, 250m CPU |
| Emergency Service | 2 | 3003 | 256Mi RAM, 250m CPU |
| Location Service | 2 | 3004 | 256Mi RAM, 250m CPU |
| Notification Service | 2 | 3005 | 256Mi RAM, 250m CPU |
| Communication Service | 2 | 3006 | 256Mi RAM, 250m CPU |

## 🔧 Configuration

### Secrets

Edit `k8s/01-secrets/secrets.yaml` to update:
- JWT secrets (production)
- Database passwords
- OAuth credentials (Google, Apple)
- External service API keys (Twilio, SendGrid, FCM)

### ConfigMaps

Edit `k8s/02-configmaps/configmaps.yaml` to update:
- Service URLs
- Database hosts
- Environment variables

### Resource Limits

Adjust resource requests/limits in each service's YAML file under `04-backend/`.

## 📊 Monitoring

### View All Resources

```bash
kubectl get all -n sos-app
```

### View Pods

```bash
kubectl get pods -n sos-app
```

### View Services

```bash
kubectl get svc -n sos-app
```

### View StatefulSets

```bash
kubectl get statefulset -n sos-app
```

### Check Ingress

```bash
kubectl get ingress -n sos-app
```

## 🔍 Debugging

### View Pod Logs

```bash
# Real-time logs
kubectl logs -f <pod-name> -n sos-app

# Last 100 lines
kubectl logs --tail=100 <pod-name> -n sos-app
```

### Describe Pod

```bash
kubectl describe pod <pod-name> -n sos-app
```

### Execute Commands in Pod

```bash
kubectl exec -it <pod-name> -n sos-app -- /bin/sh
```

### Port Forward to Service

```bash
# Forward local port to service
kubectl port-forward svc/api-gateway 3000:3000 -n sos-app
```

### Check Events

```bash
kubectl get events -n sos-app --sort-by='.lastTimestamp'
```

## 🔄 Scaling

### Scale Deployments

```bash
# Scale API Gateway
kubectl scale deployment api-gateway -n sos-app --replicas=5

# Scale all services
kubectl scale deployment --all -n sos-app --replicas=3
```

### Auto-scaling (HPA)

```bash
# Enable horizontal pod autoscaling
kubectl autoscale deployment api-gateway \
  --cpu-percent=50 \
  --min=3 \
  --max=10 \
  -n sos-app
```

## 🔐 Security

### Update Secrets

```bash
# Update JWT secret
kubectl create secret generic jwt-secrets \
  -n sos-app \
  --from-literal=jwt-secret='your-new-secret' \
  --from-literal=jwt-refresh-secret='your-new-refresh-secret' \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart deployments to use new secrets
kubectl rollout restart deployment -n sos-app
```

### Network Policies

Create network policies to restrict traffic between services:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-gateway-policy
  namespace: sos-app
spec:
  podSelector:
    matchLabels:
      app: api-gateway
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: nginx-ingress
```

## 🔄 Updates and Rollouts

### Update Service Image

```bash
# Set new image
kubectl set image deployment/auth-service \
  auth-service=sos-app/auth-service:v2.0 \
  -n sos-app

# Check rollout status
kubectl rollout status deployment/auth-service -n sos-app
```

### Rollback

```bash
# Undo last deployment
kubectl rollout undo deployment/auth-service -n sos-app

# Rollback to specific revision
kubectl rollout undo deployment/auth-service --to-revision=2 -n sos-app
```

### View Rollout History

```bash
kubectl rollout history deployment/auth-service -n sos-app
```

## 🧹 Cleanup

### Delete All Resources

```bash
# Make cleanup script executable
chmod +x k8s-undeploy.sh

# Run cleanup
./k8s-undeploy.sh
```

Or manually:

```bash
kubectl delete namespace sos-app
```

## 🎯 Health Checks

### Liveness Probes
- Check if container is alive
- Restart container if fails
- Path: `/health`

### Readiness Probes
- Check if service is ready to accept traffic
- Remove from service endpoints if fails
- Path: `/health` or `/health/ready`

### Startup Probes
- Check if application has started
- Other probes disabled until succeeds
- Path: `/health`

## 📈 Performance Tuning

### Database Optimization

```yaml
# PostgreSQL
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

### API Gateway Tuning

```yaml
# Increase replicas for high traffic
replicas: 5

# Adjust circuit breaker settings
env:
  - name: CIRCUIT_BREAKER_THRESHOLD
    value: "10"
  - name: CIRCUIT_BREAKER_TIMEOUT
    value: "30000"
```

## 🌍 Multi-Environment Setup

### Development

```bash
kubectl apply -k k8s/overlays/development
```

### Staging

```bash
kubectl apply -k k8s/overlays/staging
```

### Production

```bash
kubectl apply -k k8s/overlays/production
```

## 📝 Troubleshooting

### Pod Stuck in Pending

```bash
# Check events
kubectl describe pod <pod-name> -n sos-app

# Common issues:
# - Insufficient resources
# - PVC not bound
# - Node selector mismatch
```

### Pod CrashLoopBackOff

```bash
# Check logs
kubectl logs <pod-name> -n sos-app --previous

# Common issues:
# - Application error
# - Missing environment variables
# - Database connection failure
```

### Service Not Accessible

```bash
# Check service endpoints
kubectl get endpoints -n sos-app

# Check ingress
kubectl describe ingress sos-app-ingress -n sos-app

# Test from within cluster
kubectl run -it --rm debug \
  --image=curlimages/curl \
  --restart=Never \
  -n sos-app \
  -- curl http://api-gateway:3000/health
```

## 📚 Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [PostgreSQL on Kubernetes](https://www.postgresql.org/docs/)
- [MongoDB on Kubernetes](https://docs.mongodb.com/kubernetes-operator/)
- [Redis on Kubernetes](https://redis.io/topics/kubernetes)

## 🤝 Support

For issues or questions:
1. Check pod logs
2. Review events
3. Consult the troubleshooting section
4. Open an issue in the project repository
