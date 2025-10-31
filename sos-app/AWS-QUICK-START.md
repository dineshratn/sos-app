# SOS App - AWS Quick Start Guide

## 🚀 3-Step Deployment to AWS

### Step 1: Transfer Files (5 minutes)

```bash
cd /mnt/c/Users/dinesh.rj/Downloads/sos-app
./transfer-to-aws.sh sos-app-deployment-ACCOUNT_ID
```

This will:
- Create a tar.gz archive
- Upload to AWS S3
- Give you download instructions

### Step 2: Create EKS Cluster (20 minutes)

```bash
# In AWS CloudShell or EC2 instance
aws s3 cp s3://sos-app-deployment-ACCOUNT_ID/sos-app.tar.gz .
tar -xzf sos-app.tar.gz
cd sos-app

# Create EKS cluster
./aws-create-eks-cluster.sh
```

**This will create:**
- EKS cluster with 3 worker nodes (t3.xlarge)
- Cluster autoscaler
- AWS Load Balancer Controller
- Metrics server
- gp3 storage class

### Step 3: Deploy & Verify (10-15 minutes)

```bash
# Deploy Phase 1
./aws-deploy.sh deploy

# Verify
./validate-deployment.sh
```

**Total Time: 35-40 minutes** ✅

---

## What Gets Deployed

### Infrastructure

| Component | Replicas | Instance Type | Storage |
|-----------|----------|---------------|---------|
| PostgreSQL | 3 | 2 vCPU, 4GB RAM | 100GB gp3 |
| MongoDB | 3 | 2 vCPU, 4GB RAM | 50GB gp3 |
| TimescaleDB | 3 | 2 vCPU, 4GB RAM | 100GB gp3 |
| Redis | 3 | 1 vCPU, 2GB RAM | 10GB gp3 |
| Redis Pub/Sub | 2 | 1 vCPU, 2GB RAM | - |
| Zookeeper | 3 | 1 vCPU, 2GB RAM | 20GB gp3 |
| Kafka | 3 | 2 vCPU, 4GB RAM | 100GB gp3 |
| Schema Registry | 2 | 1 vCPU, 2GB RAM | - |
| MQTT | 2 | 1 vCPU, 2GB RAM | 10GB gp3 |

### Kafka Topics (24)

All production-ready topics pre-configured with:
- 10 partitions (15 for high-frequency topics)
- Replication factor: 3
- Min in-sync replicas: 2
- Retention: 7 days
- Compression: LZ4

---

## Cost Estimate

### AWS EKS Production Setup

**Monthly Costs (USD) - us-east-1**:

| Component | Monthly Cost |
|-----------|--------------|
| EKS Control Plane | $73 |
| EC2 (3 × t3.xlarge) | $365 |
| EBS Volumes (gp3) | $70-90 |
| Application Load Balancer | $25-30 |
| Data Transfer | $10-20 |
| CloudWatch | $10-15 |
| Backup | $15-25 |
| **Total** | **$568-618/month** |

### Cost Optimization Options

| Strategy | Monthly Cost | Annual Savings |
|----------|--------------|----------------|
| **On-Demand (No commitment)** | $570 | - |
| **1-Year Reserved Instances** | $395 | $2,100 (37%) |
| **3-Year Reserved Instances** | $298 | $3,264 (57%) |
| **Spot + On-Demand Mix** | $292 | $3,336 (49%) |

**Recommended**: 1-Year RI = **$395/month** ($4,740/year)

---

## Prerequisites

### Install Required Tools

```bash
# AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# eksctl
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin

# kubectl (if not installed)
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Helm (for Load Balancer Controller)
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### Configure AWS Credentials

```bash
aws configure
# Enter:
#   AWS Access Key ID
#   AWS Secret Access Key
#   Default region (e.g., us-east-1)
#   Default output format (json)
```

---

## Quick Commands Reference

### Cluster Management

```bash
# Create cluster
./aws-create-eks-cluster.sh

# Connect to cluster
aws eks update-kubeconfig --region us-east-1 --name sos-app-cluster

# Scale cluster
eksctl scale nodegroup --cluster sos-app-cluster --name sos-app-workers --nodes 5

# Delete cluster
eksctl delete cluster --name sos-app-cluster --region us-east-1
```

### Deployment

```bash
# Deploy everything
./aws-deploy.sh deploy

# Check status
./aws-deploy.sh status

# Clean up
./aws-deploy.sh clean
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

# Access AWS Console
# CloudWatch: https://console.aws.amazon.com/cloudwatch
# EKS: https://console.aws.amazon.com/eks
```

### Database Access

```bash
# PostgreSQL
kubectl exec -it postgres-0 -n sos-app -- psql -U postgres -d sos_app_auth

# MongoDB
kubectl exec -it mongodb-0 -n sos-app -- mongosh

# Redis
kubectl exec -it deployment/redis-master -n sos-app -- redis-cli

# Port forwarding for local access
kubectl port-forward -n sos-app svc/postgres-service 5432:5432
```

### Kafka Operations

```bash
# List topics
kubectl exec -it kafka-0 -n sos-app -- kafka-topics --bootstrap-server localhost:9092 --list

# Produce message
kubectl exec -it kafka-0 -n sos-app -- kafka-console-producer --bootstrap-server localhost:9092 --topic emergency-created

# Consume messages
kubectl exec -it kafka-0 -n sos-app -- kafka-console-consumer --bootstrap-server localhost:9092 --topic emergency-created --from-beginning

# Describe topic
kubectl exec -it kafka-0 -n sos-app -- kafka-topics --bootstrap-server localhost:9092 --describe --topic emergency-created
```

---

## Troubleshooting

### Pods not starting?

```bash
# Check pod status
kubectl get pods -n sos-app

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

