#!/bin/bash

# SOS App - Kubernetes Cleanup Script
# Removes all deployed resources from the cluster

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   🗑️   SOS App - Kubernetes Cleanup                      ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌  Error: kubectl is not installed!${NC}"
    exit 1
fi

# Ask for confirmation
echo -e "${YELLOW}⚠️   Warning: This will delete the entire sos-app namespace and all resources!${NC}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo ""
echo -e "${RED}🗑️   Deleting sos-app namespace and all resources...${NC}"
echo ""

# Delete namespace (this will cascade delete everything)
kubectl delete namespace sos-app --timeout=60s 2>/dev/null || true

echo ""
echo -e "${GREEN}✅  Cleanup complete!${NC}"
echo ""
echo "All SOS App resources have been removed from the cluster."
echo ""
