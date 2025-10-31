# SOS App - Google Cloud Platform Deployment Guide

## Overview

This guide will help you deploy the SOS App Phase 1 infrastructure to Google Kubernetes Engine (GKE) on Google Cloud Platform.

## Prerequisites

### On Your Local Machine (WSL2)

1. **Google Cloud SDK (gcloud)**
   ```bash
   # Install gcloud CLI
   curl https://sdk.cloud.google.com | bash
   exec -l $SHELL
   gcloud init
   ```

2. **kubectl** (Already installed ✓)

3. **Authenticate with GCP**
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

## Step 1: Create GCP Resources

### 1.1 Set Up Project Variables

```bash
export PROJECT_ID="your-gcp-project-id"
export REGION="us-central1"
export ZONE="us-central1-a"
export CLUSTER_NAME="sos-app-cluster"

gcloud config set project $PROJECT_ID
gcloud config set compute/region $REGION
gcloud config set compute/zone $ZONE
```

### 1.2 Enable Required APIs

```bash
gcloud services enable container.googleapis.com
gcloud services enable compute.googleapis.com
gcloud services enable storage-api.googleapis.com
gcloud services enable servicenetworking.googleapis.com
```

### 1.3 Create GKE Cluster

**Option A: Standard Cluster (Recommended for Production)**

```bash
gcloud container clusters create $CLUSTER_NAME \
  --region $REGION \
  --num-nodes 3 \
  --machine-type n2-standard-4 \
  --disk-size 100 \
  --disk-type pd-ssd \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 10 \
  --enable-autorepair \
  --enable-autoupgrade \
  --enable-ip-alias \
  --network "default" \
  --subnetwork "default" \
  --enable-stackdriver-kubernetes \
  --addons HorizontalPodAutoscaling,HttpLoadBalancing,GcePersistentDiskCsiDriver \
  --workload-pool=$PROJECT_ID.svc.id.goog
```

**Option B: Autopilot Cluster (Managed, Cost-Effective)**

```bash
gcloud container clusters create-auto $CLUSTER_NAME \
  --region $REGION \
  --release-channel regular
```

**Resource Allocation:**
- **Nodes**: 3 nodes (n2-standard-4)
  - 4 vCPUs per node (12 total)
  - 16GB RAM per node (48GB total)
  - 100GB SSD per node
- **Estimated Cost**: ~$300-500/month

### 1.4 Connect to Cluster

```bash
gcloud container clusters get-credentials $CLUSTER_NAME --region $REGION

# Verify connection
kubectl cluster-info
kubectl get nodes
```

## Step 2: Transfer Files to GCP

### Method 1: Using Google Cloud Storage (Recommended)

```bash
# Create a bucket
gsutil mb -l $REGION gs://$PROJECT_ID-sos-app-config/

# Upload project files
cd /mnt/c/Users/dinesh.rj/Downloads
tar -czf sos-app.tar.gz sos-app/
gsutil cp sos-app.tar.gz gs://$PROJECT_ID-sos-app-config/

# On GCP VM or Cloud Shell:
gsutil cp gs://$PROJECT_ID-sos-app-config/sos-app.tar.gz .
tar -xzf sos-app.tar.gz
cd sos-app
```

### Method 2: Using Git (If you have a repository)

```bash
# On GCP VM or Cloud Shell:
git clone <your-repository-url>
cd sos-app
```

### Method 3: Direct SCP to GCP VM (If using Compute Engine)

```bash
# Create a VM for management (optional)
gcloud compute instances create sos-app-admin \
  --zone=$ZONE \
  --machine-type=e2-medium \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud

# Transfer files
gcloud compute scp --recurse sos-app/ sos-app-admin:~ --zone=$ZONE
```

## Step 3: Prepare Secrets

### 3.1 Create Production Secrets

