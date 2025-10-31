# SOS App - Kubernetes Base Configuration

This directory contains base Kubernetes configurations for the SOS App platform, including namespace definition, resource quotas, limit ranges, network policies, and priority classes.

## Overview

The Kubernetes infrastructure provides:
- **Namespace Isolation**: Separate namespace for SOS App resources
- **Resource Management**: Quotas and limits to prevent resource exhaustion
- **Network Security**: Network policies for zero-trust networking
- **Priority Scheduling**: Priority classes for critical services
- **Cloud Agnostic**: Works on any Kubernetes cluster (AWS EKS, GCP GKE, Azure AKS, self-hosted)

## Files

```
infrastructure/kubernetes/base/
├── namespace.yaml          # Namespace, quotas, limits, network policies
└── README.md              # This file
```

## Features

### Namespace Configuration

**Name**: `sos-app`

**Labels**:
- Application identification (`app.kubernetes.io/*`)
- Environment classification (`environment: production`)
- Team and ownership (`team: platform-engineering`)
- Monitoring flags (`monitoring: enabled`)
- Security compliance (`hipaa-compliant: "true"`)
- Network policy (`network-policy: enabled`)

**Annotations**:
- Documentation and contact information
- Cost tracking and budgets
- Security policies (Pod Security Standards)
- Backup and disaster recovery settings
- Monitoring integration (Prometheus, Grafana)
- Change tracking (version, last-updated)

### Resource Quotas

#### 1. Compute Resources

Limits total CPU and memory across all pods in the namespace:

```yaml
CPU:
  requests: 50 cores     # Total CPU requests
  limits: 100 cores      # Total CPU limits

Memory:
  requests: 100Gi        # Total memory requests
  limits: 200Gi          # Total memory limits

Pods: 200                # Maximum number of pods
```

**Purpose**: Prevents runaway resource consumption, ensures fair cluster usage

#### 2. Storage Resources

Limits total storage and PVCs in the namespace:

```yaml
Storage:
  requests: 1Ti          # Total storage across all PVCs
  PVCs: 50               # Maximum number of PVCs

Storage Classes:
  fast: 500Gi            # Fast SSD storage (databases)
  standard: 500Gi        # Standard storage (general use)
```

**Purpose**: Controls storage costs, prevents storage exhaustion

#### 3. Object Count Limits

Limits number of Kubernetes objects:

```yaml
Workloads:
  deployments: 30        # Max Deployments
  statefulsets: 15       # Max StatefulSets
  jobs: 50               # Max Jobs
  cronjobs: 20           # Max CronJobs

Services:
  services: 50           # Max Services
  loadbalancers: 10      # Max LoadBalancer services
  nodeports: 5           # Max NodePort services

Configuration:
  configmaps: 100        # Max ConfigMaps
  secrets: 100           # Max Secrets

Networking:
  ingresses: 20          # Max Ingress resources
```

**Purpose**: Prevents object sprawl, maintains cluster organization

### Limit Ranges

Default resource requests/limits for containers without specifications:

#### Container Limits

```yaml
Default (if not specified in pod spec):
  cpu: 500m              # Default CPU limit
  memory: 512Mi          # Default memory limit

Default Request (if not specified):
  cpu: 100m              # Default CPU request
  memory: 128Mi          # Default memory request

Maximum (per container):
  cpu: 4 cores           # Max CPU
  memory: 8Gi            # Max memory

Minimum (per container):
  cpu: 10m               # Min CPU
  memory: 32Mi           # Min memory

Max Limit/Request Ratio:
  cpu: 10x               # Limit can be max 10x request
  memory: 4x             # Limit can be max 4x request
```

#### Pod Limits

```yaml
Maximum (per pod, all containers combined):
  cpu: 16 cores          # Max total CPU
  memory: 32Gi           # Max total memory

Minimum (per pod):
  cpu: 10m               # Min total CPU
  memory: 32Mi           # Min total memory
```

#### PVC Limits

```yaml
Maximum (per PVC):
  storage: 100Gi         # Max storage per PVC

Minimum (per PVC):
  storage: 1Gi           # Min storage per PVC
```

**Purpose**: Ensures all pods have resource specifications, prevents misconfiguration

### Network Policies

#### 1. Default Deny All

```yaml
Policy: Deny all ingress and egress traffic by default
Scope: All pods in namespace
```

**Zero-trust networking**: Services must explicitly allow traffic

#### 2. Allow DNS

```yaml
Policy: Allow DNS queries to kube-system
Scope: All pods in namespace
Ports: 53 (UDP/TCP)
```

**Required**: Enables service discovery and DNS resolution

#### 3. Allow Internal Communication

