#!/bin/bash
set -e

ACCOUNT_ID=173148986859
REGION=ap-south-2
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

echo "Logging in to ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

echo "Building auth-service..."
cd services/auth-service
docker build --no-cache -t sos-app/auth-service:latest .
docker tag sos-app/auth-service:latest $ECR_REGISTRY/sos-app/auth-service:latest
echo "Pushing auth-service to ECR..."
docker push $ECR_REGISTRY/sos-app/auth-service:latest
cd ../..

echo "Building user-service..."
cd services/user-service
docker build --no-cache -t sos-app/user-service:latest .
docker tag sos-app/user-service:latest $ECR_REGISTRY/sos-app/user-service:latest
echo "Pushing user-service to ECR..."
docker push $ECR_REGISTRY/sos-app/user-service:latest
cd ../..

echo "Done! Images pushed to ECR."
