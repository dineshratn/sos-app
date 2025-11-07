# SOS App - AWS Migration Guide

**Version:** 1.0
**Last Updated:** 2025-11-07
**Status:** Production Ready

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Architecture Overview](#architecture-overview)
4. [Pre-Migration Planning](#pre-migration-planning)
5. [Step-by-Step Migration Process](#step-by-step-migration-process)
6. [Post-Migration Validation](#post-migration-validation)
7. [Rollback Procedures](#rollback-procedures)
8. [Cost Optimization](#cost-optimization)
9. [Security Hardening](#security-hardening)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This guide provides a comprehensive, step-by-step process for migrating the SOS App from any environment (local, GCP, or other cloud platforms) to Amazon Web Services (AWS).

### Migration Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
| Planning & Preparation | 1-2 weeks | Infrastructure planning, cost estimation, team training |
| Infrastructure Setup | 1 week | AWS account setup, Terraform deployment |
| Application Migration | 1-2 weeks | Containerization, Helm deployment, testing |
| Data Migration | 3-5 days | Database migration with minimal downtime |
| Monitoring Setup | 2-3 days | Observability stack deployment |
| Testing & Validation | 1 week | End-to-end testing, performance validation |
| Go-Live | 1 day | DNS cutover, traffic migration |
| **Total** | **4-7 weeks** | End-to-end migration |

### Key Benefits of AWS Migration

- **Scalability**: Auto-scaling EKS cluster with managed node groups
- **High Availability**: Multi-AZ deployment across 3 availability zones
- **Managed Services**: RDS, DocumentDB, ElastiCache, MSK reduce operational overhead
- **Security**: VPC isolation, security groups, IAM roles, encryption at rest/transit
- **Cost Efficiency**: Reserved instances, spot instances, auto-scaling
- **Observability**: CloudWatch integration, Prometheus, Grafana, Jaeger, ELK stack

---

## Prerequisites

### 1. AWS Account Setup

#### Create AWS Account
```bash
# Sign up at https://aws.amazon.com
# Enable multi-factor authentication (MFA)
# Set up billing alerts
```

#### Create IAM User for Deployment
```bash
# Create IAM user with programmatic access
aws iam create-user --user-name sos-app-deployer

# Attach required policies
aws iam attach-user-policy \
  --user-name sos-app-deployer \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

# Create access keys
aws iam create-access-key --user-name sos-app-deployer
```

#### Configure AWS CLI
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure credentials
aws configure
# AWS Access Key ID: <YOUR_ACCESS_KEY>
# AWS Secret Access Key: <YOUR_SECRET_KEY>
# Default region: us-east-1
# Default output format: json

# Verify configuration
aws sts get-caller-identity
```

### 2. Required Tools Installation

#### Terraform
```bash
# Install Terraform (Linux/WSL2)
wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
unzip terraform_1.6.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# Verify
terraform version
```

#### kubectl
```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# Verify
kubectl version --client
```

#### Helm
```bash
# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Verify
helm version
```

#### eksctl (Optional but recommended)
```bash
# Install eksctl
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin

# Verify
eksctl version
```

### 3. Docker Setup (for building images)

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Verify
docker --version
```

### 4. Project Preparation

```bash
# Clone repository
git clone https://github.com/your-org/sos-app.git
cd sos-app

# Verify project structure
ls -la
# Should see:
# - sos-app/infrastructure/terraform/
# - sos-app/infrastructure/helm/
# - sos-app/infrastructure/kubernetes/
# - deploy-to-aws.sh
```

---

## Architecture Overview

### AWS Infrastructure Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                           AWS Cloud (Region)                         │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      VPC (10.0.0.0/16)                       │   │
│  │                                                               │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │   │
│  │  │   AZ us-1a   │  │   AZ us-1b   │  │   AZ us-1c   │      │   │
│  │  │              │  │              │  │              │      │   │
│  │  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │      │   │
│  │  │ │ Public   │ │  │ │ Public   │ │  │ │ Public   │ │      │   │
│  │  │ │ Subnet   │ │  │ │ Subnet   │ │  │ │ Subnet   │ │      │   │
│  │  │ └──────────┘ │  │ └──────────┘ │  │ └──────────┘ │      │   │
│  │  │      │       │  │      │       │  │      │       │      │   │
│  │  │   NAT GW    │  │   NAT GW    │  │   NAT GW    │      │   │
│  │  │              │  │              │  │              │      │   │
│  │  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │      │   │
│  │  │ │ Private  │ │  │ │ Private  │ │  │ │ Private  │ │      │   │
│  │  │ │ Subnet   │ │  │ │ Subnet   │ │  │ │ Subnet   │ │      │   │
│  │  │ │ (EKS)    │ │  │ │ (EKS)    │ │  │ │ (EKS)    │ │      │   │
│  │  │ └──────────┘ │  │ └──────────┘ │  │ └──────────┘ │      │   │
│  │  │              │  │              │  │              │      │   │
│  │  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │      │   │
│  │  │ │ Database │ │  │ │ Database │ │  │ │ Database │ │      │   │
│  │  │ │ Subnet   │ │  │ │ Subnet   │ │  │ │ Subnet   │ │      │   │
│  │  │ └──────────┘ │  │ └──────────┘ │  │ └──────────┘ │      │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    EKS Cluster (Kubernetes)                  │   │
│  │                                                               │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐              │   │
│  │  │ Node Group │ │ Node Group │ │ Node Group │              │   │
│  │  │  (t3.xlarge│ │  (t3.xlarge│ │  (t3.xlarge│              │   │
│  │  │   3 nodes) │ │   3 nodes) │ │   3 nodes) │              │   │
│  │  └────────────┘ └────────────┘ └────────────┘              │   │
│  │                                                               │   │
│  │  Workloads: 10 Microservices + Monitoring + Logging         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     Managed Services                         │   │
│  │                                                               │   │
│  │  • RDS PostgreSQL (Multi-AZ)                                │   │
│  │  • DocumentDB (MongoDB-compatible)                          │   │
│  │  • ElastiCache Redis (Multi-AZ)                             │   │
│  │  • MSK (Managed Kafka)                                      │   │
│  │  • ECR (Container Registry)                                 │   │
│  │  • ALB (Application Load Balancer)                          │   │
│  │  • Route 53 (DNS)                                           │   │
│  │  • Secrets Manager                                          │   │
│  │  • CloudWatch (Logs & Metrics)                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Resource Mapping

| Component | AWS Service | High Availability |
|-----------|-------------|-------------------|
| Container Orchestration | EKS (Kubernetes) | Multi-AZ node groups |
| Load Balancer | Application Load Balancer | Multi-AZ |
| PostgreSQL Database | RDS PostgreSQL | Multi-AZ with automatic failover |
| MongoDB Database | DocumentDB | 3-node cluster across AZs |
| Redis Cache | ElastiCache Redis | Multi-AZ with auto-failover |
| Message Queue | MSK (Managed Kafka) | Multi-AZ with replication |
| Container Registry | ECR | Regional replication |
| DNS | Route 53 | Global, anycast network |
| Secrets | Secrets Manager | Encrypted, automatic rotation |

---

## Pre-Migration Planning

### 1. Cost Estimation

Use the AWS Pricing Calculator: https://calculator.aws

#### Estimated Monthly Costs (us-east-1)

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| EKS Control Plane | 1 cluster | $73 |
| EC2 Instances (EKS nodes) | 3x t3.xlarge (4 vCPU, 16GB) | $300-350 |
| RDS PostgreSQL | db.r6g.xlarge, Multi-AZ | $380-420 |
| DocumentDB | 3x db.r6g.large | $520-580 |
| ElastiCache Redis | cache.r6g.large, Multi-AZ | $200-240 |
| MSK | 3x kafka.m5.large | $450-500 |
| ALB | 2 load balancers | $40-50 |
| EBS Storage | 500GB gp3 | $40-50 |
| Data Transfer | 1TB/month | $50-90 |
| CloudWatch | Logs, Metrics | $50-100 |
| **Total (Development)** | | **~$2,100-2,400/month** |
| **Total (Production)** | Larger instances + HA | **~$4,500-6,000/month** |

#### Cost Optimization Tips
- Use Reserved Instances (up to 75% savings)
- Use Spot Instances for non-critical workloads (up to 90% savings)
- Enable auto-scaling to scale down during low usage
- Use S3 Lifecycle policies for log retention
- Monitor with AWS Cost Explorer

### 2. Network Planning

#### IP Address Planning
```
VPC CIDR:              10.0.0.0/16 (65,536 IPs)

Availability Zones (3):
  us-east-1a:
    Public Subnet:     10.0.1.0/24  (256 IPs)
    Private Subnet:    10.0.11.0/24 (256 IPs)
    Database Subnet:   10.0.21.0/24 (256 IPs)

  us-east-1b:
    Public Subnet:     10.0.2.0/24  (256 IPs)
    Private Subnet:    10.0.12.0/24 (256 IPs)
    Database Subnet:   10.0.22.0/24 (256 IPs)

  us-east-1c:
    Public Subnet:     10.0.3.0/24  (256 IPs)
    Private Subnet:    10.0.13.0/24 (256 IPs)
    Database Subnet:   10.0.23.0/24 (256 IPs)
```

### 3. Data Migration Strategy

#### Option A: Dump and Restore (Simpler, Downtime Required)
- Best for: Development/Staging environments
- Downtime: 2-4 hours
- Process:
  1. Stop application
  2. Dump databases
  3. Transfer to AWS
  4. Restore to RDS/DocumentDB
  5. Start application

#### Option B: Continuous Replication (Complex, Minimal Downtime)
- Best for: Production environments
- Downtime: 5-15 minutes
- Process:
  1. Set up replication from source to AWS
  2. Let data sync (hours to days)
  3. Stop writes on source
  4. Final sync
  5. Switch DNS to AWS
  6. Resume operations

---

## Step-by-Step Migration Process

### Phase 1: Infrastructure Setup (Week 1)

#### Step 1.1: Create S3 Bucket for Terraform State

```bash
# Set variables
export AWS_REGION=us-east-1
export TF_STATE_BUCKET=sos-app-terraform-state-${AWS_REGION}
export TF_LOCK_TABLE=sos-app-terraform-locks

# Create S3 bucket for Terraform state
aws s3api create-bucket \
  --bucket $TF_STATE_BUCKET \
  --region $AWS_REGION

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket $TF_STATE_BUCKET \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket $TF_STATE_BUCKET \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name $TF_LOCK_TABLE \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region $AWS_REGION
```

#### Step 1.2: Configure Terraform Variables

```bash
cd sos-app/infrastructure/terraform

# Edit environment-specific variables
nano environments/dev/terraform.tfvars
```

```hcl
# environments/dev/terraform.tfvars

environment         = "dev"
aws_region         = "us-east-1"
project_name       = "sos-app"

# VPC Configuration
vpc_cidr           = "10.0.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

# EKS Configuration
eks_cluster_version = "1.28"
eks_node_instance_type = "t3.xlarge"
eks_node_desired_capacity = 3
eks_node_min_capacity = 3
eks_node_max_capacity = 10

# RDS Configuration
rds_instance_class = "db.r6g.large"
rds_allocated_storage = 100
rds_multi_az = true

# DocumentDB Configuration
documentdb_instance_class = "db.r6g.large"
documentdb_cluster_size = 3

# ElastiCache Configuration
elasticache_node_type = "cache.r6g.large"
elasticache_num_cache_nodes = 2

# MSK Configuration
msk_instance_type = "kafka.m5.large"
msk_number_of_broker_nodes = 3

# Tags
tags = {
  Environment = "dev"
  Project     = "sos-app"
  ManagedBy   = "terraform"
  Owner       = "devops-team"
}
```

#### Step 1.3: Deploy Infrastructure with Terraform

```bash
# Navigate to Terraform directory
cd /path/to/sos-app

# Run deployment script (plan first)
./deploy-to-aws.sh plan

# Review the plan carefully
# Check resource counts and configurations

# Deploy infrastructure
ENVIRONMENT=dev AWS_REGION=us-east-1 ./deploy-to-aws.sh terraform-only

# This will:
# 1. Initialize Terraform
# 2. Plan infrastructure changes
# 3. Apply changes (creates VPC, EKS, RDS, etc.)
# 4. Configure kubectl for EKS access
#
# Duration: 20-30 minutes
```

#### Step 1.4: Verify Infrastructure

```bash
# Verify VPC
aws ec2 describe-vpcs --filters "Name=tag:Project,Values=sos-app"

# Verify EKS cluster
aws eks describe-cluster --name sos-app-dev-eks

# Verify RDS
aws rds describe-db-instances --db-instance-identifier sos-app-dev-postgres

# Verify DocumentDB
aws docdb describe-db-clusters --db-cluster-identifier sos-app-dev-documentdb

# Verify ElastiCache
aws elasticache describe-cache-clusters --cache-cluster-id sos-app-dev-redis

# Verify MSK
aws kafka list-clusters --cluster-name-filter sos-app-dev-msk

# Verify kubectl access
kubectl cluster-info
kubectl get nodes
```

### Phase 2: Container Image Preparation (Week 2)

#### Step 2.1: Build Docker Images

```bash
cd /path/to/sos-app

# Build all service images
./build-images.sh

# This builds images for:
# - auth-service
# - user-service
# - medical-service
# - emergency-service
# - location-service
# - notification-service
# - communication-service
# - device-service
# - api-gateway
# - llm-service
```

#### Step 2.2: Push to Amazon ECR

```bash
# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=us-east-1

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Tag and push images
SERVICES=(
  "auth-service"
  "user-service"
  "medical-service"
  "emergency-service"
  "location-service"
  "notification-service"
  "communication-service"
  "device-service"
  "api-gateway"
  "llm-service"
)

for SERVICE in "${SERVICES[@]}"; do
  echo "Pushing $SERVICE..."

  # Tag image
  docker tag sos-app/${SERVICE}:latest \
    ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/sos-app-dev-${SERVICE}:latest

  # Push image
  docker push \
    ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/sos-app-dev-${SERVICE}:latest
done
```

### Phase 3: Data Migration (Week 3)

#### Step 3.1: Prepare Source Databases

```bash
# PostgreSQL backup
pg_dump -h <source-host> \
  -U postgres \
  -d sos_app \
  --format=custom \
  --no-owner \
  --no-acl \
  -f sos_app_postgres.dump

# MongoDB backup
mongodump \
  --host <source-host> \
  --db sos_app \
  --out mongodb_backup
```

#### Step 3.2: Transfer to AWS

```bash
# Option A: Upload to S3 and restore from there
aws s3 cp sos_app_postgres.dump s3://your-backup-bucket/
aws s3 cp mongodb_backup s3://your-backup-bucket/ --recursive

# Option B: Direct restore (faster for smaller databases)
# Will be shown in next step
```

#### Step 3.3: Restore to RDS PostgreSQL

```bash
# Get RDS endpoint
RDS_ENDPOINT=$(cd sos-app/infrastructure/terraform && \
  terraform output -raw rds_endpoint)

# Get RDS password from Secrets Manager or Terraform output
RDS_PASSWORD=$(cd sos-app/infrastructure/terraform && \
  terraform output -raw rds_password)

# Restore database
pg_restore \
  --host $RDS_ENDPOINT \
  --username postgres \
  --dbname sos_app \
  --no-owner \
  --no-acl \
  --verbose \
  sos_app_postgres.dump

# Verify data
psql -h $RDS_ENDPOINT -U postgres -d sos_app -c "\dt"
psql -h $RDS_ENDPOINT -U postgres -d sos_app -c "SELECT COUNT(*) FROM users;"
```

#### Step 3.4: Restore to DocumentDB

```bash
# Get DocumentDB endpoint
DOCDB_ENDPOINT=$(cd sos-app/infrastructure/terraform && \
  terraform output -raw documentdb_endpoint)

# Download certificate
wget https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

# Restore MongoDB data
mongorestore \
  --host $DOCDB_ENDPOINT:27017 \
  --ssl \
  --sslCAFile global-bundle.pem \
  --username admin \
  --password <password> \
  --dir mongodb_backup

# Verify data
mongosh "mongodb://admin:<password>@$DOCDB_ENDPOINT:27017/?tls=true&tlsCAFile=global-bundle.pem" \
  --eval "db.stats()"
```

### Phase 4: Application Deployment (Week 3-4)

#### Step 4.1: Create Kubernetes Secrets

```bash
# This is done automatically by the deployment script, but can be done manually:

# Database secrets
kubectl create secret generic postgres-credentials -n sos-app \
  --from-literal=postgres-password=$RDS_PASSWORD

kubectl create secret generic mongodb-credentials -n sos-app \
  --from-literal=mongodb-password=$DOCDB_PASSWORD

kubectl create secret generic redis-credentials -n sos-app \
  --from-literal=redis-password=$REDIS_PASSWORD

# JWT secret
kubectl create secret generic jwt-secret -n sos-app \
  --from-literal=jwt-secret=$(openssl rand -base64 64)

# API keys (if needed)
kubectl create secret generic api-keys -n sos-app \
  --from-literal=openai-api-key=$OPENAI_API_KEY \
  --from-literal=twilio-api-key=$TWILIO_API_KEY
```

#### Step 4.2: Deploy Applications with Helm

```bash
# Deploy all services
./deploy-to-aws.sh helm-only

# Or manually:
cd sos-app/infrastructure/helm

helm upgrade --install sos-app ./sos-app \
  --namespace sos-app \
  --create-namespace \
  --set global.environment=dev \
  --set global.awsRegion=us-east-1 \
  --timeout 10m \
  --wait

# Monitor deployment
kubectl get pods -n sos-app -w
```

#### Step 4.3: Verify Application Deployment

```bash
# Check all pods are running
kubectl get pods -n sos-app

# Expected output: All pods should be in Running state
# NAME                                    READY   STATUS    RESTARTS   AGE
# auth-service-xxx                        1/1     Running   0          5m
# user-service-xxx                        1/1     Running   0          5m
# medical-service-xxx                     1/1     Running   0          5m
# emergency-service-xxx                   1/1     Running   0          5m
# ...

# Check services
kubectl get svc -n sos-app

# Check ingress
kubectl get ingress -n sos-app

# Test health endpoints
API_URL=$(kubectl get ingress -n sos-app api-gateway-ingress \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

curl http://$API_URL/health
```

### Phase 5: Monitoring & Logging Setup (Week 4)

#### Step 5.1: Deploy Monitoring Stack

```bash
# Deploy Prometheus, Grafana, Jaeger
./deploy-to-aws.sh monitoring-only

# Verify monitoring stack
kubectl get pods -n monitoring

# Get Grafana URL
kubectl get ingress -n monitoring grafana-ingress

# Access Grafana
# Username: admin
# Password: admin (change on first login)
```

#### Step 5.2: Deploy Logging Stack

```bash
# Deploy ELK Stack (Elasticsearch, Logstash, Kibana)
./deploy-to-aws.sh logging-only

# Verify logging stack
kubectl get pods -n logging

# Wait for Elasticsearch to be ready
kubectl wait --for=condition=ready pod -l app=elasticsearch -n logging --timeout=300s

# Get Kibana URL
kubectl get ingress -n logging kibana-ingress
```

#### Step 5.3: Configure CloudWatch Integration

```bash
# Install CloudWatch Container Insights
curl https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/k8s-deployment-manifest-templates/deployment-mode/daemonset/container-insights-monitoring/quickstart/cwagent-fluentd-quickstart.yaml | \
  sed "s/{{cluster_name}}/sos-app-dev-eks/;s/{{region_name}}/$AWS_REGION/" | \
  kubectl apply -f -

# Verify
kubectl get pods -n amazon-cloudwatch
```

### Phase 6: DNS and SSL Configuration (Week 4-5)

#### Step 6.1: Request SSL Certificate (ACM)

```bash
# Request certificate for your domain
aws acm request-certificate \
  --domain-name sos-app.example.com \
  --subject-alternative-names "*.sos-app.example.com" \
  --validation-method DNS \
  --region $AWS_REGION

# Get certificate ARN
CERT_ARN=$(aws acm list-certificates \
  --query "CertificateSummaryList[?DomainName=='sos-app.example.com'].CertificateArn" \
  --output text)

# Get validation DNS records
aws acm describe-certificate --certificate-arn $CERT_ARN

# Add the validation CNAME record to your DNS (Route 53 or external)
```

#### Step 6.2: Configure Route 53

```bash
# Create hosted zone (if not exists)
aws route53 create-hosted-zone \
  --name sos-app.example.com \
  --caller-reference $(date +%s)

# Get hosted zone ID
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --dns-name sos-app.example.com \
  --query "HostedZones[0].Id" \
  --output text)

# Get ALB DNS name
ALB_DNS=$(kubectl get ingress -n sos-app api-gateway-ingress \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Create DNS record
cat > route53-record.json <<EOF
{
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "api.sos-app.example.com",
      "Type": "CNAME",
      "TTL": 300,
      "ResourceRecords": [{"Value": "$ALB_DNS"}]
    }
  }]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch file://route53-record.json
```

#### Step 6.3: Update Ingress for SSL

```bash
# Update Helm values to use SSL certificate
cat >> sos-app/infrastructure/helm/aws-override-values.yaml <<EOF

api-gateway:
  ingress:
    annotations:
      alb.ingress.kubernetes.io/certificate-arn: $CERT_ARN
      alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS":443}]'
      alb.ingress.kubernetes.io/ssl-redirect: '443'
    hosts:
      - host: api.sos-app.example.com
        paths:
          - path: /
            pathType: Prefix
EOF

# Redeploy
helm upgrade sos-app ./sos-app -n sos-app -f aws-override-values.yaml
```

### Phase 7: Testing and Validation (Week 5)

#### Step 7.1: Health Checks

```bash
# Run comprehensive validation
./sos-app/validate-deployment.sh

# Test each service
SERVICES=(
  "auth-service"
  "user-service"
  "medical-service"
  "emergency-service"
  "location-service"
  "notification-service"
  "communication-service"
  "device-service"
)

for SERVICE in "${SERVICES[@]}"; do
  echo "Testing $SERVICE..."
  kubectl exec -n sos-app deploy/$SERVICE -- curl localhost:8080/health
done
```

#### Step 7.2: Integration Testing

```bash
# Run integration tests
./test-integration.sh

# Expected tests:
# ✓ Database connectivity
# ✓ Redis cache
# ✓ Kafka messaging
# ✓ Inter-service communication
# ✓ Authentication flow
# ✓ Emergency alert creation
# ✓ Location tracking
# ✓ Notification delivery
```

#### Step 7.3: Load Testing

```bash
# Install k6 for load testing
brew install k6  # macOS
# or
sudo apt-get install k6  # Linux

# Create load test script
cat > load-test.js <<'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp-up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp-down to 0 users
  ],
};

export default function () {
  let res = http.get('https://api.sos-app.example.com/health');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
EOF

# Run load test
k6 run load-test.js
```

### Phase 8: Go-Live (Week 6)

#### Step 8.1: Pre-Launch Checklist

```bash
# Checklist:
☐ All services running and healthy
☐ Database migrations complete
☐ Data integrity verified
☐ Monitoring dashboards configured
☐ Alerts configured
☐ SSL certificates installed
☐ DNS records configured
☐ Load testing passed
☐ Backup strategy implemented
☐ Rollback plan documented
☐ Team training complete
☐ On-call schedule set
```

#### Step 8.2: DNS Cutover

```bash
# Update DNS to point to AWS
# Lower TTL 24 hours before cutover
# Then update A/CNAME records to point to AWS ALB

# Monitor traffic shift
watch -n 5 'kubectl top nodes && kubectl top pods -n sos-app'

# Monitor application logs
kubectl logs -f -n sos-app -l app=api-gateway

# Monitor CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/EKS \
  --metric-name cluster_failed_node_count \
  --dimensions Name=ClusterName,Value=sos-app-dev-eks \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

#### Step 8.3: Post-Launch Monitoring

```bash
# Monitor for 24-48 hours after launch

# Check error rates
kubectl logs -n sos-app -l app=api-gateway | grep ERROR | wc -l

# Check response times (from Grafana or CloudWatch)
# Target: p95 < 500ms, p99 < 1000ms

# Check auto-scaling
kubectl get hpa -n sos-app

# Check database performance
# RDS Performance Insights (AWS Console)

# Check costs
aws ce get-cost-and-usage \
  --time-period Start=2025-11-01,End=2025-11-07 \
  --granularity DAILY \
  --metrics UnblendedCost
```

---

## Post-Migration Validation

### Validation Checklist

```bash
# 1. All pods running
kubectl get pods -A | grep -v Running

# 2. No crashlooping pods
kubectl get pods -A | grep CrashLoopBackOff

# 3. All services accessible
kubectl get svc -A

# 4. Ingress configured
kubectl get ingress -A

# 5. Database connections
kubectl exec -n sos-app deploy/auth-service -- nc -zv $RDS_ENDPOINT 5432

# 6. Redis connection
kubectl exec -n sos-app deploy/auth-service -- nc -zv $REDIS_ENDPOINT 6379

# 7. Kafka connection
kubectl exec -n sos-app deploy/emergency-service -- nc -zv $KAFKA_ENDPOINT 9092

# 8. Monitoring stack
kubectl get pods -n monitoring | grep -v Running

# 9. Logging stack
kubectl get pods -n logging | grep -v Running

# 10. SSL certificate
curl -I https://api.sos-app.example.com | grep "200 OK"
```

---

## Rollback Procedures

### Scenario 1: Application Issues

```bash
# Rollback Helm deployment to previous version
helm rollback sos-app -n sos-app

# Or rollback to specific revision
helm history sos-app -n sos-app
helm rollback sos-app 3 -n sos-app  # Rollback to revision 3
```

### Scenario 2: Infrastructure Issues

```bash
# Terraform state rollback
cd sos-app/infrastructure/terraform

# List state versions (if using S3 backend with versioning)
aws s3api list-object-versions \
  --bucket sos-app-terraform-state-$AWS_REGION \
  --prefix dev/terraform.tfstate

# Restore previous version
aws s3api get-object \
  --bucket sos-app-terraform-state-$AWS_REGION \
  --key dev/terraform.tfstate \
  --version-id <VERSION_ID> \
  terraform.tfstate.restored

# Then run terraform plan and apply to revert
```

### Scenario 3: Complete Migration Rollback

```bash
# 1. Switch DNS back to old environment
# 2. Stop application in AWS
kubectl scale deployment --all --replicas=0 -n sos-app

# 3. Destroy AWS infrastructure (only if needed)
./deploy-to-aws.sh destroy

# 4. Restore old environment
```

---

## Cost Optimization

### Reserved Instances

```bash
# Purchase 1-year or 3-year Reserved Instances for:
# - EC2 instances (EKS nodes)
# - RDS instances
# - ElastiCache nodes

# Example: Purchase EC2 RIs
aws ec2 purchase-reserved-instances-offering \
  --reserved-instances-offering-id <offering-id> \
  --instance-count 3
```

### Savings Plans

```bash
# Commit to $X/hour for 1 or 3 years
# Flexible across instance types and regions
# Up to 72% savings

# Purchase via AWS Console:
# Billing > Savings Plans > Purchase Savings Plans
```

### Auto-Scaling Optimization

```bash
# Configure HPA for services
kubectl autoscale deployment auth-service \
  --cpu-percent=70 \
  --min=2 \
  --max=10 \
  -n sos-app

# Configure cluster autoscaler
# Already configured in EKS deployment
```

### Spot Instances for Non-Critical Workloads

```bash
# Add spot instance node group to EKS
eksctl create nodegroup \
  --cluster sos-app-dev-eks \
  --name spot-workers \
  --node-type t3.xlarge \
  --nodes 3 \
  --nodes-min 0 \
  --nodes-max 10 \
  --spot
```

---

## Security Hardening

### 1. Enable Encryption

```bash
# Encryption at rest (already enabled in Terraform):
# - EBS volumes (gp3 encrypted)
# - RDS (encrypted)
# - DocumentDB (encrypted)
# - ElastiCache (encrypted)
# - S3 (encrypted)

# Encryption in transit:
# - All services use TLS 1.2+
# - Inter-service communication via service mesh (optional)
```

### 2. Network Security

```bash
# Security groups (already configured in Terraform)
# VPC flow logs
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids <vpc-id> \
  --traffic-type ALL \
  --log-destination-type cloud-watch-logs \
  --log-group-name /aws/vpc/sos-app

# Network policies
kubectl apply -f sos-app/infrastructure/kubernetes/network-policies/
```

### 3. IAM Policies (Least Privilege)

```bash
# Use IRSA (IAM Roles for Service Accounts)
# Already configured in Terraform

# Example: Grant S3 access to specific service
eksctl create iamserviceaccount \
  --name s3-access-sa \
  --namespace sos-app \
  --cluster sos-app-dev-eks \
  --attach-policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess \
  --approve
```

### 4. Secrets Management

```bash
# Use AWS Secrets Manager or Parameter Store
# Rotate secrets regularly

# Example: Create secret in Secrets Manager
aws secretsmanager create-secret \
  --name sos-app/db-password \
  --secret-string "$(openssl rand -base64 32)"

# Auto-rotate every 30 days
aws secretsmanager rotate-secret \
  --secret-id sos-app/db-password \
  --rotation-lambda-arn <lambda-arn> \
  --rotation-rules AutomaticallyAfterDays=30
```

### 5. Vulnerability Scanning

```bash
# Enable ECR image scanning
aws ecr put-image-scanning-configuration \
  --repository-name sos-app-dev-auth-service \
  --image-scanning-configuration scanOnPush=true

# Use AWS Security Hub
aws securityhub enable-security-hub

# Use GuardDuty
aws guardduty create-detector --enable
```

---

## Troubleshooting

### Common Issues

#### Issue 1: Pod CrashLoopBackOff

```bash
# Diagnose
kubectl describe pod <pod-name> -n sos-app
kubectl logs <pod-name> -n sos-app --previous

# Common causes:
# - Database connection issues
# - Missing secrets
# - Resource limits too low

# Fix examples:
# Check database connectivity
kubectl exec -n sos-app <pod-name> -- nc -zv $RDS_ENDPOINT 5432

# Check secrets exist
kubectl get secrets -n sos-app

# Increase resource limits
kubectl edit deployment <deployment-name> -n sos-app
```

#### Issue 2: Service Not Accessible

```bash
# Check service
kubectl get svc <service-name> -n sos-app

# Check endpoints
kubectl get endpoints <service-name> -n sos-app

# Check ingress
kubectl describe ingress <ingress-name> -n sos-app

# Check ALB
aws elbv2 describe-load-balancers
aws elbv2 describe-target-health --target-group-arn <target-group-arn>
```

#### Issue 3: High Resource Usage

```bash
# Check node resources
kubectl top nodes

# Check pod resources
kubectl top pods -n sos-app

# Identify high CPU/memory pods
kubectl top pods -n sos-app --sort-by=cpu
kubectl top pods -n sos-app --sort-by=memory

# Scale up if needed
kubectl scale deployment <deployment-name> --replicas=5 -n sos-app
```

#### Issue 4: Database Connection Issues

```bash
# Check RDS status
aws rds describe-db-instances --db-instance-identifier sos-app-dev-postgres

# Check security groups
aws ec2 describe-security-groups --group-ids <sg-id>

# Test connection from pod
kubectl run -it --rm debug \
  --image=postgres:15 \
  --restart=Never \
  -n sos-app \
  -- psql -h $RDS_ENDPOINT -U postgres -d sos_app
```

### Logs and Debugging

```bash
# Application logs
kubectl logs -f <pod-name> -n sos-app

# Previous pod logs (if crashed)
kubectl logs <pod-name> -n sos-app --previous

# All logs from a deployment
kubectl logs -f deployment/<deployment-name> -n sos-app

# Events
kubectl get events -n sos-app --sort-by='.lastTimestamp'

# CloudWatch Logs
aws logs tail /aws/eks/sos-app-dev-eks/cluster --follow

# EKS control plane logs
aws eks describe-cluster --name sos-app-dev-eks \
  --query 'cluster.logging'
```

---

## Support and Resources

### AWS Documentation
- **EKS**: https://docs.aws.amazon.com/eks/
- **RDS**: https://docs.aws.amazon.com/rds/
- **DocumentDB**: https://docs.aws.amazon.com/documentdb/
- **ElastiCache**: https://docs.aws.amazon.com/elasticache/
- **MSK**: https://docs.aws.amazon.com/msk/

### Terraform Documentation
- **AWS Provider**: https://registry.terraform.io/providers/hashicorp/aws/latest/docs

### Kubernetes Documentation
- **Official Docs**: https://kubernetes.io/docs/
- **Helm**: https://helm.sh/docs/

### SOS App Documentation
- **Terraform README**: `./sos-app/infrastructure/terraform/README.md`
- **Helm README**: `./sos-app/infrastructure/helm/README.md`
- **Monitoring README**: `./sos-app/infrastructure/kubernetes/monitoring/README.md`

### Contact
For migration support, contact:
- **DevOps Team**: devops@example.com
- **Cloud Architect**: cloudarch@example.com
- **AWS Support**: Enterprise support plan

---

## Conclusion

This migration guide provides a comprehensive path to migrating the SOS App to AWS. Follow each phase carefully, validate at every step, and maintain communication with stakeholders throughout the process.

**Key Success Factors:**
- Thorough planning and cost estimation
- Incremental deployment and testing
- Comprehensive monitoring from day one
- Well-documented rollback procedures
- Team training and readiness

**Post-Migration:**
- Continuously optimize costs
- Regularly review security posture
- Keep infrastructure code updated
- Maintain disaster recovery procedures
- Document lessons learned

---

**Document Version:** 1.0
**Last Updated:** 2025-11-07
**Next Review:** 2025-12-07
