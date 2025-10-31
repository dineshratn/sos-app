#!/bin/bash

# =============================================================================
# SOS App - Go Docker Image Build Script
# =============================================================================
# Purpose: Build optimized Docker images for Go microservices
# Usage: ./build-go-image.sh <service-name> [target] [version]
# Example: ./build-go-image.sh emergency-service production v1.0.0
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
MAGENTA='\033[0;35m'
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

log_build() {
    echo -e "${MAGENTA}[BUILD]${NC} $1"
}

# -----------------------------------------------------------------------------
# Argument Parsing
# -----------------------------------------------------------------------------
if [ $# -lt 1 ]; then
    log_error "Usage: $0 <service-name> [target] [version]"
    echo ""
    echo "Arguments:"
    echo "  service-name  : Name of the Go service (e.g., emergency-service, location-service)"
    echo "  target        : Build target (production|production-alpine|development) [default: production]"
    echo "  version       : Image version tag [default: latest]"
    echo ""
    echo "Build Targets:"
    echo "  production        : Scratch-based image (smallest, ~5-15MB)"
    echo "  production-alpine : Alpine-based image (with shell, ~15-25MB)"
    echo "  development       : Development image with debugging tools (~400-500MB)"
    echo ""
    echo "Examples:"
    echo "  $0 emergency-service"
    echo "  $0 emergency-service production v1.0.0"
    echo "  $0 location-service production-alpine latest"
    echo "  $0 device-service development latest"
    exit 1
fi

SERVICE_NAME="$1"
BUILD_TARGET="${2:-production}"
VERSION="${3:-latest}"

# Validate build target
if [[ ! "$BUILD_TARGET" =~ ^(production|production-alpine|development)$ ]]; then
    log_error "Invalid build target: $BUILD_TARGET"
    log_error "Must be 'production', 'production-alpine', or 'development'"
    exit 1
fi

# -----------------------------------------------------------------------------
# Path Configuration
# -----------------------------------------------------------------------------
SERVICE_DIR="${ROOT_DIR}/services/${SERVICE_NAME}"
DOCKERFILE_PATH="${SCRIPT_DIR}/Dockerfile.go"
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

# Add target suffix for non-production builds
if [ "$BUILD_TARGET" = "production-alpine" ]; then
    FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}-alpine"
elif [ "$BUILD_TARGET" = "development" ]; then
    FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}-dev"
fi

# -----------------------------------------------------------------------------
# Build Information
# -----------------------------------------------------------------------------
log_info "==================================================================="
log_info "SOS App - Go Docker Image Build"
log_info "==================================================================="
log_info "Service:      ${SERVICE_NAME}"
log_info "Target:       ${BUILD_TARGET}"
log_info "Version:      ${VERSION}"
log_info "Image:        ${FULL_IMAGE_NAME}"
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

# Check if go.mod exists
if [ ! -f "${SERVICE_DIR}/go.mod" ]; then
    log_error "go.mod not found in ${SERVICE_DIR}"
    log_error "This must be a Go module with go.mod file"
    exit 1
fi

# Check if main.go exists in cmd/
if [ ! -f "${SERVICE_DIR}/cmd/main.go" ]; then
    log_error "cmd/main.go not found in ${SERVICE_DIR}"
    log_error "Go service must have main package in cmd/main.go"
    exit 1
fi

log_success "Pre-build checks passed"

# -----------------------------------------------------------------------------
# Go Module Information
# -----------------------------------------------------------------------------
log_info "Analyzing Go module..."

cd "$SERVICE_DIR"

# Extract module name from go.mod
MODULE_NAME=$(head -1 go.mod | awk '{print $2}')
log_info "Module Name: ${MODULE_NAME}"

# Count dependencies
DIRECT_DEPS=$(grep -c "^\s" go.mod || echo "0")
log_info "Direct Dependencies: ${DIRECT_DEPS}"

cd "$SCRIPT_DIR"

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
# Build Arguments
# -----------------------------------------------------------------------------
BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

log_build "Build Date: ${BUILD_DATE}"
log_build "Git Commit: ${GIT_COMMIT}"
log_build "Version: ${VERSION}"

# -----------------------------------------------------------------------------
# Build Docker Image
# -----------------------------------------------------------------------------
log_info "Building Docker image with target: ${BUILD_TARGET}..."
log_info "This may take several minutes for the first build..."

docker build \
    --target "$BUILD_TARGET" \
    --file "${SERVICE_DIR}/Dockerfile" \
    --tag "$FULL_IMAGE_NAME" \
    --tag "${IMAGE_NAME}:latest" \
    --build-arg VERSION="$VERSION" \
    --build-arg BUILD_DATE="$BUILD_DATE" \
    --build-arg GIT_COMMIT="$GIT_COMMIT" \
    --label "org.opencontainers.image.title=${SERVICE_NAME}" \
    --label "org.opencontainers.image.version=${VERSION}" \
    --label "org.opencontainers.image.created=${BUILD_DATE}" \
    --label "org.opencontainers.image.revision=${GIT_COMMIT}" \
    --label "org.opencontainers.image.vendor=SOS App" \
    --label "org.opencontainers.image.source=https://github.com/sos-app/${SERVICE_NAME}" \
    --label "app.target=${BUILD_TARGET}" \
    --label "app.language=go" \
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
IMAGE_ID=$(docker images "$FULL_IMAGE_NAME" --format "{{.ID}}")
log_info "Image ID: ${IMAGE_ID}"
log_info "Image Size: ${IMAGE_SIZE}"

