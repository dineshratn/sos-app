#!/bin/bash
# =============================================================================
# SOS App - Transfer to AWS Script
# =============================================================================
# Purpose: Transfer project files to AWS S3
# Usage: ./transfer-to-aws.sh [S3_BUCKET_NAME]
# =============================================================================

set -euo pipefail

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BUCKET_NAME="${1:-}"
REGION="${AWS_REGION:-us-east-1}"

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

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI is not installed"
    echo ""
    echo "Install AWS CLI:"
    echo ""
    echo "For Linux/WSL2:"
    echo "  curl 'https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip' -o 'awscliv2.zip'"
    echo "  unzip awscliv2.zip"
    echo "  sudo ./aws/install"
    echo ""
    echo "For macOS:"
    echo "  brew install awscli"
    echo ""
    echo "Then configure:"
    echo "  aws configure"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &>/dev/null; then
    log_error "AWS credentials not configured or invalid"
    echo ""
    echo "Configure AWS credentials:"
    echo "  aws configure"
    echo ""
    echo "You'll need:"
    echo "  - AWS Access Key ID"
    echo "  - AWS Secret Access Key"
    echo "  - Default region (e.g., us-east-1)"
    exit 1
fi

# Get bucket name if not provided
if [ -z "$BUCKET_NAME" ]; then
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null)
    BUCKET_NAME="sos-app-deployment-${ACCOUNT_ID}"
    log_info "No bucket specified, using: $BUCKET_NAME"
fi

print_header "SOS App - Transfer to AWS"

IDENTITY=$(aws sts get-caller-identity)
ACCOUNT_ID=$(echo $IDENTITY | jq -r '.Account')
USER_ARN=$(echo $IDENTITY | jq -r '.Arn')

log_info "AWS Account: $ACCOUNT_ID"
log_info "User/Role: $USER_ARN"
log_info "Region: $REGION"
log_info "Bucket: s3://$BUCKET_NAME/"
echo ""

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
print_header "Step 2: Creating S3 Bucket"

if aws s3 ls "s3://$BUCKET_NAME" &>/dev/null; then
    log_info "Bucket already exists: s3://$BUCKET_NAME/"
else
    log_info "Creating bucket: s3://$BUCKET_NAME/"

    if [ "$REGION" = "us-east-1" ]; then
        aws s3 mb "s3://$BUCKET_NAME"
    else
        aws s3 mb "s3://$BUCKET_NAME" --region "$REGION"
    fi

    # Enable versioning
    aws s3api put-bucket-versioning \
        --bucket "$BUCKET_NAME" \
        --versioning-configuration Status=Enabled

    # Enable encryption
    aws s3api put-bucket-encryption \
        --bucket "$BUCKET_NAME" \
        --server-side-encryption-configuration '{
            "Rules": [{
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                }
            }]
        }'

    log_success "Bucket created with versioning and encryption enabled"
fi

# Upload
print_header "Step 3: Uploading to S3"

log_info "Uploading sos-app.tar.gz to s3://$BUCKET_NAME/..."
aws s3 cp sos-app.tar.gz "s3://$BUCKET_NAME/" --storage-class STANDARD_IA

log_success "Upload complete!"

# Verify
log_info "Verifying upload..."
if aws s3 ls "s3://$BUCKET_NAME/sos-app.tar.gz" &>/dev/null; then
    S3_SIZE=$(aws s3 ls "s3://$BUCKET_NAME/sos-app.tar.gz" | awk '{print $3}')
    S3_SIZE_MB=$(echo "scale=2; $S3_SIZE / 1024 / 1024" | bc)
    log_success "File verified: ${S3_SIZE_MB}MB"
else
    log_error "Upload verification failed"
    exit 1
fi

# Generate presigned URL (valid for 7 days)
log_info "Generating presigned URL (valid for 7 days)..."
PRESIGNED_URL=$(aws s3 presign "s3://$BUCKET_NAME/sos-app.tar.gz" --expires-in 604800)

# Generate download instructions
print_header "Transfer Complete!"

cat <<EOF
${GREEN}✓ Files successfully transferred to AWS S3!${NC}

File Location:
  ${BLUE}s3://$BUCKET_NAME/sos-app.tar.gz${NC}

Presigned URL (valid for 7 days):
  ${BLUE}$PRESIGNED_URL${NC}

To download and deploy on AWS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${YELLOW}Method 1: Using AWS CLI${NC}
  On your EC2 instance or CloudShell:

     ${BLUE}aws s3 cp s3://$BUCKET_NAME/sos-app.tar.gz .
     tar -xzf sos-app.tar.gz
     cd sos-app${NC}

${YELLOW}Method 2: Using Presigned URL${NC}
  On any machine:

     ${BLUE}wget "$PRESIGNED_URL" -O sos-app.tar.gz
     tar -xzf sos-app.tar.gz
     cd sos-app${NC}

${YELLOW}Method 3: Using AWS CloudShell${NC}
  1. Open AWS CloudShell: https://console.aws.amazon.com/cloudshell
  2. Run:

     ${BLUE}aws s3 cp s3://$BUCKET_NAME/sos-app.tar.gz .
     tar -xzf sos-app.tar.gz
     cd sos-app${NC}

After extraction, deploy with:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ${BLUE}# Set up AWS CLI credentials (if not already done)
  aws configure

  # Create EKS cluster
  ./aws-create-eks-cluster.sh

  # Deploy Phase 1 infrastructure
  ./aws-deploy.sh deploy

  # Verify deployment
  ./validate-deployment.sh${NC}

For detailed instructions, see:
  ${BLUE}AWS-DEPLOYMENT-GUIDE.md${NC}

Storage Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • Region: $REGION
  • Storage Class: STANDARD_IA (Infrequent Access)
  • Encryption: AES256 (Server-Side)
  • Versioning: Enabled
  • Estimated monthly cost: \$0.0125 per GB (~\$${S3_SIZE_MB} for ${S3_SIZE_MB}MB)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
echo ""
log_info "Next step: Create EKS cluster"
log_info "Run: ./aws-create-eks-cluster.sh"
