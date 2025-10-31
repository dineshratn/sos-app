# SOS App - Google Cloud Quick Start Guide

## 🚀 3-Step Deployment to Google Cloud

### Step 1: Transfer Files (5 minutes)

```bash
cd /mnt/c/Users/dinesh.rj/Downloads/sos-app
./transfer-to-gcp.sh your-project-id
```

This will:
- Create a tar.gz archive
- Upload to Google Cloud Storage
- Give you download instructions

### Step 2: Set Up GKE Cluster (10 minutes)

```bash
# In Google Cloud Shell or GCE instance
export PROJECT_ID="your-project-id"
export REGION="us-central1"
export CLUSTER_NAME="sos-app-cluster"

# Create GKE cluster
gcloud container clusters create $CLUSTER_NAME \
  --region $REGION \
  --num-nodes 3 \
  --machine-type n2-standard-4 \
  --disk-size 100 \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 10

# Connect to cluster
gcloud container clusters get-credentials $CLUSTER_NAME --region $REGION
```

### Step 3: Deploy & Verify (10-15 minutes)

```bash
# Download project files
gsutil cp gs://$PROJECT_ID-sos-app-deployment/sos-app.tar.gz .
tar -xzf sos-app.tar.gz
cd sos-app

# Deploy Phase 1
./gcp-deploy.sh deploy

# Verify
./validate-deployment.sh
```

**Total Time: 25-30 minutes** ✅

---

## What Gets Deployed

### Infrastructure

| Component | Replicas | Resources | Storage |
|-----------|----------|-----------|---------|
| PostgreSQL | 3 | 2 vCPU, 4GB RAM | 100GB SSD |
| MongoDB | 3 | 2 vCPU, 4GB RAM | 50GB SSD |
| TimescaleDB | 3 | 2 vCPU, 4GB RAM | 100GB SSD |
| Redis | 3 | 1 vCPU, 2GB RAM | 10GB SSD |
| Redis Pub/Sub | 2 | 1 vCPU, 2GB RAM | - |
| Zookeeper | 3 | 1 vCPU, 2GB RAM | 20GB SSD |
| Kafka | 3 | 2 vCPU, 4GB RAM | 100GB SSD |
| Schema Registry | 2 | 1 vCPU, 2GB RAM | - |
| MQTT | 2 | 1 vCPU, 2GB RAM | 10GB SSD |

### Kafka Topics (24)

- Emergency: created, updated, cancelled, resolved
- Location: updated, shared
- Contact: acknowledged, notified
- Notification: sent, failed, delivered
- Communication: sent, received
- Device: connected, disconnected, alert
- User: registered, profile-updated, deleted
- Medical: profile-created, profile-updated
- Analytics: audit-log, analytics-events

---

## Cost Estimate

### GKE Standard Cluster

**Monthly Costs (USD)**:
- GKE Cluster Management: Free (first cluster)
- Compute (3 × n2-standard-4): ~$350
- Persistent Disks (SSD): ~$80
- Load Balancer: ~$20
- Egress Traffic: Variable (~$10-50)

**Total: ~$460-500/month**

### Cost Optimization

- Use **Autopilot mode** for automatic optimization
- Enable **cluster autoscaling** (already configured)
- Use **committed use discounts** (1-year = 37% off, 3-year = 55% off)
- **Estimated with discounts**: ~$290-350/month

---

## Quick Commands Reference

### Cluster Management

```bash
# Create cluster
gcloud container clusters create sos-app-cluster --region us-central1 --num-nodes 3

# Connect to cluster
gcloud container clusters get-credentials sos-app-cluster --region us-central1

# Scale cluster
gcloud container clusters resize sos-app-cluster --num-nodes 5 --region us-central1

# Delete cluster
gcloud container clusters delete sos-app-cluster --region us-central1
```

### Deployment

```bash
# Deploy everything
./gcp-deploy.sh deploy

# Check status
./gcp-deploy.sh status

# Clean up
./gcp-deploy.sh clean
```

### Monitoring

```bash
# View all pods
kubectl get pods -n sos-app

# View logs
kubectl logs -n sos-app <pod-name> -f

# Check events
kubectl get events -n sos-app --sort-by='.lastTimestamp'

# Resource usage
kubectl top pods -n sos-app
kubectl top nodes
```

### Database Access

```bash
# PostgreSQL
kubectl exec -it postgres-0 -n sos-app -- psql -U postgres -d sos_app_auth

# MongoDB
kubectl exec -it mongodb-0 -n sos-app -- mongosh

# Redis
kubectl exec -it deployment/redis-master -n sos-app -- redis-cli
```

### Kafka Operations