# Check storage class
kubectl get storageclass

# Check EBS CSI driver
kubectl get pods -n kube-system | grep ebs
```

### Network issues?

```bash
# Check services
kubectl get svc -n sos-app

# Check load balancer
kubectl get ingress -n sos-app

# Test connectivity
kubectl run test-pod --image=busybox -n sos-app --rm -it -- /bin/sh
```

### EKS issues?

```bash
# Check cluster status
eksctl get cluster --name sos-app-cluster --region us-east-1

# Check node groups
eksctl get nodegroup --cluster sos-app-cluster --region us-east-1

# View cluster logs
aws eks describe-cluster --name sos-app-cluster --region us-east-1
```

---

## Security Best Practices

### Before Production Deployment:

- [ ] Enable AWS CloudTrail for audit logging
- [ ] Configure AWS KMS for encryption at rest
- [ ] Set up AWS Secrets Manager for sensitive data
- [ ] Enable VPC Flow Logs
- [ ] Configure Security Groups properly
- [ ] Enable Pod Security Policies
- [ ] Set up AWS WAF for DDoS protection
- [ ] Configure AWS GuardDuty for threat detection
- [ ] Enable AWS Config for compliance
- [ ] Set up IAM roles with least privilege
- [ ] Enable MFA for AWS root account
- [ ] Rotate secrets regularly

---

## Monitoring & Observability

### AWS Native Tools

**CloudWatch Container Insights**:
```bash
# Enable Container Insights
aws eks update-cluster-config \
  --name sos-app-cluster \
  --region us-east-1 \
  --logging '{"clusterLogging":[{"types":["api","audit","authenticator","controllerManager","scheduler"],"enabled":true}]}'
```

**Access CloudWatch**:
- Dashboard: https://console.aws.amazon.com/cloudwatch
- Logs: https://console.aws.amazon.com/cloudwatch/logs
- Metrics: https://console.aws.amazon.com/cloudwatch/metrics

### Third-Party Tools

**Prometheus + Grafana**:
```bash
# Install Prometheus
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring --create-namespace

# Access Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
# Open: http://localhost:3000
# Default: admin / prom-operator
```

---

## Backup Strategy

### Automated EKS Backups

```bash
# Enable AWS Backup for EKS
aws backup create-backup-plan --backup-plan file://backup-plan.json

# Create backup vault
aws backup create-backup-vault --backup-vault-name sos-app-backups
```

### Manual Backups

```bash
# Backup all resources
kubectl get all -n sos-app -o yaml > sos-app-backup.yaml

# Backup PVCs
kubectl get pvc -n sos-app -o yaml > sos-app-pvc-backup.yaml

# Database backups
kubectl exec postgres-0 -n sos-app -- pg_dumpall -U postgres > postgres-backup.sql
kubectl exec mongodb-0 -n sos-app -- mongodump --archive > mongodb-backup.archive
```

---

## CI/CD Integration

### AWS CodePipeline Example

```yaml
# buildspec.yml
version: 0.2
phases:
  pre_build:
    commands:
      - echo Logging in to Amazon ECR...
      - aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com
  build:
    commands:
      - docker build -t $IMAGE_REPO_NAME:$IMAGE_TAG .
      - docker tag $IMAGE_REPO_NAME:$IMAGE_TAG $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$IMAGE_REPO_NAME:$IMAGE_TAG
  post_build:
    commands:
      - docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$IMAGE_REPO_NAME:$IMAGE_TAG
      - kubectl set image deployment/your-app your-app=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$IMAGE_REPO_NAME:$IMAGE_TAG
```

---

## Cost Monitoring

### Set Up Budgets

```bash
# Create budget via AWS CLI
aws budgets create-budget \
  --account-id $ACCOUNT_ID \
  --budget file://budget.json \
  --notifications-with-subscribers file://notifications.json
```

### Enable Cost Anomaly Detection

```bash
# Via AWS Console:
# https://console.aws.amazon.com/cost-management/home#/anomaly-detection
```

### Useful Cost Queries

```bash
# Get current month costs
aws ce get-cost-and-usage \
  --time-period Start=$(date -d "$(date +%Y-%m-01)" +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE
```

---

## Next Steps

After successful Phase 1 deployment:

1. ✅ Verify all services are running
2. ✅ Test database connections
3. ✅ Verify Kafka topics
4. ✅ Set up CloudWatch dashboards
5. ✅ Configure alerting rules
6. → **Deploy Phase 2: Authentication & User Services**
7. → Set up CI/CD pipeline
8. → Configure production secrets
9. → Enable comprehensive monitoring
10. → Performance testing and optimization

---

## Useful Links

- **AWS EKS Docs**: https://docs.aws.amazon.com/eks/
- **eksctl Docs**: https://eksctl.io/
- **kubectl Cheatsheet**: https://kubernetes.io/docs/reference/kubectl/cheatsheet/
- **AWS Service Health**: https://health.aws.amazon.com/health/status
- **AWS Calculator**: https://calculator.aws/

---

## Files Included

```
sos-app/
├── AWS-QUICK-START.md          ← This file
├── AWS-COST-COMPARISON.md      ← Detailed cost analysis
├── transfer-to-aws.sh          ← Transfer automation
├── aws-create-eks-cluster.sh   ← EKS cluster creation
├── aws-deploy.sh               ← Deployment automation
├── validate-deployment.sh      ← Validation tests
├── infrastructure/
│   └── kubernetes/base/        ← 20+ K8s manifests
└── ... (other project files)
```

---

**Ready to deploy? Start with Step 1! 🚀**

```bash
./transfer-to-aws.sh
```

**Estimated Time**: 35-40 minutes
**Estimated Cost**: $395-420/month (with 1-Year RI)
