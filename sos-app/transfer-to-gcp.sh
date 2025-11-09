#!/bin/bash
# =============================================================================
# SOS App - Transfer to Google Cloud Script
# =============================================================================
# Purpose: Transfer project files to Google Cloud Storage
# Usage: ./transfer-to-gcp.sh [PROJECT_ID]
# =============================================================================

set -euo pipefail

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ID="${1:-}"
BUCKET_NAME=""

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

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

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    log_error "gcloud CLI is not installed"
    echo ""
    echo "Install from: https://cloud.google.com/sdk/docs/install"
    echo ""
    echo "Quick install:"
    echo "  curl https://sdk.cloud.google.com | bash"
    echo "  exec -l \$SHELL"
    echo "  gcloud init"
    exit 1
fi

# Get project ID if not provided
if [ -z "$PROJECT_ID" ]; then
    # Try to get from gcloud config
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")

    if [ -z "$PROJECT_ID" ]; then
        log_error "No project ID specified"
        echo ""
        echo "Usage: $0 PROJECT_ID"
        echo ""
        echo "Or set a default project:"
        echo "  gcloud config set project YOUR_PROJECT_ID"
        exit 1
    fi
fi

BUCKET_NAME="$PROJECT_ID-sos-app-deployment"

print_header "SOS App - Transfer to Google Cloud"

log_info "Project ID: $PROJECT_ID"
log_info "Bucket: gs://$BUCKET_NAME/"
echo ""

# Check authentication
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | grep -q .; then
    log_warning "Not authenticated with gcloud"
    log_info "Running: gcloud auth login"
    gcloud auth login
fi

log_success "Authenticated with gcloud"

# Navigate to parent directory
log_info "Navigating to project directory..."
cd "$(dirname "$0")/.."
PROJECT_DIR=$(pwd)
log_info "Project directory: $PROJECT_DIR"

# Create archive
print_header "Step 1: Creating Archive"

log_info "Creating tar.gz archive..."
tar -czf sos-app.tar.gz \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='build' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='secrets.env' \
    --exclude='*.tar.gz' \
    sos-app/

ARCHIVE_SIZE=$(du -h sos-app.tar.gz | cut -f1)
log_success "Archive created: sos-app.tar.gz ($ARCHIVE_SIZE)"

# Create bucket
print_header "Step 2: Creating GCS Bucket"

if gsutil ls gs://$BUCKET_NAME/ &>/dev/null; then
    log_info "Bucket already exists: gs://$BUCKET_NAME/"
else
    log_info "Creating bucket: gs://$BUCKET_NAME/"
    gsutil mb -l us-central1 gs://$BUCKET_NAME/
    log_success "Bucket created"
fi

# Upload
print_header "Step 3: Uploading to Google Cloud Storage"

log_info "Uploading sos-app.tar.gz to gs://$BUCKET_NAME/..."
gsutil -m cp sos-app.tar.gz gs://$BUCKET_NAME/

log_success "Upload complete!"

# Verify
log_info "Verifying upload..."
if gsutil ls gs://$BUCKET_NAME/sos-app.tar.gz &>/dev/null; then
    GCS_SIZE=$(gsutil du -sh gs://$BUCKET_NAME/sos-app.tar.gz | cut -f1)
    log_success "File verified: $GCS_SIZE"
else
    log_error "Upload verification failed"
    exit 1
fi

# Generate download instructions
print_header "Transfer Complete!"

cat <<EOF
${GREEN}✓ Files successfully transferred to Google Cloud!${NC}

File Location:
  ${BLUE}gs://$BUCKET_NAME/sos-app.tar.gz${NC}

To download and deploy on GCP:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${YELLOW}Method 1: Using Cloud Shell${NC}
  1. Open Cloud Shell: https://console.cloud.google.com
  2. Run these commands:

     ${BLUE}gsutil cp gs://$BUCKET_NAME/sos-app.tar.gz .
     tar -xzf sos-app.tar.gz
     cd sos-app${NC}

${YELLOW}Method 2: Using GCE Instance${NC}
  1. SSH into your instance
  2. Run these commands:

     ${BLUE}gcloud auth login  # If needed
     gsutil cp gs://$BUCKET_NAME/sos-app.tar.gz .
     tar -xzf sos-app.tar.gz
     cd sos-app${NC}

After extraction, deploy with:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ${BLUE}# Connect to your GKE cluster
  gcloud container clusters get-credentials sos-app-cluster --region us-central1

  # Deploy Phase 1 infrastructure
  ./gcp-deploy.sh deploy

  # Verify deployment
  ./validate-deployment.sh${NC}

For detailed instructions, see:
  ${BLUE}GCP-DEPLOYMENT-GUIDE.md${NC}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF

# Clean up local archive
echo ""
read -p "Delete local archive? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm sos-app.tar.gz
    log_info "Local archive deleted"
else
    log_info "Local archive kept: $PROJECT_DIR/sos-app.tar.gz"
fi

echo ""
log_success "Transfer complete! 🚀"