```yaml
Policy: Allow traffic within sos-app namespace
Scope: All pods in namespace
Direction: Ingress and Egress
```

**Purpose**: Enables microservice communication within namespace

**Note**: Individual services should create additional NetworkPolicies for:
- External ingress (from ingress controller)
- External egress (to external APIs)
- Cross-namespace communication (if needed)

### Priority Classes

Defines pod scheduling priorities for resource contention scenarios:

#### 1. Critical Priority (`sos-app-critical`)

```yaml
Value: 1,000,000
Services: Emergency Service, Location Service
Preemption: Can preempt lower priority pods
```

**Use for**: Services critical to emergency response

#### 2. High Priority (`sos-app-high`)

```yaml
Value: 10,000
Services: Auth Service, User Service, Notification Service
Preemption: Can preempt lower priority pods
```

**Use for**: Core platform services

#### 3. Medium Priority (`sos-app-medium`)

```yaml
Value: 1,000
Services: Medical Service, Device Service
Default: Yes (default for namespace)
Preemption: Can preempt lower priority pods
```

**Use for**: Standard application services

#### 4. Low Priority (`sos-app-low`)

```yaml
Value: 100
Services: Analytics, Reporting, Batch Jobs
Preemption: Never preempts other pods
```

**Use for**: Non-critical background tasks

**How it works**:
- When cluster resources are limited, Kubernetes scheduler uses priorities
- High priority pods can evict (preempt) lower priority pods
- Ensures critical services always have resources

## Quick Start

### Prerequisites

- Kubernetes cluster (v1.24+)
- `kubectl` configured to connect to cluster
- Appropriate RBAC permissions

### Apply Configuration

```bash
# Apply all resources
kubectl apply -f infrastructure/kubernetes/base/namespace.yaml

# Verify namespace created
kubectl get namespace sos-app

# Check all resources created
kubectl get all,resourcequota,limitrange,networkpolicy,priorityclass -n sos-app
```

### Verify Installation

```bash
# 1. Check namespace
kubectl describe namespace sos-app

# 2. Check resource quotas
kubectl get resourcequota -n sos-app
kubectl describe resourcequota -n sos-app

# 3. Check limit ranges
kubectl get limitrange -n sos-app
kubectl describe limitrange sos-app-container-limits -n sos-app

# 4. Check network policies
kubectl get networkpolicy -n sos-app
kubectl describe networkpolicy -n sos-app

# 5. Check priority classes
kubectl get priorityclass | grep sos-app
```

## Usage Examples

### Deploy a Service with Priority

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: emergency-service
  namespace: sos-app
spec:
  template:
    spec:
      priorityClassName: sos-app-critical  # High priority for emergency service
      containers:
      - name: emergency-service
        image: sos-app/emergency-service:latest
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 1000m
            memory: 1Gi
```

### Create NetworkPolicy for External Access

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: auth-service-allow-ingress
  namespace: sos-app
spec:
  podSelector:
    matchLabels:
      app: auth-service
  policyTypes:
  - Ingress
  ingress:
  # Allow traffic from ingress controller
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 3000
```

### Deploy Without Explicit Resources (Uses Defaults)

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
  namespace: sos-app
spec:
  containers:
  - name: test
    image: nginx
    # No resources specified
    # Will get default: cpu=100m, memory=128Mi (requests)
    #                   cpu=500m, memory=512Mi (limits)
```

## Monitoring Resource Usage

### Check Resource Quotas

```bash
# View quota usage
kubectl describe resourcequota -n sos-app

# Example output:
# Resource                 Used    Hard
# --------                 ----    ----
# requests.cpu             10      50
# requests.memory          20Gi    100Gi
# limits.cpu               25      100
# limits.memory            40Gi    200Gi
# pods                     25      200
```

### Check Pod Resource Usage

```bash
# Top pods by CPU/memory
kubectl top pods -n sos-app

# Top pods sorted by memory
kubectl top pods -n sos-app --sort-by=memory

# Top pods sorted by CPU
kubectl top pods -n sos-app --sort-by=cpu

# Specific pod details
kubectl top pod <pod-name> -n sos-app --containers
```

### Check Node Resource Usage

```bash
# Top nodes
kubectl top nodes

# Node allocatable resources
kubectl describe nodes | grep -A 5 "Allocatable"

# Node resource requests vs allocatable
kubectl describe nodes | grep -A 10 "Allocated resources"
```

## Resource Planning

### Estimating Service Resources

Based on SOS App services:

#### Node.js Services (Auth, User, Medical, Notification)

```yaml
Typical Resources:
  requests:
    cpu: 100-200m
    memory: 128-256Mi
  limits:
    cpu: 500-1000m
    memory: 512-1Gi