```bash
# Generate strong passwords
export POSTGRES_PASSWORD=$(openssl rand -base64 32)
export MONGODB_PASSWORD=$(openssl rand -base64 32)
export REDIS_PASSWORD=$(openssl rand -base64 32)
export JWT_SECRET=$(openssl rand -base64 64)

# Save to file for reference (keep secure!)
cat > secrets.env <<EOF
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
MONGODB_PASSWORD=$MONGODB_PASSWORD
REDIS_PASSWORD=$REDIS_PASSWORD
JWT_SECRET=$JWT_SECRET
EOF

# Or use Google Secret Manager (recommended)
echo -n "$POSTGRES_PASSWORD" | gcloud secrets create postgres-password --data-file=-
echo -n "$MONGODB_PASSWORD" | gcloud secrets create mongodb-password --data-file=-
echo -n "$REDIS_PASSWORD" | gcloud secrets create redis-password --data-file=-
echo -n "$JWT_SECRET" | gcloud secrets create jwt-secret --data-file=-
```

### 3.2 Create Kubernetes Secrets

```bash
kubectl create secret generic postgres-credentials -n sos-app \
  --from-literal=postgres-password=$POSTGRES_PASSWORD \
  --from-literal=replication-password=$(openssl rand -base64 32)

kubectl create secret generic mongodb-credentials -n sos-app \
  --from-literal=root-password=$MONGODB_PASSWORD \
  --from-literal=mongodb-password=$MONGODB_PASSWORD

kubectl create secret generic redis-credentials -n sos-app \
  --from-literal=redis-password=$REDIS_PASSWORD

kubectl create secret generic jwt-credentials -n sos-app \
  --from-literal=jwt-secret=$JWT_SECRET
```

## Step 4: Deploy to GKE

### 4.1 Run Deployment Script

```bash
cd sos-app
./gcp-deploy.sh
```

Or manually:

```bash
# Create namespace
kubectl apply -f infrastructure/kubernetes/base/namespace.yaml

# Create ConfigMaps
kubectl apply -f infrastructure/kubernetes/base/configmap.yaml

# Deploy databases
kubectl apply -f infrastructure/kubernetes/base/postgres-statefulset.yaml
kubectl apply -f infrastructure/kubernetes/base/mongodb-statefulset.yaml
kubectl apply -f infrastructure/kubernetes/base/timescale-statefulset.yaml
kubectl apply -f infrastructure/kubernetes/base/redis-deployment.yaml
kubectl apply -f infrastructure/kubernetes/base/redis-pubsub-deployment.yaml

# Wait for databases to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=postgres -n sos-app --timeout=300s

# Deploy message brokers
kubectl apply -f infrastructure/kubernetes/base/zookeeper-statefulset.yaml
sleep 30
kubectl apply -f infrastructure/kubernetes/base/kafka-statefulset.yaml
kubectl apply -f infrastructure/kubernetes/base/schema-registry-deployment.yaml
kubectl apply -f infrastructure/kubernetes/base/mqtt-deployment.yaml

# Initialize Kafka topics
kubectl apply -f infrastructure/kubernetes/base/kafka-topics-job.yaml
```

### 4.2 Verify Deployment

```bash
# Check all pods
kubectl get pods -n sos-app

# Check services
kubectl get svc -n sos-app

# Check persistent volumes
kubectl get pvc -n sos-app

# Run validation
./validate-deployment.sh
```

## Step 5: Configure Persistent Storage

### 5.1 Create Storage Classes (if needed)

```bash
kubectl apply -f - <<EOF
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: kubernetes.io/gce-pd
parameters:
  type: pd-ssd
  replication-type: regional-pd
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
EOF
```

### 5.2 Verify Storage

```bash
kubectl get storageclass
kubectl get pv
kubectl get pvc -n sos-app
```

## Step 6: Set Up Monitoring

### 6.1 Enable GKE Monitoring

```bash
gcloud container clusters update $CLUSTER_NAME \
  --enable-cloud-logging \
  --enable-cloud-monitoring \
  --region $REGION
```

### 6.2 Access Monitoring

- **Cloud Console**: https://console.cloud.google.com/kubernetes
- **Cloud Monitoring**: https://console.cloud.google.com/monitoring
- **Cloud Logging**: https://console.cloud.google.com/logs

## Step 7: Configure Networking

### 7.1 Create Load Balancer (Optional)

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: sos-app-ingress
  namespace: sos-app
spec:
  type: LoadBalancer
  selector:
    app: your-app
  ports:
  - port: 80
    targetPort: 8080
EOF
```

### 7.2 Configure DNS

```bash
# Get external IP
kubectl get svc sos-app-ingress -n sos-app

