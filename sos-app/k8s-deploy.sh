#!/bin/bash

# SOS App - Kubernetes Deployment Script
# Deploys all services to Kubernetes cluster

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   🚀  SOS App - Kubernetes Deployment                    ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌  Error: kubectl is not installed!${NC}"
    echo "Please install kubectl and try again."
    exit 1
fi

# Check if cluster is accessible
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}❌  Error: Cannot connect to Kubernetes cluster!${NC}"
    echo "Please ensure your cluster is running and kubectl is configured."
    exit 1
fi

echo -e "${GREEN}✅  Kubernetes cluster is accessible${NC}"
echo ""

# Function to apply manifests
apply_manifests() {
    local dir=$1
    local description=$2

    echo -e "${BLUE}📦  Deploying: $description${NC}"

    if [ -d "$dir" ]; then
        kubectl apply -f "$dir/"
        echo -e "${GREEN}✅  $description deployed successfully${NC}"
    else
        echo -e "${YELLOW}⚠️   Directory not found: $dir${NC}"
    fi
    echo ""
}

# Function to wait for resources
wait_for_resources() {
    local resource_type=$1
    local namespace=$2
    local timeout=$3

    echo -e "${BLUE}⏳  Waiting for $resource_type to be ready...${NC}"

    if kubectl wait --for=condition=ready "$resource_type" \
        --all -n "$namespace" --timeout="${timeout}s" 2>/dev/null; then
        echo -e "${GREEN}✅  $resource_type are ready${NC}"
    else
        echo -e "${YELLOW}⚠️   Some $resource_type may not be ready yet${NC}"
    fi
    echo ""
}

# Deploy in order
echo -e "${BLUE}🔧  Starting deployment...${NC}"
echo ""

# 1. Create namespace
apply_manifests "k8s/00-namespace" "Namespace"

# 2. Create secrets
apply_manifests "k8s/01-secrets" "Secrets"

# 3. Create configmaps
apply_manifests "k8s/02-configmaps" "ConfigMaps"

# 4. Deploy databases
apply_manifests "k8s/03-databases" "Databases"
echo -e "${YELLOW}⏳  Waiting 30 seconds for databases to initialize...${NC}"
sleep 30
wait_for_resources "statefulset" "sos-app" 300

# 5. Deploy backend services
apply_manifests "k8s/04-backend" "Backend Services"
wait_for_resources "deployment" "sos-app" 300

# 6. Deploy ingress
apply_manifests "k8s/05-ingress" "Ingress"

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   ✅  Deployment Complete!                               ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Show deployment status
echo -e "${BLUE}📊  Deployment Status:${NC}"
echo ""
kubectl get all -n sos-app
echo ""

echo -e "${BLUE}🌐  Access Information:${NC}"
echo "   API Gateway:     http://sos-app.local"
echo "   Health Check:    http://sos-app.local/health"
echo ""
echo -e "${YELLOW}💡  Note: Add '127.0.0.1 sos-app.local' to /etc/hosts${NC}"
echo ""

echo -e "${BLUE}📝  Useful Commands:${NC}"
echo "   View pods:        kubectl get pods -n sos-app"
echo "   View services:    kubectl get svc -n sos-app"
echo "   View logs:        kubectl logs -f <pod-name> -n sos-app"
echo "   Delete all:       kubectl delete namespace sos-app"
echo ""

# Check if any pods are not running
NOT_RUNNING=$(kubectl get pods -n sos-app --field-selector=status.phase!=Running --no-headers 2>/dev/null | wc -l)
if [ "$NOT_RUNNING" -gt 0 ]; then
    echo -e "${YELLOW}⚠️   Warning: $NOT_RUNNING pod(s) are not in Running state${NC}"
    echo "   Run 'kubectl get pods -n sos-app' to check pod status"
    echo "   Run 'kubectl describe pod <pod-name> -n sos-app' for details"
    echo ""
fi

echo -e "${GREEN}🎉  Deployment script completed!${NC}"
