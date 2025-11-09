#!/bin/bash
# =============================================================================
# SOS App - Resource Monitoring Script
# =============================================================================
# Purpose: Monitor resource usage of Phase 1 infrastructure
# Usage: ./monitor-resources.sh
# =============================================================================

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
}

print_header "SOS App - Resource Monitoring"

# Check if metrics-server is enabled
echo -e "${BLUE}Checking metrics server...${NC}"
if minikube addons list | grep metrics-server | grep -q enabled; then
    echo -e "${GREEN}✓ Metrics server is enabled${NC}"
else
    echo -e "${YELLOW}! Metrics server is disabled. Enabling...${NC}"
    minikube addons enable metrics-server
    echo "Waiting for metrics server to start..."
    sleep 10
fi

echo ""

# Node resources
print_header "Node Resources"
kubectl top nodes

# Pod resources
print_header "Pod Resources (sos-app namespace)"
kubectl top pods -n sos-app --sort-by=memory

# Pod status
print_header "Pod Status"
kubectl get pods -n sos-app -o wide

# Storage usage
print_header "Persistent Volume Claims"
kubectl get pvc -n sos-app

# Service endpoints
print_header "Services"
kubectl get svc -n sos-app

# Overall namespace resource quotas
print_header "Namespace Resource Quotas"
kubectl describe namespace sos-app | grep -A 10 "Resource Quotas" || echo "No resource quotas set"

# Summary
print_header "Quick Summary"

TOTAL_PODS=$(kubectl get pods -n sos-app --no-headers 2>/dev/null | wc -l)
RUNNING_PODS=$(kubectl get pods -n sos-app --no-headers 2>/dev/null | grep Running | wc -l)
PENDING_PODS=$(kubectl get pods -n sos-app --no-headers 2>/dev/null | grep Pending | wc -l)
ERROR_PODS=$(kubectl get pods -n sos-app --no-headers 2>/dev/null | grep -E "Error|CrashLoopBackOff|ImagePullBackOff" | wc -l)

echo "Total Pods:   $TOTAL_PODS"
echo -e "${GREEN}Running:      $RUNNING_PODS${NC}"
if [ "$PENDING_PODS" -gt 0 ]; then
    echo -e "${YELLOW}Pending:      $PENDING_PODS${NC}"
fi
if [ "$ERROR_PODS" -gt 0 ]; then
    echo -e "${RED}Errors:       $ERROR_PODS${NC}"
fi

echo ""
echo "To continuously monitor, run: watch -n 5 './monitor-resources.sh'"
echo ""