```bash
# List topics
kubectl exec -it kafka-0 -n sos-app -- kafka-topics --bootstrap-server localhost:9092 --list

# Produce message
kubectl exec -it kafka-0 -n sos-app -- kafka-console-producer --bootstrap-server localhost:9092 --topic emergency-created

# Consume messages
kubectl exec -it kafka-0 -n sos-app -- kafka-console-consumer --bootstrap-server localhost:9092 --topic emergency-created --from-beginning
```

---

## Troubleshooting

### Pods not starting?

```bash
# Describe pod
kubectl describe pod <pod-name> -n sos-app

# Check logs
kubectl logs <pod-name> -n sos-app

# Check events
kubectl get events -n sos-app
```

### Storage issues?

```bash
# Check PVCs
kubectl get pvc -n sos-app

# Check PVs
kubectl get pv

# Check storage classes
kubectl get storageclass
```

### Network issues?

```bash
# Check services
kubectl get svc -n sos-app

# Test connectivity
kubectl run test-pod --image=busybox -n sos-app --rm -it -- /bin/sh
# Then: wget -O- http://postgres-service:5432
```

---

## Security Checklist

Before production deployment:

- [ ] Change all default passwords
- [ ] Enable Workload Identity
- [ ] Configure Network Policies (already included)
- [ ] Set up Cloud Armor for DDoS protection
- [ ] Enable Binary Authorization
- [ ] Configure Secret Manager for sensitive data
- [ ] Set up VPC Service Controls
- [ ] Enable audit logging
- [ ] Configure backup and disaster recovery
- [ ] Set up monitoring and alerting

---

## Monitoring & Observability

### GCP Console

- **Kubernetes Clusters**: https://console.cloud.google.com/kubernetes
- **Cloud Monitoring**: https://console.cloud.google.com/monitoring
- **Cloud Logging**: https://console.cloud.google.com/logs
- **Cloud Trace**: https://console.cloud.google.com/traces

### kubectl Dashboard

```bash
# Port forward to a service
kubectl port-forward -n sos-app svc/postgres-service 5432:5432

# View in browser
kubectl proxy
# Then open: http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/
```

---

## Backup Strategy

### Automated Backups

```bash
# Enable GKE backup
gcloud container clusters update sos-app-cluster \
  --enable-backup-agent \
  --region us-central1

# Create backup plan
gcloud container backup-restore backup-plans create sos-app-backup \
  --cluster=projects/$PROJECT_ID/locations/us-central1/clusters/sos-app-cluster \
  --location=us-central1 \
  --backup-schedule="0 2 * * *" \
  --backup-retain-days=30
```

### Manual Backup

```bash
# Backup namespace
kubectl get all -n sos-app -o yaml > sos-app-backup.yaml

# Backup PVCs
kubectl get pvc -n sos-app -o yaml > sos-app-pvc-backup.yaml

# Database backups (inside pods)
kubectl exec postgres-0 -n sos-app -- pg_dumpall -U postgres > postgres-backup.sql
```

---

## CI/CD Integration

### Cloud Build (Example)

```yaml
# cloudbuild.yaml
steps:
  # Build
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/sos-app:$COMMIT_SHA', '.']

  # Push
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/sos-app:$COMMIT_SHA']

  # Deploy
  - name: 'gcr.io/cloud-builders/kubectl'
    args:
      - 'set'
      - 'image'
      - 'deployment/your-app'
      - 'your-app=gcr.io/$PROJECT_ID/sos-app:$COMMIT_SHA'
    env:
      - 'CLOUDSDK_COMPUTE_REGION=us-central1'
      - 'CLOUDSDK_CONTAINER_CLUSTER=sos-app-cluster'
```

---

## Next Steps

After successful Phase 1 deployment:

1. ✅ Verify all services are running
2. ✅ Test database connections
3. ✅ Verify Kafka topics
4. ✅ Set up monitoring dashboards
5. ✅ Configure alerting rules
6. → **Deploy Phase 2: Authentication & User Services**
7. → Set up CI/CD pipeline
8. → Configure production secrets
9. → Enable backup and disaster recovery
10. → Performance testing and optimization

---

## Support & Documentation

- **GKE Docs**: https://cloud.google.com/kubernetes-engine/docs
- **kubectl Reference**: https://kubernetes.io/docs/reference/kubectl/
- **GCP Status**: https://status.cloud.google.com/
- **Support**: https://cloud.google.com/support

---

## Files Included

```
sos-app/
├── GCP-QUICK-START.md          ← This file
├── GCP-DEPLOYMENT-GUIDE.md     ← Comprehensive guide
├── TRANSFER-TO-GCP.md          ← Transfer instructions
├── gcp-deploy.sh               ← Deployment automation
├── transfer-to-gcp.sh          ← Transfer automation
├── validate-deployment.sh      ← Validation tests
├── infrastructure/
│   └── kubernetes/base/        ← 20+ K8s manifests
└── ... (other project files)
```

---

**Ready to deploy? Start with Step 1! 🚀**

```bash
./transfer-to-gcp.sh your-project-id
```
