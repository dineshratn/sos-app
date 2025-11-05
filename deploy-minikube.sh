#!/bin/bash

#############################################
# SOS App - Minikube Deployment Script
#############################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if Minikube is running
check_minikube() {
    print_header "Checking Minikube Status"

    if ! command -v minikube &> /dev/null; then
        print_error "Minikube is not installed!"
        echo "Please install Minikube: https://minikube.sigs.k8s.io/docs/start/"
        exit 1
    fi

    if ! minikube status &> /dev/null; then
        print_warning "Minikube is not running. Starting Minikube..."
        minikube start --driver=docker --cpus=4 --memory=4096
        print_success "Minikube started successfully"
    else
        print_success "Minikube is already running"
    fi

    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed!"
        echo "Please install kubectl: https://kubernetes.io/docs/tasks/tools/"
        exit 1
    fi

    print_success "kubectl is installed"
}

# Build Docker images in Minikube's Docker daemon
build_images() {
    print_header "Building Docker Images in Minikube"

    # Point to Minikube's Docker daemon
    eval $(minikube docker-env)

    print_info "Building Auth Service..."
    docker build -t sos-app/auth-service:latest ./services/auth-service
    print_success "Auth Service built"

    print_info "Building User Service..."
    docker build -t sos-app/user-service:latest ./services/user-service
    print_success "User Service built"

    print_info "Building Medical Service..."
    docker build -t sos-app/medical-service:latest ./services/medical-service
    print_success "Medical Service built"

    print_success "All images built successfully"
}

# Deploy to Kubernetes
deploy_k8s() {
    print_header "Deploying to Kubernetes"

    # Create namespace
    print_info "Creating namespace..."
    kubectl apply -f k8s/base/namespace.yaml
    print_success "Namespace created"

    # Apply ConfigMap and Secrets
    print_info "Applying ConfigMap and Secrets..."
    kubectl apply -f k8s/base/configmap.yaml
    kubectl apply -f k8s/base/secrets.yaml
    print_success "ConfigMap and Secrets applied"

    # Apply PVCs
    print_info "Creating Persistent Volume Claims..."
    kubectl apply -f k8s/base/postgres-pvc.yaml
    kubectl apply -f k8s/base/redis-pvc.yaml
    print_success "PVCs created"

    # Deploy databases
    print_info "Deploying databases..."
    kubectl apply -f k8s/base/postgres-deployment.yaml
    kubectl apply -f k8s/base/redis-deployment.yaml
    print_success "Databases deployed"

    # Wait for databases to be ready
    print_info "Waiting for databases to be ready..."
    kubectl wait --for=condition=ready pod -l app=postgres -n sos-app --timeout=120s
    kubectl wait --for=condition=ready pod -l app=redis -n sos-app --timeout=120s
    print_success "Databases are ready"

    # Deploy services
    print_info "Deploying microservices..."
    kubectl apply -f k8s/base/auth-service-deployment.yaml
    kubectl apply -f k8s/base/user-service-deployment.yaml
    kubectl apply -f k8s/base/medical-service-deployment.yaml
    print_success "Microservices deployed"

    # Wait for services to be ready
    print_info "Waiting for microservices to be ready..."
    kubectl wait --for=condition=ready pod -l app=auth-service -n sos-app --timeout=180s || true
    kubectl wait --for=condition=ready pod -l app=user-service -n sos-app --timeout=180s || true
    kubectl wait --for=condition=ready pod -l app=medical-service -n sos-app --timeout=180s || true
    print_success "Microservices are ready"
}

# Display access information
display_info() {
    print_header "Deployment Complete!"

    MINIKUBE_IP=$(minikube ip)

    echo -e "${GREEN}Your services are now running!${NC}\n"

    echo -e "${BLUE}Service URLs:${NC}"
    echo -e "  Auth Service:    http://${MINIKUBE_IP}:30001"
    echo -e "  User Service:    http://${MINIKUBE_IP}:30002"
    echo -e "  Medical Service: http://${MINIKUBE_IP}:30003"

    echo -e "\n${BLUE}Health Check URLs:${NC}"
    echo -e "  Auth:    http://${MINIKUBE_IP}:30001/health"
    echo -e "  User:    http://${MINIKUBE_IP}:30002/health"
    echo -e "  Medical: http://${MINIKUBE_IP}:30003/health"

    echo -e "\n${BLUE}Useful Commands:${NC}"
    echo -e "  View all pods:              kubectl get pods -n sos-app"
    echo -e "  View all services:          kubectl get svc -n sos-app"
    echo -e "  View logs (auth):           kubectl logs -f -l app=auth-service -n sos-app"
    echo -e "  View logs (user):           kubectl logs -f -l app=user-service -n sos-app"
    echo -e "  View logs (medical):        kubectl logs -f -l app=medical-service -n sos-app"
    echo -e "  Open Kubernetes dashboard:  minikube dashboard"
    echo -e "  Delete all resources:       kubectl delete namespace sos-app"

    echo -e "\n${BLUE}Test the services:${NC}"
    echo -e "  Run the test script: ./test-services-k8s.sh ${MINIKUBE_IP}"

    echo -e "\n${YELLOW}Note: Add the Minikube IP to /etc/hosts if needed:${NC}"
    echo -e "  echo '${MINIKUBE_IP} sos-app.local' | sudo tee -a /etc/hosts"
}

# Main execution
main() {
    print_header "SOS App - Minikube Deployment"

    # Check prerequisites
    check_minikube

    # Build images
    build_images

    # Deploy to Kubernetes
    deploy_k8s

    # Display info
    display_info
}

# Run main function
main
