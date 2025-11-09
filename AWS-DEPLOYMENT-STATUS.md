# SOS App - AWS Deployment Status

**Last Updated:** 2025-10-30
**Environment:** Testing
**Region:** ap-south-2 (Hyderabad)

## Deployment Overview

### EKS Cluster Configuration
- **Cluster Name:** sos-app-cluster
- **Kubernetes Version:** v1.28.15-eks-113cf36
- **Node Type:** t3.medium
- **Node Count:** 2 nodes
- **Container Runtime:** containerd 1.7.27

**Cluster Nodes:**
```
NAME                                            STATUS   EXTERNAL-IP
ip-192-168-14-133.ap-south-2.compute.internal   Ready    18.61.253.177
ip-192-168-87-93.ap-south-2.compute.internal    Ready    18.61.177.105
```

## Current Deployment Status

### ✅ Application Services (Running)

#### Auth Service
- **Status:** 3/3 pods Running and Ready
- **Image:** 173148986859.dkr.ecr.ap-south-2.amazonaws.com/sos-app/auth-service:latest
- **Service IP:** 10.100.2.217
- **Ports:** 8080 (HTTP), 9090 (Metrics), 9091 (Health)
- **Health Endpoints:**
  - `/health/startup` ✓
  - `/health/ready` ✓
  - `/health/live` ✓
- **Auto-scaling:** HPA configured (3-10 replicas, CPU: 70%, Memory: 80%)

#### User Service
- **Status:** 3/3 pods Running and Ready
- **Image:** 173148986859.dkr.ecr.ap-south-2.amazonaws.com/sos-app/user-service:latest
- **Service IP:** 10.100.173.134
- **Ports:** 8080 (HTTP), 9090 (Metrics), 9091 (Health)
- **Health Endpoints:**
  - `/health/startup` ✓
  - `/health/ready` ✓
  - `/health/live` ✓
- **Auto-scaling:** HPA configured (3-10 replicas, CPU: 70%)

### ✅ Infrastructure Services (Running)

#### PostgreSQL
- **Type:** StatefulSet
- **Status:** 1/1 pods Running
- **Service IPs:**
  - postgres-service: 10.100.87.1:5432 (Primary)
  - postgres-readonly-service: 10.100.76.107:5432 (Replica)
  - postgres-headless: None (StatefulSet coordination)
- **Storage:** Persistent volumes configured
- **Test Database:** `sosapp` (verified working)

#### Zookeeper
- **Type:** StatefulSet
- **Status:** 1/1 pods Running
- **Service IPs:**
  - zookeeper-service: 10.100.187.203:2181 (Client), :7000 (Admin)
  - zookeeper-headless: None (StatefulSet coordination)
- **Ports:** 2181 (Client), 2888 (Follower), 3888 (Leader), 7000 (Admin)

## Container Registry (ECR)

**Region:** ap-south-2
**Registry:** 173148986859.dkr.ecr.ap-south-2.amazonaws.com

**Repositories:**
- `sos-app/auth-service:latest` (digest: sha256:55f61497e3c9...)
- `sos-app/user-service:latest` (digest: sha256:31c72c45da25...)

## Removed Components

The following components were intentionally removed for this minimal testing setup:

- ❌ **MongoDB** - Recommended: AWS DocumentDB
- ❌ **Redis** - Recommended: AWS ElastiCache
- ❌ **Kafka** - Recommended: AWS MSK (Managed Streaming for Kafka)

## AWS Managed Services Integration Plan

### 1. Amazon RDS for PostgreSQL
**When to migrate:**
- Production deployments
- Need for automated backups
- Multi-AZ high availability
- Read replicas across regions

**Benefits:**
- Automated backups and point-in-time recovery
- Automatic failover
- Encryption at rest and in transit
- Performance Insights

### 2. Amazon DocumentDB (MongoDB-compatible)
**Use cases:**
- Document storage for application data
- User profiles and preferences
- Session management
- Event logs

**Benefits:**
- Fully managed MongoDB-compatible service
- Automatic scaling
- 99.99% availability SLA
- Continuous backup

### 3. Amazon ElastiCache (Redis)
**Use cases:**
- Session caching
- API response caching
- Rate limiting
- Real-time analytics

**Benefits:**
- Sub-millisecond latency
- Automatic failover
- Redis 7.x compatibility
- Cluster mode for horizontal scaling