Replicas: 3 (per service)

Total per service:
  CPU: 300-600m (requests), 1.5-3 cores (limits)
  Memory: 384Mi-768Mi (requests), 1.5-3Gi (limits)
```

#### Go Services (Emergency, Location, Device)

```yaml
Typical Resources:
  requests:
    cpu: 50-100m
    memory: 32-64Mi
  limits:
    cpu: 200-500m
    memory: 128-256Mi

Replicas: 3-5 (per service, higher for critical)

Total per service:
  CPU: 150-500m (requests), 0.6-2.5 cores (limits)
  Memory: 96-320Mi (requests), 384Mi-1.28Gi (limits)
```

#### Databases (PostgreSQL, MongoDB, Redis)

```yaml
PostgreSQL (per instance):
  requests:
    cpu: 500m
    memory: 1Gi
  limits:
    cpu: 2
    memory: 4Gi
  storage: 50Gi

MongoDB:
  requests:
    cpu: 500m
    memory: 1Gi
  limits:
    cpu: 2
    memory: 4Gi
  storage: 100Gi

Redis:
  requests:
    cpu: 100m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 1Gi
```

#### Message Brokers (Kafka)

```yaml
Kafka (3 brokers):
  Per broker:
    requests:
      cpu: 1
      memory: 2Gi
    limits:
      cpu: 2
      memory: 4Gi
    storage: 100Gi

  Total:
    CPU: 3 cores (requests), 6 cores (limits)
    Memory: 6Gi (requests), 12Gi (limits)
    Storage: 300Gi
```

### Total Resource Estimate

```
Application Services (7 services):
  CPU: ~5-10 cores (requests), ~15-25 cores (limits)
  Memory: ~5-10Gi (requests), ~10-20Gi (limits)

Databases and Infrastructure:
  CPU: ~8-12 cores (requests), ~16-24 cores (limits)
  Memory: ~10-15Gi (requests), ~25-35Gi (limits)
  Storage: ~600-800Gi

Total Cluster Needs:
  CPU: ~15-25 cores (requests), ~35-50 cores (limits)
  Memory: ~20-30Gi (requests), ~40-60Gi (limits)
  Storage: ~600-800Gi

Recommended Cluster Size:
  Nodes: 5-10 (depending on node size)
  Node Size: 4-8 cores, 16-32GB RAM each
  Total Capacity: 30-60 cores, 100-200Gi memory
```

**Current Quotas**:
- ✅ CPU: 50 cores (requests), 100 cores (limits) - Sufficient
- ✅ Memory: 100Gi (requests), 200Gi (limits) - Sufficient
- ✅ Storage: 1Ti - Sufficient

## Cloud-Specific Considerations

### AWS EKS

**Storage Classes**:
```yaml
# Update storage quota names in namespace.yaml:
requests.storage.gp3: 500Gi        # General purpose SSD
requests.storage.io1: 200Gi        # Provisioned IOPS SSD
```

**Load Balancers**:
- LoadBalancer services create AWS ELB/NLB
- Quota limits LoadBalancer count (cost control)

**IAM Roles**:
- Use IRSA (IAM Roles for Service Accounts) for AWS access
- No changes needed to namespace configuration

**Region**: No region-specific settings in namespace

### GCP GKE

**Storage Classes**:
```yaml
# Update storage quota names in namespace.yaml:
requests.storage.ssd: 500Gi        # SSD persistent disk
requests.storage.balanced: 500Gi   # Balanced persistent disk
```

**Load Balancers**:
- LoadBalancer services create GCP Load Balancers
- Quota limits LoadBalancer count

**Workload Identity**:
- Use Workload Identity for GCP service access
- No changes needed to namespace configuration

**GKE Autopilot**:
- Some quotas are managed automatically
- LimitRange still applies
- ResourceQuota may need adjustment

### Azure AKS

**Storage Classes**:
```yaml
# Update storage quota names in namespace.yaml:
requests.storage.managed-premium: 500Gi   # Premium SSD
requests.storage.managed-standard: 500Gi  # Standard HDD
```

**Load Balancers**:
- LoadBalancer services create Azure Load Balancers
- Quota limits LoadBalancer count

**Azure AD Integration**:
- Use Azure AD pod identity for Azure resource access
- No changes needed to namespace configuration

### Self-Hosted Kubernetes

**Storage Classes**:
- Define based on your storage backend (Ceph, NFS, local-path, etc.)
- Update storage quota names accordingly

**Load Balancers**:
- May need MetalLB or similar for LoadBalancer services
- Or use NodePort/Ingress instead

**No Cloud Dependencies**: Configuration works as-is

## Security Best Practices

### 1. Pod Security Standards

Namespace is configured with restricted Pod Security Standards:

```yaml
pod-security.kubernetes.io/enforce: "restricted"
pod-security.kubernetes.io/audit: "restricted"
pod-security.kubernetes.io/warn: "restricted"
```

**Requirements for pods**:
- Must run as non-root user
- Cannot use privileged containers
- Must drop all capabilities
- Cannot mount host paths

**Example compliant pod**:
```yaml
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1001
    fsGroup: 1001
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop:
        - ALL
      readOnlyRootFilesystem: true
