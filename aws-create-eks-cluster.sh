#!/bin/bash
# =============================================================================
# SOS App - AWS EKS Cluster Creation Script
# =============================================================================
# Purpose: Create an EKS cluster for SOS App deployment
# Usage: ./aws-create-eks-cluster.sh
# =============================================================================

set -euo pipefail

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
CLUSTER_NAME="${EKS_CLUSTER_NAME:-sos-app-cluster}"
REGION="${AWS_REGION:-us-east-1}"
NODE_TYPE="${EKS_NODE_TYPE:-t3.xlarge}"
NODE_COUNT="${EKS_NODE_COUNT:-3}"
MIN_NODES="${EKS_MIN_NODES:-3}"
MAX_NODES="${EKS_MAX_NODES:-10}"

print_header() {
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header "SOS App - EKS Cluster Creation"

# Check prerequisites
log_info "Checking prerequisites..."

if ! command -v aws &> /dev/null; then
    log_error "AWS CLI is not installed"
    exit 1
fi

if ! command -v eksctl &> /dev/null; then
    log_error "eksctl is not installed"
    echo ""
    echo "Install eksctl:"
    echo ""
    echo "For Linux/WSL2:"
    echo '  curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp'
    echo "  sudo mv /tmp/eksctl /usr/local/bin"
    echo ""
    echo "For macOS:"
    echo "  brew install eksctl"
    exit 1
fi

if ! command -v kubectl &> /dev/null; then
    log_error "kubectl is not installed"
    exit 1
fi

log_success "All prerequisites installed"

# Get AWS account info
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
USER_ARN=$(aws sts get-caller-identity --query Arn --output text)

echo ""
log_info "AWS Account: $ACCOUNT_ID"
log_info "User/Role: $USER_ARN"
log_info "Region: $REGION"
echo ""

# Display configuration
print_header "Cluster Configuration"

cat <<EOF
Cluster Name:    ${CYAN}$CLUSTER_NAME${NC}
Region:          ${CYAN}$REGION${NC}
Node Type:       ${CYAN}$NODE_TYPE${NC} (4 vCPUs, 16GB RAM)
Initial Nodes:   ${CYAN}$NODE_COUNT${NC}
Min Nodes:       ${CYAN}$MIN_NODES${NC}
Max Nodes:       ${CYAN}$MAX_NODES${NC}

${YELLOW}Estimated Monthly Cost: \$450-550${NC}
  • EKS Control Plane: \$73/month
  • EC2 Nodes (3x t3.xlarge): \$300-350/month
  • EBS Volumes: \$50-80/month
  • Data Transfer: \$20-50/month
EOF

echo ""
read -p "Continue with cluster creation? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    log_info "Cluster creation cancelled"
    exit 0
fi

# Create cluster config
print_header "Step 1: Creating Cluster Configuration"

log_info "Generating eksctl cluster config..."

cat > eks-cluster-config.yaml <<EOF
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: $CLUSTER_NAME
  region: $REGION
  version: "1.28"

iam:
  withOIDC: true

managedNodeGroups:
  - name: sos-app-workers
    instanceType: $NODE_TYPE
    desiredCapacity: $NODE_COUNT
    minSize: $MIN_NODES
    maxSize: $MAX_NODES
    volumeSize: 100
    volumeType: gp3
    labels:
      role: worker
      app: sos-app
    tags:
      k8s.io/cluster-autoscaler/enabled: "true"
      k8s.io/cluster-autoscaler/$CLUSTER_NAME: "owned"
    iam:
      withAddonPolicies:
        autoScaler: true
        ebs: true
        efs: true
        albIngress: true
        cloudWatch: true

addons:
  - name: vpc-cni
    version: latest
  - name: coredns
    version: latest
  - name: kube-proxy
    version: latest
  - name: aws-ebs-csi-driver
    version: latest

cloudWatch:
  clusterLogging:
    enableTypes:
      - api
      - audit
      - authenticator
      - controllerManager
      - scheduler
EOF

log_success "Cluster config created: eks-cluster-config.yaml"

# Create cluster
print_header "Step 2: Creating EKS Cluster"

log_warning "This will take 15-20 minutes..."
log_info "Starting cluster creation..."

eksctl create cluster -f eks-cluster-config.yaml

log_success "EKS cluster created!"

# Update kubeconfig
print_header "Step 3: Configuring kubectl"

log_info "Updating kubeconfig..."
aws eks update-kubeconfig --region $REGION --name $CLUSTER_NAME

log_success "kubectl configured"

# Verify cluster
log_info "Verifying cluster..."
kubectl cluster-info
kubectl get nodes

# Install cluster autoscaler
print_header "Step 4: Installing Cluster Autoscaler"

log_info "Installing cluster autoscaler..."

kubectl apply -f https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/cloudprovider/aws/examples/cluster-autoscaler-autodiscover.yaml

kubectl -n kube-system annotate deployment.apps/cluster-autoscaler \
    cluster-autoscaler.kubernetes.io/safe-to-evict="false"

kubectl -n kube-system set image deployment.apps/cluster-autoscaler \
    cluster-autoscaler=k8s.gcr.io/autoscaling/cluster-autoscaler:v1.28.0

log_success "Cluster autoscaler installed"

# Install metrics server
print_header "Step 5: Installing Metrics Server"

log_info "Installing metrics server..."
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

log_success "Metrics server installed"

# Install AWS Load Balancer Controller
print_header "Step 6: Installing AWS Load Balancer Controller"

log_info "Creating IAM policy..."

curl -o iam-policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/main/docs/install/iam_policy.json

aws iam create-policy \
    --policy-name AWSLoadBalancerControllerIAMPolicy \
    --policy-document file://iam-policy.json \
    2>/dev/null || log_warning "Policy already exists"

rm iam-policy.json

log_info "Creating IAM service account..."
eksctl create iamserviceaccount \
    --cluster=$CLUSTER_NAME \
    --namespace=kube-system \
    --name=aws-load-balancer-controller \
    --attach-policy-arn=arn:aws:iam::$ACCOUNT_ID:policy/AWSLoadBalancerControllerIAMPolicy \
    --approve \
    --region=$REGION \
    2>/dev/null || log_warning "Service account already exists"

log_info "Installing load balancer controller..."
kubectl apply -k "github.com/aws/eks-charts/stable/aws-load-balancer-controller/crds?ref=master"

helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
    -n kube-system \
    --set clusterName=$CLUSTER_NAME \
    --set serviceAccount.create=false \
    --set serviceAccount.name=aws-load-balancer-controller \
    2>/dev/null || helm upgrade aws-load-balancer-controller eks/aws-load-balancer-controller \
    -n kube-system \
    --set clusterName=$CLUSTER_NAME \
    --set serviceAccount.create=false \
    --set serviceAccount.name=aws-load-balancer-controller

log_success "AWS Load Balancer Controller installed"

# Create storage class
print_header "Step 7: Creating Storage Classes"

log_info "Creating gp3 storage class..."

kubectl apply -f - <<EOF
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp3
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  encrypted: "true"
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
EOF

# Remove old default
kubectl annotate storageclass gp2 storageclass.kubernetes.io/is-default-class- 2>/dev/null || true

log_success "Storage class configured"

# Summary
print_header "Cluster Creation Complete!"

cat <<EOF
${GREEN}✓ EKS Cluster successfully created!${NC}

Cluster Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Name:     ${CYAN}$CLUSTER_NAME${NC}
  Region:   ${CYAN}$REGION${NC}
  Endpoint: ${CYAN}$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')${NC}

Nodes:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
$(kubectl get nodes)

Installed Components:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ Cluster Autoscaler
  ✓ Metrics Server
  ✓ AWS Load Balancer Controller
  ✓ AWS EBS CSI Driver
  ✓ gp3 Storage Class (default)

Next Steps:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. Deploy SOS App:       ${BLUE}./aws-deploy.sh deploy${NC}
  2. Verify deployment:    ${BLUE}./validate-deployment.sh${NC}
  3. Monitor cluster:      ${BLUE}kubectl get pods -A${NC}

Access the cluster:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ${BLUE}kubectl cluster-info${NC}
  ${BLUE}kubectl get nodes${NC}
  ${BLUE}kubectl top nodes${NC}

Delete the cluster (when done):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ${BLUE}eksctl delete cluster --name $CLUSTER_NAME --region $REGION${NC}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF

log_success "Ready to deploy SOS App! 🚀"
