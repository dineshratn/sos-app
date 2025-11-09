#!/bin/bash

# SOS App - Docker Image Build Script
# Builds all service Docker images with proper tagging

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
DOCKER_REGISTRY="${DOCKER_REGISTRY:-sos-app}"
VERSION="${VERSION:-latest}"
BUILD_ARGS="${BUILD_ARGS:-}"

echo -e "${YELLOW}╔═══════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  SOS App - Docker Image Builder      ║${NC}"
echo -e "${YELLOW}╚═══════════════════════════════════════╝${NC}"
echo ""
echo -e "Registry: ${GREEN}${DOCKER_REGISTRY}${NC}"
echo -e "Version:  ${GREEN}${VERSION}${NC}"
echo ""

# Function to build a service
build_service() {
    local service_name=$1
    local service_path=$2
    local image_name="${DOCKER_REGISTRY}/${service_name}:${VERSION}"
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${YELLOW}Building: ${service_name}${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ ! -d "$service_path" ]; then
        echo -e "${RED}Error: Service directory not found: $service_path${NC}"
        return 1
    fi
    
    if [ ! -f "$service_path/Dockerfile" ]; then
        echo -e "${RED}Error: Dockerfile not found in $service_path${NC}"
        return 1
    fi
    
    # Build the image
    docker build \
        -t "${image_name}" \
        -t "${DOCKER_REGISTRY}/${service_name}:latest" \
        ${BUILD_ARGS} \
        "$service_path"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Successfully built: ${image_name}${NC}"
        
        # Get image size
        local size=$(docker images "${image_name}" --format "{{.Size}}")
        echo -e "  Image size: ${size}"
        echo ""
    else
        echo -e "${RED}✗ Failed to build: ${image_name}${NC}"
        return 1
    fi
}

# Build all services
echo "Starting build process..."
echo ""

# Auth Service
build_service "auth-service" "./services/auth-service"

# User Service
build_service "user-service" "./services/user-service"

# Medical Service
build_service "medical-service" "./services/medical-service"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✓ All images built successfully!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# List all images
echo "Built images:"
docker images | grep "${DOCKER_REGISTRY}" | head -10

echo ""
echo "To run services:"
echo "  docker-compose up -d"
echo ""
echo "To push images to registry:"
echo "  docker push ${DOCKER_REGISTRY}/auth-service:${VERSION}"
echo "  docker push ${DOCKER_REGISTRY}/user-service:${VERSION}"
echo "  docker push ${DOCKER_REGISTRY}/medical-service:${VERSION}"
echo ""
