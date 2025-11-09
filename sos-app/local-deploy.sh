#!/bin/bash
# =============================================================================
# SOS App - Local Deployment Script
# =============================================================================
# Purpose: Deploy Phase 1 infrastructure to local Minikube cluster
# Usage: ./local-deploy.sh [start|stop|restart|status|clean]
# Requirements: Docker, Minikube, kubectl
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
MINIKUBE_MEMORY="${MINIKUBE_MEMORY:-6144}"  # 6GB (adjusted for WSL2)
MINIKUBE_CPUS="${MINIKUBE_CPUS:-4}"
MINIKUBE_DISK="${MINIKUBE_DISK:-50g}"
MINIKUBE_DRIVER="${MINIKUBE_DRIVER:-docker}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

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

log_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

print_header() {
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Wait for deployment to be ready
wait_for_deployment() {
    local namespace=$1
    local deployment=$2
    local timeout=${3:-300}

    log_info "Waiting for deployment $deployment in namespace $namespace..."
    if kubectl wait --for=condition=available --timeout="${timeout}s" \
        deployment/"$deployment" -n "$namespace" 2>/dev/null; then
        log_success "Deployment $deployment is ready"
        return 0
    else
        log_warning "Deployment $deployment is not ready yet"
        return 1
    fi
}

# Wait for statefulset to be ready
wait_for_statefulset() {
    local namespace=$1
    local statefulset=$2
    local replicas=${3:-1}
    local timeout=${4:-300}

    log_info "Waiting for statefulset $statefulset in namespace $namespace..."
    local elapsed=0
    while [ $elapsed -lt $timeout ]; do
        local ready=$(kubectl get statefulset "$statefulset" -n "$namespace" \
            -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")

        if [ "$ready" -ge "$replicas" ]; then
            log_success "StatefulSet $statefulset is ready ($ready/$replicas)"
            return 0
        fi

        sleep 5
        elapsed=$((elapsed + 5))
    done

    log_warning "StatefulSet $statefulset is not fully ready yet ($ready/$replicas)"
    return 1
}

# -----------------------------------------------------------------------------
# Main Functions
# -----------------------------------------------------------------------------

check_prerequisites() {
    print_header "Checking Prerequisites"

    local missing=0

    if ! command_exists docker; then
        log_error "Docker is not installed"
        missing=1
    else
        log_success "Docker is installed: $(docker --version)"
    fi

    if ! command_exists kubectl; then
        log_error "kubectl is not installed"
        missing=1
    else
        log_success "kubectl is installed: $(kubectl version --client --short 2>/dev/null || kubectl version --client)"
    fi

    if ! command_exists minikube; then
        log_error "Minikube is not installed"
        missing=1
    else
        log_success "Minikube is installed: $(minikube version --short)"
    fi

    if [ $missing -eq 1 ]; then
        log_error "Please install missing prerequisites"
        exit 1
    fi

    log_success "All prerequisites are installed"
}

start_minikube() {
    print_header "Starting Minikube"

    local status=$(minikube status -f '{{.Host}}' 2>/dev/null || echo "Stopped")

    if [ "$status" = "Running" ]; then
        log_info "Minikube is already running"
        return 0
    fi

    log_info "Starting Minikube with:"
    log_info "  Memory: ${MINIKUBE_MEMORY}MB"
    log_info "  CPUs: ${MINIKUBE_CPUS}"
    log_info "  Disk: ${MINIKUBE_DISK}"
    log_info "  Driver: ${MINIKUBE_DRIVER}"

    minikube start \
        --memory="${MINIKUBE_MEMORY}" \
        --cpus="${MINIKUBE_CPUS}" \
        --disk-size="${MINIKUBE_DISK}" \
        --driver="${MINIKUBE_DRIVER}" \
        --kubernetes-version=stable

    log_success "Minikube started successfully"

    # Enable addons
    log_info "Enabling Minikube addons..."
    minikube addons enable metrics-server
    minikube addons enable dashboard
    # Skip ingress for now (can cause network issues in WSL2)
    # minikube addons enable ingress

    log_success "Minikube addons enabled"
}

deploy_namespace() {
    print_header "Step 1: Creating Namespace"

    log_step "Applying namespace configuration..."
    kubectl apply -f infrastructure/kubernetes/base/namespace.yaml

    log_success "Namespace created"
}

deploy_configmaps_secrets() {
    print_header "Step 2: Deploying ConfigMaps and Secrets"

    log_step "Applying ConfigMap..."
    kubectl apply -f infrastructure/kubernetes/base/configmap.yaml

    log_step "Creating secrets from template..."
    # For local testing, create basic secrets
    kubectl create secret generic sos-app-secrets -n sos-app \
        --from-literal=postgres-password=postgres123 \
        --from-literal=mongodb-password=mongo123 \
        --from-literal=redis-password=redis123 \
        --from-literal=jwt-secret=local-jwt-secret-key-change-in-production \
        --dry-run=client -o yaml | kubectl apply -f -

    log_success "ConfigMaps and Secrets deployed"
}

deploy_databases() {
    print_header "Step 3: Deploying Databases"

    log_step "Deploying PostgreSQL..."
    kubectl apply -f infrastructure/kubernetes/base/postgres-statefulset.yaml

    log_step "Deploying TimescaleDB..."
    kubectl apply -f infrastructure/kubernetes/base/timescale-statefulset.yaml

    log_step "Deploying MongoDB..."
    kubectl apply -f infrastructure/kubernetes/base/mongodb-statefulset.yaml

    log_step "Deploying Redis (caching)..."
    kubectl apply -f infrastructure/kubernetes/base/redis-deployment.yaml

    log_step "Deploying Redis Pub/Sub..."
    kubectl apply -f infrastructure/kubernetes/base/redis-pubsub-deployment.yaml

    log_info "Waiting for databases to be ready (this may take a few minutes)..."

    # Note: For local testing with limited resources, we'll wait but not fail if not ready
    wait_for_statefulset sos-app postgres 1 || log_warning "PostgreSQL not fully ready, continuing..."
    wait_for_statefulset sos-app mongodb 1 || log_warning "MongoDB not fully ready, continuing..."
    wait_for_deployment sos-app redis || log_warning "Redis not fully ready, continuing..."

    log_success "Databases deployed"
}

deploy_message_brokers() {
    print_header "Step 4: Deploying Message Brokers"

    log_step "Deploying Zookeeper..."
    kubectl apply -f infrastructure/kubernetes/base/zookeeper-statefulset.yaml

    log_info "Waiting for Zookeeper to be ready..."
    sleep 10

    log_step "Deploying Kafka..."
    kubectl apply -f infrastructure/kubernetes/base/kafka-statefulset.yaml

    log_step "Deploying Schema Registry..."
    kubectl apply -f infrastructure/kubernetes/base/schema-registry-deployment.yaml

    log_step "Deploying MQTT Broker..."
    kubectl apply -f infrastructure/kubernetes/base/mqtt-deployment.yaml

    log_info "Waiting for message brokers to be ready (this may take a few minutes)..."
    wait_for_statefulset sos-app zookeeper 1 || log_warning "Zookeeper not fully ready, continuing..."
    wait_for_statefulset sos-app kafka 1 || log_warning "Kafka not fully ready, continuing..."

    log_success "Message brokers deployed"
}

initialize_kafka_topics() {
    print_header "Step 5: Initializing Kafka Topics"

    log_info "Waiting for Kafka to be fully ready before creating topics..."
    sleep 30

    log_step "Creating Kafka initialization job..."

    # Create a Kubernetes Job to run the topic initialization
    cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: kafka-topics-init
  namespace: sos-app
spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: kafka-topics-init
        image: confluentinc/cp-kafka:7.5.0
        command:
        - /bin/bash
        - -c
        - |
          # Copy and run the initialization script
          cat > /tmp/init.sh << 'SCRIPT'
$(cat infrastructure/kubernetes/base/kafka-topics-init.sh)
SCRIPT
          chmod +x /tmp/init.sh
          /tmp/init.sh
        env:
        - name: KAFKA_BOOTSTRAP_SERVERS
          value: "kafka-service.sos-app.svc.cluster.local:9092"
EOF

    log_info "Kafka topics initialization job created"
    log_info "You can check the logs with: kubectl logs -n sos-app job/kafka-topics-init"

    log_success "Kafka topics initialization started"
}

show_status() {
    print_header "Deployment Status"

    log_info "Namespace:"
    kubectl get namespace sos-app 2>/dev/null || log_warning "Namespace not found"

    echo ""
    log_info "ConfigMaps:"
    kubectl get configmap -n sos-app 2>/dev/null || log_warning "No ConfigMaps found"

    echo ""
    log_info "Secrets:"
    kubectl get secrets -n sos-app 2>/dev/null || log_warning "No Secrets found"

    echo ""
    log_info "StatefulSets:"
    kubectl get statefulset -n sos-app 2>/dev/null || log_warning "No StatefulSets found"

    echo ""
    log_info "Deployments:"
    kubectl get deployment -n sos-app 2>/dev/null || log_warning "No Deployments found"

    echo ""
    log_info "Services:"
    kubectl get service -n sos-app 2>/dev/null || log_warning "No Services found"

    echo ""
    log_info "Pods:"
    kubectl get pods -n sos-app 2>/dev/null || log_warning "No Pods found"

    echo ""
    log_info "Persistent Volume Claims:"
    kubectl get pvc -n sos-app 2>/dev/null || log_warning "No PVCs found"
}

stop_minikube() {
    print_header "Stopping Minikube"

    log_info "Stopping Minikube cluster..."
    minikube stop

    log_success "Minikube stopped"
}

clean_deployment() {
    print_header "Cleaning Deployment"

    log_warning "This will delete all resources in the sos-app namespace"
    read -p "Are you sure? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        log_info "Cleanup cancelled"
        return
    fi

    log_step "Deleting namespace (this will delete all resources)..."
    kubectl delete namespace sos-app --wait=true 2>/dev/null || log_warning "Namespace not found"

    log_success "Cleanup completed"
}

full_deploy() {
    check_prerequisites
    start_minikube
    deploy_namespace
    deploy_configmaps_secrets
    deploy_databases
    deploy_message_brokers
    initialize_kafka_topics

    print_header "Deployment Complete!"

    log_success "Phase 1 infrastructure deployed successfully!"
    echo ""
    log_info "Next steps:"
    log_info "  1. Check status: ./local-deploy.sh status"
    log_info "  2. View dashboard: minikube dashboard"
    log_info "  3. View logs: kubectl logs -n sos-app <pod-name>"
    log_info "  4. Access services: Use 'minikube service' or port-forwarding"
    echo ""
}

# -----------------------------------------------------------------------------
# Script Entry Point
# -----------------------------------------------------------------------------

COMMAND=${1:-start}

case $COMMAND in
    start)
        full_deploy
        ;;
    stop)
        stop_minikube
        ;;
    restart)
        stop_minikube
        full_deploy
        ;;
    status)
        show_status
        ;;
    clean)
        clean_deployment
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|clean}"
        echo ""
        echo "Commands:"
        echo "  start   - Start Minikube and deploy all Phase 1 infrastructure"
        echo "  stop    - Stop Minikube cluster"
        echo "  restart - Stop and restart everything"
        echo "  status  - Show deployment status"
        echo "  clean   - Remove all deployed resources"
        exit 1
        ;;
esac