```

### 2. Network Policies

Default deny-all network policy enforces zero-trust:

```
✅ All traffic denied by default
✅ DNS allowed (required for service discovery)
✅ Internal namespace traffic allowed
❌ External traffic must be explicitly allowed
```

**Add NetworkPolicies for each service** to allow required traffic.

### 3. RBAC

Create service accounts with least privilege:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: emergency-service
  namespace: sos-app

---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: emergency-service-role
  namespace: sos-app
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: emergency-service-binding
  namespace: sos-app
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: emergency-service-role
subjects:
- kind: ServiceAccount
  name: emergency-service
  namespace: sos-app
```

### 4. Secrets Management

```bash
# Use Kubernetes secrets
kubectl create secret generic db-credentials \
  --from-literal=username=sosapp \
  --from-literal=password=<password> \
  -n sos-app

# Or use external secrets management:
# - AWS Secrets Manager
# - GCP Secret Manager
# - Azure Key Vault
# - HashiCorp Vault
```

## Troubleshooting

### Quota Exceeded Errors

**Error**: `exceeded quota: sos-app-compute-quota`

**Solution**:
```bash
# Check current usage
kubectl describe resourcequota -n sos-app

# Option 1: Scale down non-critical services
kubectl scale deployment <name> --replicas=1 -n sos-app

# Option 2: Increase quota (if cluster has capacity)
# Edit namespace.yaml and increase quota values
# Then: kubectl apply -f infrastructure/kubernetes/base/namespace.yaml
```

### Pods Stuck in Pending

**Cause**: Resource requests cannot be satisfied

**Solution**:
```bash
# Check pod events
kubectl describe pod <pod-name> -n sos-app

# Check node capacity
kubectl describe nodes | grep -A 5 "Allocatable"

# Option 1: Reduce resource requests in deployment
# Option 2: Add more nodes to cluster
# Option 3: Increase namespace quota if at limit
```

### Network Policy Blocking Traffic

**Cause**: Default deny-all policy blocks required traffic

**Solution**:
```bash
# Check network policies
kubectl get networkpolicy -n sos-app

# Create NetworkPolicy to allow required traffic
# See "Create NetworkPolicy for External Access" example above
```

### Priority Class Not Found

**Error**: `priorityclass.scheduling.k8s.io "sos-app-critical" not found`

**Solution**:
```bash
# Check if priority classes exist
kubectl get priorityclass | grep sos-app

# If missing, reapply namespace.yaml
kubectl apply -f infrastructure/kubernetes/base/namespace.yaml
```

## Cleanup

```bash
# Delete namespace (WARNING: Deletes all resources in namespace)
kubectl delete namespace sos-app

# This will delete:
# - All pods, deployments, services
# - All PVCs and data
# - All secrets and configmaps
# - All resources in the namespace

# Priority classes are cluster-scoped and remain
# Delete priority classes separately if needed:
kubectl delete priorityclass sos-app-critical
kubectl delete priorityclass sos-app-high
kubectl delete priorityclass sos-app-medium
kubectl delete priorityclass sos-app-low
```

## Next Steps

1. **Task 9**: Create ConfigMaps for shared configuration
2. **Task 10**: Create Secrets template for sensitive data
3. **Deploy Databases**: StatefulSets for PostgreSQL, MongoDB, Redis
4. **Deploy Services**: Deployments for microservices
5. **Configure Ingress**: Expose services externally
6. **Setup Monitoring**: Prometheus, Grafana dashboards
7. **Configure Autoscaling**: HPA and VPA for services

## Related Documentation

- [Docker Images](../../docker/README.md)
- [Service Deployment Guide](../../../docs/deployment.md)
- [Monitoring Setup](../../../docs/monitoring.md)
- [Security Best Practices](../../../docs/security.md)

## Support

For issues or questions:
- Review Kubernetes events: `kubectl get events -n sos-app`
- Check pod logs: `kubectl logs <pod-name> -n sos-app`
- Describe resources: `kubectl describe <resource> <name> -n sos-app`
- Contact: platform-engineering@sos-app.com

---

**Last Updated**: 2025-10-29
**Maintained By**: SOS App Platform Engineering Team
**Version**: 1.0.0
