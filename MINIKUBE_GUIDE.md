# SOS App - Minikube Deployment Guide (WSL2)

Complete guide for deploying SOS App on Minikube in WSL2 environment.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Detailed Setup](#detailed-setup)
4. [Architecture](#architecture)
5. [Accessing Services](#accessing-services)
6. [Troubleshooting](#troubleshooting)
7. [Useful Commands](#useful-commands)

---

## ✅ Prerequisites

### System Requirements
- **OS**: Windows 10/11 with WSL2
- **RAM**: At least 8GB (4GB allocated to Minikube)
- **CPU**: 4+ cores recommended
- **Disk**: 20GB free space

### Required Software

#### 1. WSL2 (Windows Subsystem for Linux)

Check if WSL2 is installed:
```bash
wsl --list --verbose
```

If not installed:
```powershell
# In PowerShell (as Administrator)
wsl --install -d Ubuntu
```

#### 2. Docker (in WSL2)

```bash
# Update packages
sudo apt update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Start Docker service
sudo service docker start

# Verify
docker --version
```

#### 3. Minikube

```bash
# Download and install Minikube
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# Verify installation
minikube version
```

#### 4. kubectl

```bash
# Download kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

# Install kubectl
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Verify
kubectl version --client
```

---

## 🚀 Quick Start

### Option 1: Automated Deployment (Recommended)

```bash
# Clone the repository
git clone <your-repo-url>
cd sos-app

# Checkout the branch
git checkout claude/review-spec-and-status-011CUevCbQXh7hLdqSuuGjt8

# Run the deployment script
./deploy-minikube.sh
```

**That's it!** The script will:
- ✅ Start Minikube if not running
- ✅ Build all Docker images
- ✅ Deploy all Kubernetes resources
- ✅ Wait for services to be ready
- ✅ Display access URLs

### Option 2: Manual Step-by-Step

See [Detailed Setup](#detailed-setup) section below.

---

## 📖 Detailed Setup

### Step 1: Start Minikube

```bash
# Start Minikube with Docker driver
minikube start --driver=docker --cpus=4 --memory=4096

# Verify Minikube is running
minikube status

# Enable addons (optional but useful)
minikube addons enable metrics-server
minikube addons enable dashboard
```

### Step 2: Configure Docker Environment

```bash
# Point your shell to Minikube's Docker daemon
eval $(minikube docker-env)

# Verify you're using Minikube's Docker
docker ps  # Should show Minikube's containers
```

### Step 3: Build Docker Images

```bash
# Navigate to project directory
cd sos-app

# Build all service images
docker build -t sos-app/auth-service:latest ./services/auth-service
docker build -t sos-app/user-service:latest ./services/user-service
docker build -t sos-app/medical-service:latest ./services/medical-service

# Verify images
docker images | grep sos-app
```

### Step 4: Deploy to Kubernetes

```bash
# Create namespace
kubectl apply -f k8s/base/namespace.yaml

# Apply ConfigMap and Secrets
kubectl apply -f k8s/base/configmap.yaml
kubectl apply -f k8s/base/secrets.yaml

# Create Persistent Volume Claims
kubectl apply -f k8s/base/postgres-pvc.yaml
kubectl apply -f k8s/base/redis-pvc.yaml

# Deploy databases
kubectl apply -f k8s/base/postgres-deployment.yaml
kubectl apply -f k8s/base/redis-deployment.yaml

# Wait for databases to be ready (2-3 minutes)
kubectl wait --for=condition=ready pod -l app=postgres -n sos-app --timeout=120s
kubectl wait --for=condition=ready pod -l app=redis -n sos-app --timeout=120s

# Deploy microservices
kubectl apply -f k8s/base/auth-service-deployment.yaml
kubectl apply -f k8s/base/user-service-deployment.yaml
kubectl apply -f k8s/base/medical-service-deployment.yaml

# Wait for services to be ready (2-3 minutes)
kubectl wait --for=condition=ready pod -l app=auth-service -n sos-app --timeout=180s
kubectl wait --for=condition=ready pod -l app=user-service -n sos-app --timeout=180s
kubectl wait --for=condition=ready pod -l app=medical-service -n sos-app --timeout=180s
```

### Step 5: Verify Deployment

```bash
# Check all pods
kubectl get pods -n sos-app

# Expected output:
# NAME                              READY   STATUS    RESTARTS   AGE
# auth-service-xxx                  1/1     Running   0          2m
# medical-service-xxx               1/1     Running   0          2m
# postgres-xxx                      1/1     Running   0          3m
# redis-xxx                         1/1     Running   0          3m
# user-service-xxx                  1/1     Running   0          2m

# Check services
kubectl get svc -n sos-app

# Expected output showing NodePort services
```

---

## 🏗️ Architecture

### Kubernetes Resources

```
sos-app (namespace)
├── ConfigMap: sos-app-config
├── Secret: sos-app-secrets
│
├── Databases
│   ├── PostgreSQL
│   │   ├── Deployment (1 replica)
│   │   ├── Service (ClusterIP)
│   │   └── PVC (5Gi)
│   └── Redis
│       ├── Deployment (1 replica)
│       ├── Service (ClusterIP)
│       └── PVC (1Gi)
│
└── Microservices
    ├── Auth Service
    │   ├── Deployment (1 replica)
    │   └── Service (NodePort 30001)
    ├── User Service
    │   ├── Deployment (1 replica)
    │   └── Service (NodePort 30002)
    └── Medical Service
        ├── Deployment (1 replica)
        └── Service (NodePort 30003)
```

### Resource Allocation

| Service | CPU Request | CPU Limit | Memory Request | Memory Limit |
|---------|-------------|-----------|----------------|--------------|
| Auth    | 200m        | 500m      | 256Mi          | 512Mi        |
| User    | 200m        | 500m      | 256Mi          | 512Mi        |
| Medical | 200m        | 500m      | 256Mi          | 512Mi        |
| Postgres| 250m        | 500m      | 256Mi          | 512Mi        |
| Redis   | 100m        | 200m      | 128Mi          | 256Mi        |

**Total**: ~1 CPU, ~1.5GB RAM

---

## 🌐 Accessing Services

### Get Minikube IP

```bash
minikube ip
# Example output: 192.168.49.2
```

### Service URLs

Replace `<MINIKUBE_IP>` with the IP from above:

| Service | URL | Health Check |
|---------|-----|--------------|
| **Auth** | `http://<MINIKUBE_IP>:30001` | `http://<MINIKUBE_IP>:30001/health` |
| **User** | `http://<MINIKUBE_IP>:30002` | `http://<MINIKUBE_IP>:30002/health` |
| **Medical** | `http://<MINIKUBE_IP>:30003` | `http://<MINIKUBE_IP>:30003/health` |

### Test Health Checks

```bash
MINIKUBE_IP=$(minikube ip)

# Test Auth Service
curl http://${MINIKUBE_IP}:30001/health

# Test User Service
curl http://${MINIKUBE_IP}:30002/health

# Test Medical Service
curl http://${MINIKUBE_IP}:30003/health

# All should return: {"status":"ok"}
```

### Run Full Test Suite

```bash
# Run comprehensive tests
./test-services-k8s.sh

# Or manually specify Minikube IP
./test-services-k8s.sh $(minikube ip)
```

---

## 🔧 Troubleshooting

### Issue 1: Minikube Won't Start

**Symptoms:**
```
❌ Exiting due to GUEST_DRIVER_MISMATCH
```

**Solution:**
```bash
# Delete existing cluster
minikube delete

# Start fresh with Docker driver
minikube start --driver=docker --cpus=4 --memory=4096
```

### Issue 2: Pods Not Starting

**Check pod status:**
```bash
kubectl get pods -n sos-app
```

**View logs:**
```bash
# Replace <pod-name> with actual pod name
kubectl logs <pod-name> -n sos-app

# Example:
kubectl logs auth-service-7d8f9b4c5d-x7k2m -n sos-app
```

**Common causes:**
1. **Image not found**: Make sure you ran `eval $(minikube docker-env)` before building
2. **Database not ready**: Wait for postgres/redis to be ready first
3. **Resource constraints**: Increase Minikube resources

### Issue 3: Cannot Access Services

**Check NodePort services:**
```bash
kubectl get svc -n sos-app

# Ensure TYPE is NodePort and correct ports are listed
```

**Verify Minikube IP:**
```bash
minikube ip

# Try accessing with curl
curl http://$(minikube ip):30001/health
```

**From Windows host:**
```powershell
# In PowerShell, get WSL IP
wsl hostname -I

# Access services using WSL IP:30001, etc.
```

### Issue 4: Postgres Init Failed

**Check postgres logs:**
```bash
kubectl logs -l app=postgres -n sos-app
```

**Restart postgres:**
```bash
kubectl delete pod -l app=postgres -n sos-app
# Pod will auto-restart
```

### Issue 5: Out of Resources

**Check resource usage:**
```bash
kubectl top nodes
kubectl top pods -n sos-app
```

**Increase Minikube resources:**
```bash
minikube stop
minikube start --cpus=6 --memory=6144
```

### Issue 6: Docker Daemon Not Found

**Error:**
```
Cannot connect to the Docker daemon
```

**Solution:**
```bash
# Start Docker service
sudo service docker start

# Or configure Docker to start automatically
echo "sudo service docker start" >> ~/.bashrc
```

---

## 📚 Useful Commands

### Minikube Management

```bash
# Start Minikube
minikube start --driver=docker --cpus=4 --memory=4096

# Stop Minikube (preserves cluster)
minikube stop

# Delete cluster completely
minikube delete

# Get cluster info
minikube status
minikube ip

# Access Kubernetes dashboard
minikube dashboard

# SSH into Minikube node
minikube ssh
```

### Kubectl Commands

```bash
# View all resources
kubectl get all -n sos-app

# View pods with details
kubectl get pods -n sos-app -o wide

# View services
kubectl get svc -n sos-app

# View persistent volumes
kubectl get pvc -n sos-app

# Describe a resource
kubectl describe pod <pod-name> -n sos-app
kubectl describe svc <service-name> -n sos-app

# View logs
kubectl logs -f <pod-name> -n sos-app

# View logs for all pods of a service
kubectl logs -f -l app=auth-service -n sos-app

# Execute command in pod
kubectl exec -it <pod-name> -n sos-app -- /bin/sh

# Port forward (alternative to NodePort)
kubectl port-forward svc/auth-service 3001:3001 -n sos-app
```

### Debugging

```bash
# View events
kubectl get events -n sos-app --sort-by='.lastTimestamp'

# Check resource usage
kubectl top nodes
kubectl top pods -n sos-app

# Get YAML of deployed resource
kubectl get deployment auth-service -n sos-app -o yaml

# Edit resource on the fly
kubectl edit deployment auth-service -n sos-app

# Restart a deployment
kubectl rollout restart deployment/auth-service -n sos-app

# Check rollout status
kubectl rollout status deployment/auth-service -n sos-app
```

### Database Access

```bash
# Access PostgreSQL
kubectl exec -it <postgres-pod-name> -n sos-app -- psql -U postgres

# List databases
kubectl exec -it <postgres-pod-name> -n sos-app -- psql -U postgres -c '\l'

# Access Redis
kubectl exec -it <redis-pod-name> -n sos-app -- redis-cli

# Check Redis keys
kubectl exec -it <redis-pod-name> -n sos-app -- redis-cli KEYS '*'
```

### Cleanup

```bash
# Delete all resources in namespace
kubectl delete namespace sos-app

# Or delete specific resources
kubectl delete -f k8s/base/

# Clean up Minikube completely
minikube delete --all
```

---

## 🚀 Next Steps

### For Development

1. **Enable hot reload:**
   - Use `kubectl port-forward` to access services
   - Edit code locally
   - Rebuild and redeploy: `./deploy-minikube.sh`

2. **View logs in real-time:**
   ```bash
   kubectl logs -f -l app=auth-service -n sos-app
   ```

3. **Use Kubernetes dashboard:**
   ```bash
   minikube dashboard
   ```

### For Production

Consider:
- Using a managed Kubernetes service (EKS, GKE, AKS)
- Implementing Horizontal Pod Autoscaling (HPA)
- Adding Ingress controller for better routing
- Setting up monitoring (Prometheus, Grafana)
- Implementing proper secrets management (Vault, Sealed Secrets)
- Using Helm charts for easier deployment

---

## 📞 Support

If you encounter issues:

1. **Check logs:**
   ```bash
   kubectl logs -f -l app=<service-name> -n sos-app
   ```

2. **View events:**
   ```bash
   kubectl get events -n sos-app
   ```

3. **Check this guide's Troubleshooting section**

4. **Clean start:**
   ```bash
   kubectl delete namespace sos-app
   ./deploy-minikube.sh
   ```

---

## ✅ Success Checklist

- [ ] WSL2 installed and running
- [ ] Docker running in WSL2
- [ ] Minikube installed and started
- [ ] kubectl installed
- [ ] Repository cloned
- [ ] Docker images built in Minikube
- [ ] All pods running (`kubectl get pods -n sos-app`)
- [ ] Health checks passing
- [ ] Test script successful (`./test-services-k8s.sh`)

**Once all items are checked, your SOS App is running on Minikube!** 🎉
