#!/bin/bash

# =============================================================================
# SOS App - Node.js Docker Image Build Script
# =============================================================================
# Purpose: Build optimized Docker images for Node.js microservices
# Usage: ./build-node-image.sh <service-name> [environment] [version]
# Example: ./build-node-image.sh auth-service production v1.0.0
# =============================================================================

set -e  # Exit on error
set -u  # Exit on undefined variable

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DOCKER_REGISTRY="${DOCKER_REGISTRY:-ghcr.io/sos-app}"

# -----------------------------------------------------------------------------
# Color Output
# -----------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# -----------------------------------------------------------------------------
# Logging Functions
# -----------------------------------------------------------------------------
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# -----------------------------------------------------------------------------
# Argument Parsing
# -----------------------------------------------------------------------------
if [ $# -lt 1 ]; then
    log_error "Usage: $0 <service-name> [environment] [version]"
    echo ""
    echo "Arguments:"
    echo "  service-name  : Name of the Node.js service (e.g., auth-service, user-service)"
    echo "  environment   : Target environment (development|production) [default: production]"
    echo "  version       : Image version tag [default: latest]"
    echo ""
    echo "Examples:"
    echo "  $0 auth-service"
    echo "  $0 auth-service production v1.0.0"
    echo "  $0 user-service development latest"
    exit 1
fi

SERVICE_NAME="$1"
ENVIRONMENT="${2:-production}"
VERSION="${3:-latest}"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|production)$ ]]; then
    log_error "Invalid environment: $ENVIRONMENT (must be 'development' or 'production')"
    exit 1
fi

# -----------------------------------------------------------------------------
# Path Configuration
# -----------------------------------------------------------------------------
SERVICE_DIR="${ROOT_DIR}/services/${SERVICE_NAME}"
DOCKERFILE_PATH="${SCRIPT_DIR}/Dockerfile.node"
DOCKERIGNORE_PATH="${SCRIPT_DIR}/.dockerignore"

# Validate service directory exists
if [ ! -d "$SERVICE_DIR" ]; then
    log_error "Service directory not found: $SERVICE_DIR"
    exit 1
fi

# Validate Dockerfile exists
if [ ! -f "$DOCKERFILE_PATH" ]; then
    log_error "Dockerfile not found: $DOCKERFILE_PATH"
    exit 1
fi

# -----------------------------------------------------------------------------
# Image Configuration
# -----------------------------------------------------------------------------
IMAGE_NAME="${DOCKER_REGISTRY}/${SERVICE_NAME}"
IMAGE_TAG="${VERSION}"
FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"
BUILD_TARGET="$ENVIRONMENT"

# -----------------------------------------------------------------------------
# Build Information
# -----------------------------------------------------------------------------
log_info "==================================================================="
log_info "SOS App - Docker Image Build"
log_info "==================================================================="
log_info "Service:      ${SERVICE_NAME}"
log_info "Environment:  ${ENVIRONMENT}"
log_info "Version:      ${VERSION}"
log_info "Image:        ${FULL_IMAGE_NAME}"
log_info "Target:       ${BUILD_TARGET}"
log_info "Build Dir:    ${SERVICE_DIR}"
log_info "Dockerfile:   ${DOCKERFILE_PATH}"
log_info "==================================================================="

# -----------------------------------------------------------------------------
# Pre-build Checks
# -----------------------------------------------------------------------------
log_info "Running pre-build checks..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed or not in PATH"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    log_error "Docker daemon is not running"
    exit 1
fi

# Check if package.json exists
if [ ! -f "${SERVICE_DIR}/package.json" ]; then
    log_error "package.json not found in ${SERVICE_DIR}"
    exit 1
fi

log_success "Pre-build checks passed"

# -----------------------------------------------------------------------------
# Copy Build Files
# -----------------------------------------------------------------------------
log_info "Copying build files to service directory..."

# Copy Dockerfile to service directory
cp "$DOCKERFILE_PATH" "${SERVICE_DIR}/Dockerfile"
log_info "Copied Dockerfile to ${SERVICE_DIR}/"

# Copy .dockerignore to service directory
if [ -f "$DOCKERIGNORE_PATH" ]; then
    cp "$DOCKERIGNORE_PATH" "${SERVICE_DIR}/.dockerignore"
    log_info "Copied .dockerignore to ${SERVICE_DIR}/"
fi

# -----------------------------------------------------------------------------
# Build Docker Image
# -----------------------------------------------------------------------------
log_info "Building Docker image..."

BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

docker build \
    --target "$BUILD_TARGET" \
    --file "${SERVICE_DIR}/Dockerfile" \
    --tag "$FULL_IMAGE_NAME" \
    --tag "${IMAGE_NAME}:latest" \
    --build-arg NODE_ENV="$ENVIRONMENT" \
    --build-arg BUILD_DATE="$BUILD_DATE" \
    --build-arg VERSION="$VERSION" \
    --build-arg GIT_COMMIT="$GIT_COMMIT" \
    --label "org.opencontainers.image.title=${SERVICE_NAME}" \
    --label "org.opencontainers.image.version=${VERSION}" \
    --label "org.opencontainers.image.created=${BUILD_DATE}" \
    --label "org.opencontainers.image.revision=${GIT_COMMIT}" \
    --label "org.opencontainers.image.vendor=SOS App" \
    --label "app.environment=${ENVIRONMENT}" \
    "$SERVICE_DIR"

log_success "Docker image built successfully: $FULL_IMAGE_NAME"

# -----------------------------------------------------------------------------
# Image Information
# -----------------------------------------------------------------------------
log_info "==================================================================="
log_info "Image Details:"
log_info "==================================================================="
docker images "$IMAGE_NAME" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"

# Get detailed image info
IMAGE_SIZE=$(docker images "$FULL_IMAGE_NAME" --format "{{.Size}}")
log_info "Image Size: ${IMAGE_SIZE}"

# -----------------------------------------------------------------------------
# Clean Up
# -----------------------------------------------------------------------------
log_info "Cleaning up temporary files..."
rm -f "${SERVICE_DIR}/Dockerfile"
rm -f "${SERVICE_DIR}/.dockerignore"
log_success "Cleanup completed"

# -----------------------------------------------------------------------------
# Optional: Run Image Scan
# -----------------------------------------------------------------------------
if command -v trivy &> /dev/null; then
    log_info "Running security scan with Trivy..."
    trivy image "$FULL_IMAGE_NAME" || log_warn "Security scan found vulnerabilities"
else
    log_warn "Trivy not installed, skipping security scan"
fi

# -----------------------------------------------------------------------------
# Build Summary
# -----------------------------------------------------------------------------
log_success "==================================================================="
log_success "Build completed successfully!"
log_success "==================================================================="
log_success "Image:        ${FULL_IMAGE_NAME}"
log_success "Size:         ${IMAGE_SIZE}"
log_success "Environment:  ${ENVIRONMENT}"
log_success "Git Commit:   ${GIT_COMMIT}"
log_success "==================================================================="
echo ""
log_info "Next steps:"
echo "  1. Test the image locally:"
echo "     docker run -p 3000:3000 -e NODE_ENV=${ENVIRONMENT} ${FULL_IMAGE_NAME}"
echo ""
echo "  2. Push to registry:"
echo "     docker push ${FULL_IMAGE_NAME}"
echo ""
echo "  3. Deploy to Kubernetes:"
echo "     kubectl set image deployment/${SERVICE_NAME} ${SERVICE_NAME}=${FULL_IMAGE_NAME}"
echo ""

# -----------------------------------------------------------------------------
# Exit
# -----------------------------------------------------------------------------
exit 0