# Show layers count
LAYERS_COUNT=$(docker history "$FULL_IMAGE_NAME" --no-trunc | grep -c "^" || echo "0")
log_info "Layers: ${LAYERS_COUNT}"

# -----------------------------------------------------------------------------
# Test Binary (for production builds)
# -----------------------------------------------------------------------------
if [[ "$BUILD_TARGET" =~ ^production ]]; then
    log_info "Testing binary in container..."

    # Try to get version information
    if docker run --rm "$FULL_IMAGE_NAME" --version 2>/dev/null; then
        log_success "Binary version check passed"
    else
        log_warn "Binary version check failed (this is OK if --version is not implemented)"
    fi
fi

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
    trivy image --severity HIGH,CRITICAL "$FULL_IMAGE_NAME" || log_warn "Security scan found vulnerabilities"
else
    log_warn "Trivy not installed, skipping security scan"
    log_warn "Install: brew install aquasecurity/trivy/trivy"
fi

# -----------------------------------------------------------------------------
# Optional: Dive Analysis (Image Layer Analysis)
# -----------------------------------------------------------------------------
if command -v dive &> /dev/null; then
    log_info "Image layer analysis available. Run:"
    echo "  dive ${FULL_IMAGE_NAME}"
else
    log_warn "Dive not installed, skipping layer analysis"
    log_warn "Install: brew install dive"
fi

# -----------------------------------------------------------------------------
# Build Summary
# -----------------------------------------------------------------------------
log_success "==================================================================="
log_success "Build completed successfully!"
log_success "==================================================================="
log_success "Image:        ${FULL_IMAGE_NAME}"
log_success "Size:         ${IMAGE_SIZE}"
log_success "Target:       ${BUILD_TARGET}"
log_success "Git Commit:   ${GIT_COMMIT}"
log_success "Module:       ${MODULE_NAME}"
log_success "==================================================================="
echo ""

# -----------------------------------------------------------------------------
# Next Steps Based on Target
# -----------------------------------------------------------------------------
log_info "Next steps:"
echo ""

if [ "$BUILD_TARGET" = "production" ]; then
    echo "  Production (Scratch) Build - Smallest image size"
    echo ""
    echo "  1. Test the image locally:"
    echo "     docker run -p 8080:8080 -e ENV=production ${FULL_IMAGE_NAME}"
    echo ""
    echo "  2. Check container health:"
    echo "     curl http://localhost:8080/health"
    echo ""
    echo "  3. Push to registry:"
    echo "     docker push ${FULL_IMAGE_NAME}"
    echo ""
    echo "  Note: Scratch images have no shell. Use 'docker logs' for debugging."

elif [ "$BUILD_TARGET" = "production-alpine" ]; then
    echo "  Production-Alpine Build - With shell and debugging tools"
    echo ""
    echo "  1. Test the image locally:"
    echo "     docker run -p 8080:8080 -e ENV=production ${FULL_IMAGE_NAME}"
    echo ""
    echo "  2. Check container health:"
    echo "     curl http://localhost:8080/health"
    echo ""
    echo "  3. Shell access for debugging:"
    echo "     docker run -it ${FULL_IMAGE_NAME} sh"
    echo ""
    echo "  4. Push to registry:"
    echo "     docker push ${FULL_IMAGE_NAME}"

else  # development
    echo "  Development Build - With debugging tools (Delve)"
    echo ""
    echo "  1. Run with debugger:"
    echo "     docker run -p 8080:8080 -p 2345:2345 ${FULL_IMAGE_NAME}"
    echo ""
    echo "  2. Connect debugger (VS Code launch.json):"
    echo "     {"
    echo "       \"type\": \"go\","
    echo "       \"request\": \"attach\","
    echo "       \"mode\": \"remote\","
    echo "       \"remotePath\": \"/app\","
    echo "       \"port\": 2345,"
    echo "       \"host\": \"localhost\""
    echo "     }"
    echo ""
    echo "  3. Attach with dlv CLI:"
    echo "     dlv connect localhost:2345"
fi

echo ""
echo "  Deploy to Kubernetes:"
echo "     kubectl set image deployment/${SERVICE_NAME} ${SERVICE_NAME}=${FULL_IMAGE_NAME}"
echo ""

# -----------------------------------------------------------------------------
# Size Comparison Tip
# -----------------------------------------------------------------------------
if [ "$BUILD_TARGET" = "production" ]; then
    echo "  💡 Tip: If image size is larger than expected (>15MB), consider:"
    echo "     - Checking for embedded assets that could be external"
    echo "     - Reviewing imported packages for size"
    echo "     - Using 'dive' tool to analyze layers: dive ${FULL_IMAGE_NAME}"
    echo ""
fi

# -----------------------------------------------------------------------------
# Exit
# -----------------------------------------------------------------------------
exit 0
