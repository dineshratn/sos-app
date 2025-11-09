# Terraform Infrastructure for SOS App

This directory contains Terraform configurations for deploying the SOS App infrastructure on AWS.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Module Structure](#module-structure)
- [Environment Configuration](#environment-configuration)
- [Deployment](#deployment)
- [State Management](#state-management)
- [Cost Estimates](#cost-estimates)
- [Troubleshooting](#troubleshooting)

## Overview

This Terraform configuration deploys a complete production-ready infrastructure for the SOS App on AWS, including:

- **VPC**: Multi-AZ networking with public, private, and database subnets
- **EKS**: Managed Kubernetes cluster with auto-scaling node groups
- **RDS PostgreSQL**: Multi-AZ relational database for structured data
- **DocumentDB**: MongoDB-compatible document database
- **ElastiCache Redis**: In-memory caching and session store
- **Amazon MSK**: Managed Kafka for event streaming
- **ECR**: Container registry for Docker images
- **S3**: Object storage for application data
- **CloudWatch**: Centralized logging and monitoring
- **KMS**: Encryption key management
- **Secrets Manager**: Secure credential storage

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         AWS Cloud (ap-south-2)                  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                      VPC (10.0.0.0/16)                    │  │
│  │                                                            │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌─────────────┐│  │
│  │  │ Public Subnet  │  │ Public Subnet  │  │ Public      ││  │
│  │  │  10.0.1.0/24   │  │  10.0.2.0/24   │  │ Subnet      ││  │
│  │  │   (AZ-A)       │  │   (AZ-B)       │  │ 10.0.3.0/24 ││  │
│  │  └────────┬───────┘  └────────┬───────┘  └──────┬──────┘│  │
│  │           │                   │                  │        │  │
│  │           │    Internet Gateway                  │        │  │
│  │           └───────────────────┴──────────────────┘        │  │
│  │                                                            │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌─────────────┐│  │
│  │  │ Private Subnet │  │ Private Subnet │  │ Private     ││  │
│  │  │  10.0.11.0/24  │  │  10.0.12.0/24  │  │ Subnet      ││  │
│  │  │                 │  │                 │  │ 10.0.13.0/24││  │
│  │  │  ┌──────────┐  │  │  ┌──────────┐  │  │             ││  │
│  │  │  │EKS Nodes │  │  │  │EKS Nodes │  │  │             ││  │
│  │  │  └──────────┘  │  │  └──────────┘  │  │             ││  │
│  │  │  ┌──────────┐  │  │  ┌──────────┐  │  │             ││  │
│  │  │  │  Redis   │  │  │  │  Kafka   │  │  │             ││  │
│  │  │  └──────────┘  │  │  └──────────┘  │  │             ││  │
│  │  └────────────────┘  └────────────────┘  └─────────────┘│  │
│  │                                                            │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌─────────────┐│  │
│  │  │ Database       │  │ Database       │  │ Database    ││  │
│  │  │ Subnet         │  │ Subnet         │  │ Subnet      ││  │
│  │  │  10.0.21.0/24  │  │  10.0.22.0/24  │  │ 10.0.23.0/24││  │
│  │  │  ┌──────────┐  │  │  ┌──────────┐  │  │             ││  │
│  │  │  │   RDS    │  │  │  │ DocumentDB│  │  │             ││  │
│  │  │  └──────────┘  │  │  └──────────┘  │  │             ││  │
│  │  └────────────────┘  └────────────────┘  └─────────────┘│  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐           │
│  │     ECR     │  │     S3      │  │  CloudWatch  │           │
│  │  (Images)   │  │  (Storage)  │  │    (Logs)    │           │
│  └─────────────┘  └─────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

### Required Tools

1. **Terraform** >= 1.5.0
   ```bash
   # Install Terraform
   wget https://releases.hashicorp.com/terraform/1.5.7/terraform_1.5.7_linux_amd64.zip
   unzip terraform_1.5.7_linux_amd64.zip
   sudo mv terraform /usr/local/bin/
   ```

2. **AWS CLI** >= 2.0
   ```bash
   # Install AWS CLI
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install
   ```

3. **kubectl** >= 1.28
   ```bash
   # Install kubectl
   curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
   sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
   ```

### AWS Account Setup

1. **AWS Account** with appropriate permissions
2. **IAM User** or Role with permissions for:
   - VPC, EKS, RDS, DocumentDB, ElastiCache, MSK
   - ECR, S3, CloudWatch, KMS, Secrets Manager
   - IAM (for creating service roles)

3. **Configure AWS CLI**:
   ```bash
   aws configure
   # Enter: Access Key ID, Secret Access Key, Region (ap-south-2), Output format (json)
   ```

## Quick Start

### 1. Clone Repository

```bash
git clone <repository-url>
cd sos-app/infrastructure/terraform
```

### 2. Create S3 Backend (One-time setup)

```bash
# Create S3 bucket for state storage
aws s3 mb s3://sos-app-terraform-state --region ap-south-2

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket sos-app-terraform-state \
  --versioning-configuration Status=Enabled

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name sos-app-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-south-2
```

### 3. Configure Backend

Create `backend.tfvars`:

```hcl
bucket         = "sos-app-terraform-state"
key            = "infrastructure/dev/terraform.tfstate"
region         = "ap-south-2"
dynamodb_table = "sos-app-terraform-locks"
encrypt        = true
```

### 4. Initialize Terraform

```bash
# Initialize with backend configuration
terraform init -backend-config=backend.tfvars

# Or initialize without backend (local state)
terraform init
```

### 5. Deploy Infrastructure

```bash
# Development environment
terraform workspace new dev
terraform plan -var-file=environments/dev/terraform.tfvars
terraform apply -var-file=environments/dev/terraform.tfvars

# Production environment
terraform workspace new prod
terraform plan -var-file=environments/prod/terraform.tfvars
terraform apply -var-file=environments/prod/terraform.tfvars
```

## Module Structure

```
terraform/
├── main.tf                 # Root module configuration
├── variables.tf            # Variable definitions
├── outputs.tf              # Output values
├── versions.tf             # Provider versions and backend config
├── README.md               # This file
│
├── modules/                # Reusable modules
│   ├── vpc/                # VPC, subnets, NAT, IGW
│   ├── eks/                # EKS cluster and node groups
│   ├── rds/                # RDS PostgreSQL
│   ├── documentdb/         # DocumentDB cluster
│   ├── elasticache/        # Redis cluster
│   └── msk/                # Kafka cluster
│
└── environments/           # Environment-specific configs
    ├── dev/
    │   └── terraform.tfvars
    ├── staging/
    │   └── terraform.tfvars
    └── prod/
        └── terraform.tfvars
```

## Environment Configuration

### Development (dev)

- **Purpose**: Local testing and development
- **EKS**: 2 nodes (t3.medium), 1-4 scaling
- **RDS**: Single-AZ, db.t3.medium, 50GB
- **DocumentDB**: 1 instance, db.t3.medium
- **Redis**: 1 node, cache.t3.medium
- **MSK**: 3 brokers, kafka.t3.small
- **Cost**: ~$250-350/month

### Staging (staging)

- **Purpose**: Pre-production testing
- **EKS**: 3 nodes (t3.large), 2-8 scaling
- **RDS**: Multi-AZ, db.r6g.large, 200GB
- **DocumentDB**: 2 instances, db.t3.medium
- **Redis**: 2 nodes, cache.r6g.large
- **MSK**: 3 brokers, kafka.m5.large
- **Cost**: ~$600-800/month

### Production (prod)

- **Purpose**: Live production workload
- **EKS**: 5 nodes (t3.large/xlarge), 3-20 scaling
- **RDS**: Multi-AZ, db.r6g.xlarge, 500GB
- **DocumentDB**: 3 instances, db.r6g.xlarge
- **Redis**: 3 nodes, cache.r6g.xlarge
- **MSK**: 6 brokers, kafka.m5.xlarge
- **Cost**: ~$2,000-3,000/month

## Deployment

### Full Deployment

```bash
# 1. Initialize
terraform init -backend-config=backend.tfvars

# 2. Select/Create workspace
terraform workspace select dev

# 3. Plan changes
terraform plan -var-file=environments/dev/terraform.tfvars -out=tfplan

# 4. Review plan
terraform show tfplan

# 5. Apply changes
terraform apply tfplan

# 6. Save outputs
terraform output > infrastructure-outputs.json
```

### Selective Deployment

Deploy only specific modules:

```bash
# Deploy only VPC
terraform apply -target=module.vpc -var-file=environments/dev/terraform.tfvars

# Deploy VPC and EKS
terraform apply \
  -target=module.vpc \
  -target=module.eks \
  -var-file=environments/dev/terraform.tfvars
```

### Configure kubectl

```bash
# Update kubeconfig
aws eks update-kubeconfig \
  --region ap-south-2 \
  --name sos-app-dev-eks

# Verify connection
kubectl get nodes
```

### Destroy Infrastructure

```bash
# Destroy all resources (BE CAREFUL!)
terraform destroy -var-file=environments/dev/terraform.tfvars

# Destroy specific module
terraform destroy -target=module.eks -var-file=environments/dev/terraform.tfvars
```

## State Management

### Remote State (Recommended)

State is stored in S3 with DynamoDB locking:

```hcl
# backend.tfvars
bucket         = "sos-app-terraform-state"
key            = "infrastructure/dev/terraform.tfstate"
region         = "ap-south-2"
dynamodb_table = "sos-app-terraform-locks"
encrypt        = true
```

### Workspaces

Use workspaces to manage multiple environments:

```bash
# List workspaces
terraform workspace list

# Create new workspace
terraform workspace new staging

# Switch workspace
terraform workspace select prod

# Show current workspace
terraform workspace show
```

### State Operations

```bash
# List resources in state
terraform state list

# Show specific resource
terraform state show module.eks.aws_eks_cluster.main

# Remove resource from state (without destroying)
terraform state rm module.old_resource

# Import existing resource
terraform import module.eks.aws_eks_cluster.main sos-app-dev-eks
```

## Cost Estimates

### Monthly Cost Breakdown (Production)

| Resource | Configuration | Monthly Cost |
|----------|--------------|--------------|
| EKS Cluster | 1 cluster | $73 |
| EKS Nodes | 5x t3.large | $370 |
| RDS PostgreSQL | db.r6g.xlarge, Multi-AZ | $800 |
| DocumentDB | 3x db.r6g.xlarge | $1,200 |
| ElastiCache | 3x cache.r6g.xlarge | $600 |
| MSK | 6x kafka.m5.xlarge | $1,400 |
| NAT Gateways | 3 gateways | $100 |
| Data Transfer | 1TB outbound | $90 |
| CloudWatch | Logs and metrics | $50 |
| S3 | 100GB storage | $2 |
| **Total** | | **~$4,685/month** |

### Cost Optimization Tips

1. **Use Spot Instances** for non-critical EKS nodes (50-70% savings)
2. **Reserved Instances** for RDS and DocumentDB (30-60% savings)
3. **Single NAT Gateway** for dev environments
4. **Adjust retention periods** for CloudWatch logs
5. **Enable S3 Intelligent-Tiering** for storage optimization
6. **Right-size instances** based on actual usage

## Outputs

After deployment, Terraform provides connection information:

```bash
# View all outputs
terraform output

# Specific output
terraform output eks_cluster_endpoint
terraform output rds_endpoint
terraform output documentdb_endpoint

# kubectl configuration command
terraform output kubectl_config_command

# Summary of all resources
terraform output deployment_summary
```

## Troubleshooting

### Common Issues

#### 1. Provider Configuration Errors

```bash
# Error: Failed to query available provider packages
terraform init -upgrade
```

#### 2. State Lock Errors

```bash
# Force unlock (use LockID from error message)
terraform force-unlock <LOCK_ID>
```

#### 3. Resource Already Exists

```bash
# Import existing resource
terraform import module.vpc.aws_vpc.main vpc-xxxxx
```

#### 4. Insufficient IAM Permissions

Check IAM user/role has required permissions:
- VPC: `AmazonVPCFullAccess`
- EKS: `AmazonEKSClusterPolicy`, `AmazonEKSWorkerNodePolicy`
- RDS: `AmazonRDSFullAccess`
- EC2: `AmazonEC2FullAccess`

#### 5. Region Not Available

Some instance types may not be available in all regions. Check availability:

```bash
aws ec2 describe-instance-type-offerings \
  --region ap-south-2 \
  --filters "Name=instance-type,Values=t3.large" \
  --query "InstanceTypeOfferings[*].InstanceType"
```

### Debug Mode

Enable detailed logging:

```bash
export TF_LOG=DEBUG
export TF_LOG_PATH=./terraform-debug.log
terraform apply -var-file=environments/dev/terraform.tfvars
```

## Security Best Practices

1. **Never commit** `terraform.tfstate` or `.terraform/` to version control
2. **Use Secrets Manager** for sensitive data (passwords, API keys)
3. **Enable encryption** at rest and in transit
4. **Implement least privilege** IAM policies
5. **Enable MFA** on AWS root and admin accounts
6. **Regular security audits** using AWS Config, Security Hub
7. **VPC Flow Logs** for network monitoring
8. **CloudTrail** for API audit logging

## Next Steps

After infrastructure is deployed:

1. **Deploy Helm Charts** (Task 257)
2. **Configure CI/CD Pipeline** (Task 258)
3. **Setup Monitoring** (Tasks 259-262)
4. **Deploy Applications** to EKS cluster
5. **Configure DNS** and SSL certificates
6. **Setup backup schedules**
7. **Implement disaster recovery** procedures

## Support

For issues or questions:
- Check AWS Service Health Dashboard
- Review CloudWatch logs
- Consult Terraform documentation
- Open issue in project repository

---

**Generated**: 2025-11-07
**Version**: 1.0.0
**Maintainer**: DevOps Team