### 4. Amazon MSK (Managed Streaming for Kafka)
**Use cases:**
- Event streaming between microservices
- Real-time data pipelines
- Log aggregation
- Change data capture (CDC)

**Benefits:**
- Fully managed Kafka clusters
- Apache Kafka compatibility
- Auto-scaling broker storage
- Integrated with CloudWatch

## Monitoring and Operations

### Current Setup
- Kubernetes native health checks (startup, readiness, liveness probes)
- Horizontal Pod Autoscaler for application services
- Metrics ports exposed (9090, 9091) ready for Prometheus integration

### Recommended Next Steps
1. **Install Prometheus & Grafana** for metrics collection and visualization
2. **Configure AWS CloudWatch** for centralized logging
3. **Setup AWS X-Ray** for distributed tracing
4. **Implement AWS Secrets Manager** for sensitive configuration
5. **Configure AWS ALB Ingress Controller** for external access

## Cost Optimization Notes

**Current Monthly Costs (Approximate):**
- EKS Cluster: ~$73/month (cluster management)
- 2x t3.medium nodes: ~$60/month (on-demand pricing)
- ECR Storage: Minimal (~$0.10/GB/month)
- Data Transfer: Variable based on usage

**Total Estimated:** ~$133-150/month for testing environment

**Production Recommendations:**
- Use Reserved Instances or Savings Plans for compute (30-70% savings)
- Right-size node types based on actual usage
- Implement cluster autoscaler for dynamic scaling
- Use spot instances for non-critical workloads

## Testing and Validation

### Health Check Validation
```bash
# Test auth-service
kubectl exec postgres-0 -n sos-app -c postgres -- wget -qO- http://auth-service:8080/health/startup

# Test user-service
kubectl exec postgres-0 -n sos-app -c postgres -- wget -qO- http://user-service:8080/health/ready
```

### Database Connectivity
```bash
# Connect to PostgreSQL
kubectl exec -it postgres-0 -n sos-app -c postgres -- psql -U postgres -d sosapp
```

### Service Discovery
All services are accessible within the cluster via their service names:
- `auth-service:8080`
- `user-service:8080`
- `postgres-service:5432`
- `zookeeper-service:2181`

## Deployment Scripts

### Build and Push Images
```bash
./build-and-push.sh
```

### Deploy to EKS
```bash
./aws-deploy.sh deploy
```

### Create EKS Cluster
```bash
export EKS_NODE_TYPE=t3.medium
export EKS_NODE_COUNT=2
export EKS_MIN_NODES=2
export EKS_MAX_NODES=5
./aws-create-eks-cluster.sh
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     AWS EKS Cluster                         │
│                    (ap-south-2 region)                      │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ auth-service │  │ user-service │  │  PostgreSQL  │    │
│  │  (3 pods)    │  │  (3 pods)    │  │ (StatefulSet)│    │
│  │   + HPA      │  │   + HPA      │  │              │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                  │             │
│         └─────────────────┴──────────────────┘             │
│                           │                                │
│                    ┌──────┴────────┐                      │
│                    │   Zookeeper   │                      │
│                    │ (StatefulSet) │                      │
│                    └───────────────┘                      │
│                                                            │
│  Container Images stored in ECR (ap-south-2)              │
└────────────────────────────────────────────────────────────┘

Future Integration:
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ DocumentDB   │  │ ElastiCache  │  │  Amazon MSK  │
│  (MongoDB)   │  │   (Redis)    │  │   (Kafka)    │
└──────────────┘  └──────────────┘  └──────────────┘
```

## Support and Troubleshooting

### View Pod Logs
```bash
kubectl logs -n sos-app <pod-name>
```

### Check Pod Status
```bash
kubectl get pods -n sos-app -o wide
```

### Describe Pod for Events
```bash
kubectl describe pod <pod-name> -n sos-app
```

### Scale Deployments
```bash
kubectl scale deployment auth-service --replicas=5 -n sos-app
```

### Restart Deployment
```bash
kubectl rollout restart deployment auth-service -n sos-app
```

## Next Steps

1. ✅ Foundation deployed and tested
2. 🔄 Implement AWS managed services as needed
3. 📊 Setup monitoring and observability
4. 🔒 Configure secrets management
5. 🌐 Setup ingress for external access
6. 🔐 Implement authentication and authorization
7. 📝 Add remaining microservices
8. 🧪 Setup CI/CD pipelines
