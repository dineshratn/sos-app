#!/bin/bash
# =============================================================================
# SOS App - Complete AWS Deployment Script
# =============================================================================
# Purpose: Complete end-to-end deployment of SOS App to AWS using Terraform and Helm
# Usage: ./deploy-to-aws.sh [plan|deploy|destroy|status]
# =============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Configuration
TERRAFORM_DIR="./sos-app/infrastructure/terraform"
HELM_DIR="./sos-app/infrastructure/helm"
MONITORING_DIR="./sos-app/infrastructure/kubernetes/monitoring"
LOGGING_DIR="./sos-app/infrastructure/kubernetes/logging"
ENVIRONMENT="${ENVIRONMENT:-dev}"
AWS_REGION="${AWS_REGION:-us-east-1}"

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

print_section() {
    echo ""
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${MAGENTA}  $1${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# -----------------------------------------------------------------------------
# Prerequisite Checks
# -----------------------------------------------------------------------------

check_prerequisites() {
    print_header "Checking Prerequisites"

    local missing=0

    # Check required tools
    local tools=("terraform" "kubectl" "helm" "aws")

    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &>/dev/null; then
            log_error "$tool is not installed"
            missing=1
        else
            local version=$($tool version 2>/dev/null | head -n1 || echo "unknown")
            log_success "$tool is installed ($version)"
        fi
    done

    # Check AWS credentials
    if ! aws sts get-caller-identity &>/dev/null; then
        log_error "AWS credentials not configured"
        log_info "Run: aws configure"
        missing=1
    else
        local account=$(aws sts get-caller-identity --query Account --output text)
        local user=$(aws sts get-caller-identity --query Arn --output text)
        log_success "AWS credentials configured"
        log_info "  Account: $account"
        log_info "  User/Role: $user"
        log_info "  Region: $AWS_REGION"
    fi

    # Check Docker (optional but recommended)
    if command -v docker &>/dev/null; then
        log_success "Docker is installed"
    else
        log_warning "Docker not found (needed for building images)"
    fi

    if [ $missing -eq 1 ]; then
        log_error "Please install missing prerequisites"
        exit 1
    fi

    log_success "All prerequisites met"
}

# -----------------------------------------------------------------------------
# Terraform Infrastructure
# -----------------------------------------------------------------------------

terraform_init() {
    print_section "Initializing Terraform"

    cd "$TERRAFORM_DIR"

    log_step "Running terraform init..."
    terraform init \
        -backend-config="region=$AWS_REGION" \
        -backend-config="bucket=sos-app-terraform-state-$AWS_REGION" \
        -backend-config="key=$ENVIRONMENT/terraform.tfstate" \
        -backend-config="dynamodb_table=sos-app-terraform-locks"

    log_success "Terraform initialized"
    cd - > /dev/null
}

terraform_plan() {
    print_section "Planning Infrastructure Changes"

    cd "$TERRAFORM_DIR"

    log_step "Running terraform plan..."
    terraform plan \
        -var-file="environments/$ENVIRONMENT/terraform.tfvars" \
        -var="aws_region=$AWS_REGION" \
        -out=tfplan

    log_success "Terraform plan created"
    log_warning "Review the plan above before deploying"
    cd - > /dev/null
}

terraform_apply() {
    print_section "Deploying Infrastructure with Terraform"

    cd "$TERRAFORM_DIR"

    if [ ! -f "tfplan" ]; then
        log_error "No terraform plan found. Run 'plan' command first"
        cd - > /dev/null
        exit 1
    fi

    log_step "Running terraform apply..."
    terraform apply tfplan

    log_success "Infrastructure deployed"

    # Save outputs for later use
    terraform output -json > terraform-outputs.json

    log_info "Waiting for infrastructure to stabilize..."
    sleep 30

    cd - > /dev/null
}

terraform_destroy() {
    print_section "Destroying Infrastructure"

    cd "$TERRAFORM_DIR"

    log_warning "This will destroy ALL infrastructure"
    read -p "Type 'yes' to confirm destruction: " confirm

    if [ "$confirm" != "yes" ]; then
        log_info "Destruction cancelled"
        cd - > /dev/null
        return
    fi

    log_step "Running terraform destroy..."
    terraform destroy \
        -var-file="environments/$ENVIRONMENT/terraform.tfvars" \
        -var="aws_region=$AWS_REGION" \
        -auto-approve

    log_success "Infrastructure destroyed"
    cd - > /dev/null
}

# -----------------------------------------------------------------------------
# Kubernetes Configuration
# -----------------------------------------------------------------------------

configure_kubectl() {
    print_section "Configuring kubectl for EKS"

    local cluster_name=$(cd "$TERRAFORM_DIR" && terraform output -raw eks_cluster_name 2>/dev/null || echo "")

    if [ -z "$cluster_name" ]; then
        log_error "Could not get EKS cluster name from Terraform"
        exit 1
    fi

    log_step "Updating kubeconfig for cluster: $cluster_name"
    aws eks update-kubeconfig \
        --region "$AWS_REGION" \
        --name "$cluster_name"

    log_success "kubectl configured"

    # Verify connection
    log_info "Verifying cluster connection..."
    kubectl cluster-info
    kubectl get nodes
}

# -----------------------------------------------------------------------------
# Secrets Management
# -----------------------------------------------------------------------------

create_kubernetes_secrets() {
    print_section "Creating Kubernetes Secrets"

    log_step "Creating namespace..."
    kubectl create namespace sos-app 2>/dev/null || log_info "Namespace already exists"

    # Get database credentials from AWS Secrets Manager or Terraform outputs
    local db_password=""
    local redis_password=""
    local jwt_secret=""

    # Try to get from Terraform outputs
    if [ -f "$TERRAFORM_DIR/terraform-outputs.json" ]; then
        log_info "Retrieving secrets from Terraform outputs..."
        db_password=$(cd "$TERRAFORM_DIR" && terraform output -raw rds_password 2>/dev/null || echo "")
        redis_password=$(cd "$TERRAFORM_DIR" && terraform output -raw redis_auth_token 2>/dev/null || echo "")
    fi

    # Generate if not available
    if [ -z "$db_password" ]; then
        log_warning "Generating random database password"
        db_password=$(openssl rand -base64 32)
    fi

    if [ -z "$redis_password" ]; then
        log_warning "Generating random Redis password"
        redis_password=$(openssl rand -base64 32)
    fi

    if [ -z "$jwt_secret" ]; then
        log_info "Generating JWT secret"
        jwt_secret=$(openssl rand -base64 64)
    fi

    # Create secrets
    log_step "Creating database credentials secret..."
    kubectl create secret generic postgres-credentials -n sos-app \
        --from-literal=postgres-password="$db_password" \
        --from-literal=replication-password="$(openssl rand -base64 32)" \
        --dry-run=client -o yaml | kubectl apply -f -

    log_step "Creating MongoDB credentials secret..."
    kubectl create secret generic mongodb-credentials -n sos-app \
        --from-literal=root-password="$(openssl rand -base64 32)" \
        --from-literal=mongodb-password="$(openssl rand -base64 32)" \
        --dry-run=client -o yaml | kubectl apply -f -

    log_step "Creating Redis credentials secret..."
    kubectl create secret generic redis-credentials -n sos-app \
        --from-literal=redis-password="$redis_password" \
        --dry-run=client -o yaml | kubectl apply -f -

    log_step "Creating JWT secret..."
    kubectl create secret generic jwt-secret -n sos-app \
        --from-literal=jwt-secret="$jwt_secret" \
        --dry-run=client -o yaml | kubectl apply -f -

    log_success "All secrets created"
    log_warning "Store these credentials securely!"
}

# -----------------------------------------------------------------------------
# Helm Deployments
# -----------------------------------------------------------------------------

deploy_with_helm() {
    print_section "Deploying Applications with Helm"

    # Add Helm repos if needed
    log_step "Adding Helm repositories..."
    helm repo add bitnami https://charts.bitnami.com/bitnami 2>/dev/null || true
    helm repo update

    # Get infrastructure endpoints from Terraform
    local rds_endpoint=""
    local documentdb_endpoint=""
    local elasticache_endpoint=""
    local msk_bootstrap=""

    if [ -f "$TERRAFORM_DIR/terraform-outputs.json" ]; then
        log_info "Retrieving infrastructure endpoints..."
        rds_endpoint=$(cd "$TERRAFORM_DIR" && terraform output -raw rds_endpoint 2>/dev/null || echo "")
        documentdb_endpoint=$(cd "$TERRAFORM_DIR" && terraform output -raw documentdb_endpoint 2>/dev/null || echo "")
        elasticache_endpoint=$(cd "$TERRAFORM_DIR" && terraform output -raw elasticache_endpoint 2>/dev/null || echo "")
        msk_bootstrap=$(cd "$TERRAFORM_DIR" && terraform output -raw msk_bootstrap_brokers 2>/dev/null || echo "")
    fi

    # Deploy using umbrella chart
    log_step "Deploying SOS App services..."

    cd "$HELM_DIR"

    # Create values override file
    cat > aws-override-values.yaml <<EOF
global:
  environment: $ENVIRONMENT
  awsRegion: $AWS_REGION

  database:
    host: ${rds_endpoint:-postgres-service.sos-app.svc.cluster.local}
    port: 5432

  mongodb:
    host: ${documentdb_endpoint:-mongodb-service.sos-app.svc.cluster.local}
    port: 27017

  redis:
    host: ${elasticache_endpoint:-redis-service.sos-app.svc.cluster.local}
    port: 6379

  kafka:
    bootstrapServers: ${msk_bootstrap:-kafka-service.sos-app.svc.cluster.local:9092}

# Service-specific overrides can be added here
auth-service:
  enabled: true
  replicaCount: 3

user-service:
  enabled: true
  replicaCount: 3

medical-service:
  enabled: true
  replicaCount: 3

emergency-service:
  enabled: true
  replicaCount: 5

location-service:
  enabled: true
  replicaCount: 5

notification-service:
  enabled: true
  replicaCount: 3

communication-service:
  enabled: true
  replicaCount: 3

device-service:
  enabled: true
  replicaCount: 3

api-gateway:
  enabled: true
  replicaCount: 3

llm-service:
  enabled: true
  replicaCount: 2
EOF

    # Deploy umbrella chart
    helm upgrade --install sos-app ./sos-app \
        --namespace sos-app \
        --create-namespace \
        --values aws-override-values.yaml \
        --timeout 10m \
        --wait

    log_success "Applications deployed with Helm"

    cd - > /dev/null
}

# -----------------------------------------------------------------------------
# Monitoring Stack
# -----------------------------------------------------------------------------

deploy_monitoring() {
    print_section "Deploying Monitoring Stack"

    log_step "Creating monitoring namespace..."
    kubectl create namespace monitoring 2>/dev/null || log_info "Namespace already exists"

    # Deploy Prometheus
    log_step "Deploying Prometheus..."
    kubectl apply -f "$MONITORING_DIR/prometheus-config.yaml"
    kubectl apply -f "$MONITORING_DIR/prometheus-deployment.yaml"
    kubectl apply -f "$MONITORING_DIR/prometheus-rules.yaml"

    # Deploy Grafana
    log_step "Deploying Grafana..."
    kubectl apply -f "$MONITORING_DIR/grafana-deployment.yaml"
    kubectl apply -f "$MONITORING_DIR/grafana-dashboards-provisioning.yaml"

    # Deploy dashboards
    log_step "Deploying Grafana dashboards..."
    kubectl apply -f "$MONITORING_DIR/grafana-dashboards/"

    # Deploy Jaeger (development)
    log_step "Deploying Jaeger tracing..."
    kubectl apply -f "$MONITORING_DIR/jaeger/jaeger-deployment.yaml"
    kubectl apply -f "$MONITORING_DIR/jaeger/jaeger-daemonset.yaml"

    log_success "Monitoring stack deployed"

    # Get Grafana admin password
    log_info "Grafana admin password: admin (change after first login)"
}

# -----------------------------------------------------------------------------
# Logging Stack
# -----------------------------------------------------------------------------

deploy_logging() {
    print_section "Deploying Logging Stack"

    log_step "Creating logging namespace..."
    kubectl create namespace logging 2>/dev/null || log_info "Namespace already exists"

    # Deploy Elasticsearch
    log_step "Deploying Elasticsearch..."
    kubectl apply -f "$LOGGING_DIR/elasticsearch.yaml"

    log_info "Waiting for Elasticsearch to be ready (this may take 2-3 minutes)..."
    kubectl wait --for=condition=ready pod -l app=elasticsearch -n logging --timeout=300s || true

    # Deploy Logstash
    log_step "Deploying Logstash..."
    kubectl apply -f "$LOGGING_DIR/logstash.yaml"

    # Deploy Kibana
    log_step "Deploying Kibana..."
    kubectl apply -f "$LOGGING_DIR/kibana.yaml"

    # Deploy Filebeat
    log_step "Deploying Filebeat..."
    kubectl apply -f "$LOGGING_DIR/filebeat.yaml"

    log_success "Logging stack deployed"
}

# -----------------------------------------------------------------------------
# Status and Health Checks
# -----------------------------------------------------------------------------

show_deployment_status() {
    print_section "Deployment Status"

    echo ""
    log_info "Cluster Information:"
    kubectl cluster-info

    echo ""
    log_info "Nodes:"
    kubectl get nodes -o wide

    echo ""
    log_info "SOS App Namespace:"
    kubectl get all -n sos-app

    echo ""
    log_info "Monitoring Namespace:"
    kubectl get all -n monitoring

    echo ""
    log_info "Logging Namespace:"
    kubectl get all -n logging

    echo ""
    log_info "Ingresses:"
    kubectl get ingress -A

    echo ""
    log_info "Persistent Volumes:"
    kubectl get pv,pvc -A
}

get_access_urls() {
    print_section "Access URLs"

    local grafana_url=$(kubectl get ingress -n monitoring grafana-ingress -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "pending")
    local jaeger_url=$(kubectl get ingress -n monitoring jaeger-ingress -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "pending")
    local kibana_url=$(kubectl get ingress -n logging kibana-ingress -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "pending")
    local api_url=$(kubectl get ingress -n sos-app api-gateway-ingress -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "pending")

    cat <<EOF

${GREEN}Access URLs:${NC}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${CYAN}API Gateway:${NC}       http://$api_url
${CYAN}Grafana:${NC}          http://$grafana_url
${CYAN}Jaeger UI:${NC}        http://$jaeger_url
${CYAN}Kibana:${NC}           http://$kibana_url

${YELLOW}Note: It may take 5-10 minutes for load balancers to be fully provisioned${NC}

Port Forwarding (Alternative Access):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${BLUE}kubectl port-forward -n monitoring svc/grafana 3000:3000${NC}
${BLUE}kubectl port-forward -n monitoring svc/jaeger-query 16686:16686${NC}
${BLUE}kubectl port-forward -n logging svc/kibana 5601:5601${NC}
${BLUE}kubectl port-forward -n sos-app svc/api-gateway 8080:80${NC}

Credentials:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${CYAN}Grafana:${NC}   admin / admin (change on first login)

EOF
}

# -----------------------------------------------------------------------------
# Complete Deployment
# -----------------------------------------------------------------------------

full_deployment() {
    print_header "SOS App - Complete AWS Deployment"

    log_info "Environment: $ENVIRONMENT"
    log_info "Region: $AWS_REGION"
    echo ""

    # Step 1: Prerequisites
    check_prerequisites

    # Step 2: Terraform Infrastructure
    terraform_init
    terraform_plan

    read -p "$(echo -e ${YELLOW}Proceed with infrastructure deployment? [y/N]: ${NC})" proceed
    if [[ ! $proceed =~ ^[Yy]$ ]]; then
        log_error "Deployment cancelled"
        exit 1
    fi

    terraform_apply

    # Step 3: Kubernetes Setup
    configure_kubectl

    # Step 4: Secrets
    create_kubernetes_secrets

    # Step 5: Application Deployment
    deploy_with_helm

    # Step 6: Monitoring
    deploy_monitoring

    # Step 7: Logging
    deploy_logging

    # Final Status
    print_header "Deployment Complete! 🎉"

    show_deployment_status
    get_access_urls

    cat <<EOF

${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}
${GREEN}  Deployment Successful!${NC}
${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

Next Steps:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Wait for all pods to be ready:
   ${BLUE}kubectl get pods -n sos-app -w${NC}

2. Check application health:
   ${BLUE}kubectl get pods -n sos-app | grep -v Running${NC}

3. View logs:
   ${BLUE}kubectl logs -n sos-app -l app=api-gateway${NC}

4. Test API:
   ${BLUE}curl http://\$API_URL/health${NC}

5. Access monitoring dashboards using URLs above

Troubleshooting:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  View pod status:    ${BLUE}kubectl get pods -n sos-app${NC}
  Describe pod:       ${BLUE}kubectl describe pod <pod-name> -n sos-app${NC}
  View logs:          ${BLUE}kubectl logs <pod-name> -n sos-app${NC}
  View events:        ${BLUE}kubectl get events -n sos-app --sort-by='.lastTimestamp'${NC}

Documentation:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Terraform:          ${BLUE}./sos-app/infrastructure/terraform/README.md${NC}
  Helm:               ${BLUE}./sos-app/infrastructure/helm/README.md${NC}
  Monitoring:         ${BLUE}./sos-app/infrastructure/kubernetes/monitoring/README.md${NC}

${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

EOF
}

# -----------------------------------------------------------------------------
# Script Entry Point
# -----------------------------------------------------------------------------

COMMAND=${1:-deploy}

case $COMMAND in
    plan)
        check_prerequisites
        terraform_init
        terraform_plan
        ;;
    deploy|full)
        full_deployment
        ;;
    destroy)
        check_prerequisites
        terraform_destroy
        ;;
    status)
        show_deployment_status
        get_access_urls
        ;;
    terraform-only)
        check_prerequisites
        terraform_init
        terraform_apply
        configure_kubectl
        ;;
    helm-only)
        check_prerequisites
        configure_kubectl
        create_kubernetes_secrets
        deploy_with_helm
        ;;
    monitoring-only)
        check_prerequisites
        configure_kubectl
        deploy_monitoring
        ;;
    logging-only)
        check_prerequisites
        configure_kubectl
        deploy_logging
        ;;
    urls)
        get_access_urls
        ;;
    *)
        cat <<EOF
Usage: $0 {plan|deploy|destroy|status|terraform-only|helm-only|monitoring-only|logging-only|urls}

Commands:
  plan              - Preview infrastructure changes (Terraform plan)
  deploy            - Complete deployment (infrastructure + applications + monitoring)
  destroy           - Destroy all infrastructure
  status            - Show current deployment status
  terraform-only    - Deploy only Terraform infrastructure
  helm-only         - Deploy only Helm charts (assumes infrastructure exists)
  monitoring-only   - Deploy only monitoring stack
  logging-only      - Deploy only logging stack
  urls              - Show access URLs

Environment Variables:
  ENVIRONMENT       - Deployment environment (dev/staging/prod) [default: dev]
  AWS_REGION        - AWS region [default: us-east-1]

Examples:
  # Plan deployment
  ./deploy-to-aws.sh plan

  # Full deployment to dev
  ENVIRONMENT=dev AWS_REGION=us-west-2 ./deploy-to-aws.sh deploy

  # Deploy only applications
  ./deploy-to-aws.sh helm-only

  # Check status
  ./deploy-to-aws.sh status

  # Get access URLs
  ./deploy-to-aws.sh urls

EOF
        exit 1
        ;;
esac
