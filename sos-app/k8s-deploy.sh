#!/bin/bash
# Simplified local deployment for testing
set -e

echo "Deploying SOS App Phase 1 (Simplified for Local Testing)..."

# Create namespace
kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: sos-app
EOF

# Create secrets
kubectl create secret generic postgres-credentials -n sos-app \
  --from-literal=postgres-password=postgres123 \
  --from-literal=replication-password=replica123 \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic mongodb-credentials -n sos-app \
  --from-literal=root-password=mongo123 \
  --from-literal=mongodb-password=mongo123 \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic redis-credentials -n sos-app \
  --from-literal=redis-password=redis123 \
  --dry-run=client -o yaml | kubectl apply -f -

echo "✓ Namespace and secrets created"

# Apply all manifests
kubectl apply -f infrastructure/kubernetes/base/configmap.yaml
kubectl apply -f infrastructure/kubernetes/base/postgres-statefulset.yaml
kubectl apply -f infrastructure/kubernetes/base/mongodb-statefulset.yaml
kubectl apply -f infrastructure/kubernetes/base/timescale-statefulset.yaml
kubectl apply -f infrastructure/kubernetes/base/redis-deployment.yaml
kubectl apply -f infrastructure/kubernetes/base/redis-pubsub-deployment.yaml
kubectl apply -f infrastructure/kubernetes/base/zookeeper-statefulset.yaml

echo "✓ Database deployments created"
echo "Waiting 30 seconds for Zookeeper to start..."
sleep 30

kubectl apply -f infrastructure/kubernetes/base/kafka-statefulset.yaml
kubectl apply -f infrastructure/kubernetes/base/schema-registry-deployment.yaml
kubectl apply -f infrastructure/kubernetes/base/mqtt-deployment.yaml

echo "✓ Message broker deployments created"

# Scale down for local testing
echo "Scaling down to single replicas for local testing..."
kubectl scale statefulset postgres -n sos-app --replicas=1 --timeout=10s || true
kubectl scale statefulset zookeeper -n sos-app --replicas=1 --timeout=10s || true
kubectl scale statefulset kafka -n sos-app --replicas=1 --timeout=10s || true
kubectl scale deployment schema-registry -n sos-app --replicas=1 --timeout=10s || true
kubectl scale deployment mqtt -n sos-app --replicas=1 --timeout=10s || true
kubectl scale deployment redis-master -n sos-app --replicas=1 --timeout=10s || true
kubectl scale deployment redis-replica -n sos-app --replicas=1 --timeout=10s || true
kubectl scale deployment redis-pubsub -n sos-app --replicas=1 --timeout=10s || true

echo ""
echo "✓ Deployment complete!"
echo ""
echo "Check status with:"
echo "  kubectl get pods -n sos-app"
echo ""
