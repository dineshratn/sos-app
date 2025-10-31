#!/bin/bash
# =============================================================================
# SOS App - GCP/GKE Deployment Script
# =============================================================================
# Purpose: Deploy Phase 1 infrastructure to Google Kubernetes Engine
# Usage: ./gcp-deploy.sh [deploy|status|clean]
# =============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

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

wait_for_deployment() {
    local namespace=$1
    local deployment=$2
    local timeout=${3:-300}

    log_info "Waiting for deployment $deployment..."
    if kubectl wait --for=condition=available --timeout="${timeout}s" \
        deployment/"$deployment" -n "$namespace" 2>/dev/null; then
        log_success "Deployment $deployment is ready"
        return 0
    else
        log_warning "Deployment $deployment timeout"
        return 1
    fi
}

wait_for_statefulset() {
    local namespace=$1
    local statefulset=$2
    local replicas=${3:-3}
    local timeout=${4:-300}

    log_info "Waiting for statefulset $statefulset..."
    local elapsed=0
    while [ $elapsed -lt $timeout ]; do
        local ready=$(kubectl get statefulset "$statefulset" -n "$namespace" \
            -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")

        if [ "$ready" -ge "$replicas" ]; then
            log_success "StatefulSet $statefulset is ready ($ready/$replicas)"
            return 0
        fi

        sleep 10
        elapsed=$((elapsed + 10))
    done

    log_warning "StatefulSet $statefulset timeout ($ready/$replicas ready)"
    return 1
}

# -----------------------------------------------------------------------------
# Main Functions
# -----------------------------------------------------------------------------

check_prerequisites() {
    print_header "Checking Prerequisites"

    local missing=0

    if ! command -v kubectl &>/dev/null; then
        log_error "kubectl is not installed"
        missing=1
    else
        log_success "kubectl is installed"
    fi

    if ! command -v gcloud &>/dev/null; then
        log_error "gcloud SDK is not installed"
        log_info "Install from: https://cloud.google.com/sdk/docs/install"
        missing=1
    else
        log_success "gcloud SDK is installed"
    fi

    # Check kubectl connection
    if kubectl cluster-info &>/dev/null; then
        log_success "kubectl connected to cluster"
        local context=$(kubectl config current-context)
        log_info "Current context: $context"
    else
        log_error "kubectl cannot connect to cluster"
        log_info "Run: gcloud container clusters get-credentials CLUSTER_NAME --region REGION"
        missing=1
    fi

    if [ $missing -eq 1 ]; then
        log_error "Please install missing prerequisites"
        exit 1
    fi

    log_success "All prerequisites met"
}

verify_secrets() {
    print_header "Verifying Secrets"

    log_info "Checking for required secrets..."

    local secrets_missing=0

    if ! kubectl get secret postgres-credentials -n sos-app &>/dev/null; then
        log_warning "postgres-credentials secret not found"
        secrets_missing=1
    fi

    if ! kubectl get secret mongodb-credentials -n sos-app &>/dev/null; then
        log_warning "mongodb-credentials secret not found"
        secrets_missing=1
    fi

    if ! kubectl get secret redis-credentials -n sos-app &>/dev/null; then
        log_warning "redis-credentials secret not found"
        secrets_missing=1
    fi

    if [ $secrets_missing -eq 1 ]; then
        log_warning "Some secrets are missing. Creating default secrets..."
        create_default_secrets
    else
        log_success "All required secrets exist"
    fi
}

create_default_secrets() {
    log_step "Creating default secrets (CHANGE THESE IN PRODUCTION!)..."

    kubectl create secret generic postgres-credentials -n sos-app \
        --from-literal=postgres-password=$(openssl rand -base64 32) \
        --from-literal=replication-password=$(openssl rand -base64 32) \
        --dry-run=client -o yaml | kubectl apply -f - || true

    kubectl create secret generic mongodb-credentials -n sos-app \
        --from-literal=root-password=$(openssl rand -base64 32) \
        --from-literal=mongodb-password=$(openssl rand -base64 32) \
        --dry-run=client -o yaml | kubectl apply -f - || true

    kubectl create secret generic redis-credentials -n sos-app \
        --from-literal=redis-password=$(openssl rand -base64 32) \
        --dry-run=client -o yaml | kubectl apply -f - || true

    log_success "Default secrets created"
    log_warning "Remember to update these secrets with secure values!"
}

deploy_infrastructure() {
    print_header "Deploying Phase 1 Infrastructure"

    # Step 1: Namespace
    log_step "Creating namespace..."
    kubectl apply -f infrastructure/kubernetes/base/namespace.yaml
    log_success "Namespace created"

    # Step 2: ConfigMaps
    log_step "Creating ConfigMaps..."
    kubectl apply -f infrastructure/kubernetes/base/configmap.yaml
    log_success "ConfigMaps created"

    # Step 3: Verify/Create Secrets
    verify_secrets

    # Step 4: Databases
    log_step "Deploying databases..."

    kubectl apply -f infrastructure/kubernetes/base/postgres-statefulset.yaml
    kubectl apply -f infrastructure/kubernetes/base/mongodb-statefulset.yaml
    kubectl apply -f infrastructure/kubernetes/base/timescale-statefulset.yaml
    kubectl apply -f infrastructure/kubernetes/base/redis-deployment.yaml
    kubectl apply -f infrastructure/kubernetes/base/redis-pubsub-deployment.yaml

    log_info "Waiting for databases to initialize (this may take 2-3 minutes)..."
    sleep 60

    # Step 5: Message Brokers
    log_step "Deploying Zookeeper..."
    kubectl apply -f infrastructure/kubernetes/base/zookeeper-statefulset.yaml

    log_info "Waiting for Zookeeper to be ready..."
    sleep 45

    log_step "Deploying Kafka..."
    kubectl apply -f infrastructure/kubernetes/base/kafka-statefulset.yaml

    log_step "Deploying Schema Registry..."
    kubectl apply -f infrastructure/kubernetes/base/schema-registry-deployment.yaml

    log_step "Deploying MQTT Broker..."
    kubectl apply -f infrastructure/kubernetes/base/mqtt-deployment.yaml

    log_success "All deployments created"

    # Step 6: Initialize Kafka Topics
    initialize_kafka_topics

    print_header "Deployment Summary"
    show_status
}

initialize_kafka_topics() {
    print_header "Initializing Kafka Topics"

    log_info "Waiting for Kafka to be fully ready..."
    sleep 60

    log_step "Creating Kafka topics initialization job..."

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
          cat > /tmp/init.sh << 'SCRIPT'
$(cat infrastructure/kubernetes/base/kafka-topics-init.sh)
SCRIPT
          chmod +x /tmp/init.sh
          /tmp/init.sh
        env:
        - name: KAFKA_BOOTSTRAP_SERVERS
          value: "kafka-service.sos-app.svc.cluster.local:9092"
EOF

    log_success "Kafka topics initialization job created"
    log_info "Monitor with: kubectl logs -n sos-app job/kafka-topics-init -f"
}

show_status() {
    print_header "Deployment Status"

    echo ""
    log_info "Nodes:"
    kubectl get nodes

    echo ""
    log_info "Namespaces:"
    kubectl get namespace sos-app

    echo ""
    log_info "Pods (sos-app):"
    kubectl get pods -n sos-app -o wide

    echo ""
    log_info "Services:"
    kubectl get svc -n sos-app

    echo ""
    log_info "StatefulSets:"
    kubectl get statefulset -n sos-app

    echo ""
    log_info "Deployments:"
    kubectl get deployment -n sos-app

    echo ""
    log_info "Persistent Volume Claims:"
    kubectl get pvc -n sos-app

    echo ""
    log_info "Storage Classes:"
    kubectl get storageclass
}

clean_deployment() {
    print_header "Cleaning Deployment"

    log_warning "This will delete all resources in the sos-app namespace"
    read -p "Are you sure? Type 'yes' to confirm: " confirm

    if [ "$confirm" != "yes" ]; then
        log_info "Cleanup cancelled"
        return
    fi

    log_step "Deleting namespace (this will delete all resources)..."
    kubectl delete namespace sos-app --wait=true 2>/dev/null || log_warning "Namespace not found"

    log_success "Cleanup completed"
}

# -----------------------------------------------------------------------------
# Script Entry Point
# -----------------------------------------------------------------------------

COMMAND=${1:-deploy}

case $COMMAND in
    deploy)
        check_prerequisites
        deploy_infrastructure
        echo ""
        log_success "=========================================="
        log_success "Deployment Complete!"
        log_success "=========================================="
        echo ""
        log_info "Next steps:"
        log_info "  1. Verify deployment: ./gcp-deploy.sh status"
        log_info "  2. Run validation: ./validate-deployment.sh"
        log_info "  3. View logs: kubectl logs -n sos-app <pod-name>"
        echo ""
        ;;
    status)
        show_status
        ;;
    clean)
        clean_deployment
        ;;
    *)
        echo "Usage: $0 {deploy|status|clean}"
        echo ""
        echo "Commands:"
        echo "  deploy  - Deploy all Phase 1 infrastructure to GKE"
        echo "  status  - Show current deployment status"
        echo "  clean   - Remove all deployed resources"
        exit 1
        ;;
esac