# Configure Cloud DNS or your domain provider
```

## Step 8: Security Configuration

### 8.1 Configure Network Policies

```bash
# Already included in namespace.yaml
kubectl get networkpolicies -n sos-app
```

### 8.2 Set Up Workload Identity

```bash
# Create service account
gcloud iam service-accounts create sos-app-sa \
  --display-name "SOS App Service Account"

# Bind to Kubernetes service account
kubectl annotate serviceaccount default \
  -n sos-app \
  iam.gke.io/gcp-service-account=sos-app-sa@$PROJECT_ID.iam.gserviceaccount.com

# Grant permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member "serviceAccount:sos-app-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role "roles/cloudsql.client"
```

## Step 9: Backup Configuration

### 9.1 Enable Backup for GKE

```bash
gcloud container clusters update $CLUSTER_NAME \
  --enable-backup-agent \
  --region $REGION
```

### 9.2 Create Backup Plan

```bash
gcloud container backup-restore backup-plans create sos-app-backup \
  --cluster=projects/$PROJECT_ID/locations/$REGION/clusters/$CLUSTER_NAME \
  --location=$REGION \
  --backup-schedule="0 2 * * *" \
  --backup-retain-days=30
```

## Step 10: Cost Optimization

### 10.1 Set Up Budget Alerts

```bash
# Via Cloud Console or:
gcloud billing budgets create \
  --billing-account=YOUR_BILLING_ACCOUNT_ID \
  --display-name="SOS App Monthly Budget" \
  --budget-amount=500
```

### 10.2 Use Preemptible Nodes (for non-critical workloads)

```bash
gcloud container node-pools create preemptible-pool \
  --cluster=$CLUSTER_NAME \
  --region=$REGION \
  --machine-type=n2-standard-4 \
  --preemptible \
  --num-nodes=2
```

## Troubleshooting

### Check Pod Logs

```bash
kubectl logs -n sos-app <pod-name>
kubectl logs -n sos-app <pod-name> -c <container-name>
```

### Describe Resources

```bash
kubectl describe pod <pod-name> -n sos-app
kubectl describe pvc <pvc-name> -n sos-app
```

### Check Events

```bash
kubectl get events -n sos-app --sort-by='.lastTimestamp'
```

### Access Pod Shell

```bash
kubectl exec -it <pod-name> -n sos-app -- /bin/sh
```

## Useful Commands

### Scale Deployments

```bash
kubectl scale deployment <deployment-name> -n sos-app --replicas=3
```

### Update Resources

```bash
kubectl apply -f <manifest-file>
kubectl rollout status deployment/<deployment-name> -n sos-app
```

### Clean Up

```bash
# Delete all resources
kubectl delete namespace sos-app

# Delete cluster
gcloud container clusters delete $CLUSTER_NAME --region $REGION
```

## Estimated Costs

### GKE Standard Cluster (3 nodes, n2-standard-4)

| Resource | Monthly Cost (USD) |
|----------|-------------------|
| GKE Cluster Management | Free (under 1 zone) |
| Compute (3 × n2-standard-4) | ~$350 |
| Persistent Disks (SSD) | ~$50-100 |
| Load Balancer | ~$20 |
| Egress Traffic | Variable |
| **Total** | **~$420-500/month** |

### Cost Optimization Tips

1. Use Autopilot mode for automatic resource optimization
2. Enable cluster autoscaling
3. Use preemptible nodes for non-critical workloads
4. Configure resource requests/limits properly
5. Use committed use discounts (1-year or 3-year)

## Next Steps

After successful deployment:

1. ✅ Verify all pods are running
2. ✅ Test database connections
3. ✅ Verify Kafka topics created
4. ✅ Set up monitoring dashboards
5. ✅ Configure alerting
6. ✅ Set up CI/CD pipeline
7. ✅ Deploy Phase 2: Authentication & User Services

## Support Resources

- **GKE Documentation**: https://cloud.google.com/kubernetes-engine/docs
- **kubectl Cheat Sheet**: https://kubernetes.io/docs/reference/kubectl/cheatsheet/
- **GCP Status Dashboard**: https://status.cloud.google.com/

---

**Ready to deploy? Follow the steps above and your SOS App will be running on Google Cloud!** 🚀
