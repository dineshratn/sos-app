#!/bin/bash
# SOS Platform Cleanup Script
# This script deletes all AWS resources created for the SOS platform

set -e

echo "🧹 SOS Platform Resource Cleanup"
echo "================================"
echo ""
echo "⚠️  WARNING: This will delete ALL resources including:"
echo "  - ECR repositories and images"
echo "  - S3 website bucket"
echo "  - EKS deployments"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cleanup cancelled."
    exit 0
fi

AWS_REGION="ap-south-2"
BUCKET_NAME="sos-app-website-1762590943"

echo ""
echo "Step 1: Deleting ECR images..."
echo "==============================="

for service in api-gateway auth-service user-service medical-service emergency-service location-service device-service notification-service communication-service llm-service website; do
    echo "Deleting images from sos-app/$service..."

    # Get all image digests
    digests=$(aws ecr list-images --repository-name "sos-app/$service" --region $AWS_REGION --query 'imageIds[*].imageDigest' --output text 2>/dev/null || echo "")

    if [ -n "$digests" ]; then
        for digest in $digests; do
            aws ecr batch-delete-image \
                --repository-name "sos-app/$service" \
                --region $AWS_REGION \
                --image-ids imageDigest="$digest" >/dev/null 2>&1 || true
        done
        echo "  ✓ Cleaned sos-app/$service"
    else
        echo "  - sos-app/$service already empty or doesn't exist"
    fi
done

echo ""
echo "Step 2: Deleting ECR repositories..."
echo "====================================="

for service in api-gateway auth-service user-service medical-service emergency-service location-service device-service notification-service communication-service llm-service website; do
    echo "Deleting repository: sos-app/$service..."
    aws ecr delete-repository \
        --repository-name "sos-app/$service" \
        --region $AWS_REGION \
        --force 2>/dev/null && echo "  ✓ Deleted" || echo "  - Not found"
done

echo ""
echo "Step 3: Deleting S3 website bucket..."
echo "======================================"

echo "Emptying bucket: $BUCKET_NAME..."
aws s3 rm "s3://$BUCKET_NAME" --recursive 2>/dev/null && echo "  ✓ Bucket emptied" || echo "  - Already empty"

echo "Deleting bucket: $BUCKET_NAME..."
aws s3api delete-bucket --bucket "$BUCKET_NAME" --region $AWS_REGION 2>/dev/null && echo "  ✓ Bucket deleted" || echo "  - Bucket not found"

echo ""
echo "Step 4: Deleting EKS deployments..."
echo "===================================="

echo "Deleting namespace: sos-app..."
kubectl delete namespace sos-app 2>/dev/null && echo "  ✓ Namespace deleted" || echo "  - Namespace not found or EKS not configured"

echo ""
echo "✅ Cleanup Complete!"
echo ""
echo "Summary:"
echo "  - All ECR images deleted"
echo "  - All ECR repositories deleted"
echo "  - S3 website bucket deleted"
echo "  - EKS deployments removed"
echo ""
echo "Note: EKS cluster itself was not deleted. To delete the cluster, run:"
echo "  aws eks delete-cluster --name sos-app-prod-eks --region $AWS_REGION"
