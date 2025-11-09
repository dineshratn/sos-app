#!/bin/bash

# Script to create Helm chart for a microservice based on auth-service template
# Usage: ./create-service-chart.sh <service-name> <port> <image-repo>

set -e

SERVICE_NAME=$1
PORT=$2
IMAGE_REPO=${3:-"173148986859.dkr.ecr.ap-south-2.amazonaws.com/sos-app"}

if [ -z "$SERVICE_NAME" ] || [ -z "$PORT" ]; then
  echo "Usage: $0 <service-name> <port> [image-repo]"
  echo "Example: $0 user-service 3002"
  exit 1
fi

echo "Creating Helm chart for ${SERVICE_NAME}..."

# Create directory structure
mkdir -p "${SERVICE_NAME}/templates"

# Create Chart.yaml
cat > "${SERVICE_NAME}/Chart.yaml" <<EOF
apiVersion: v2
name: ${SERVICE_NAME}
description: A Helm chart for SOS App ${SERVICE_NAME}
type: application
version: 1.0.0
appVersion: "1.0.0"
keywords:
  - microservice
  - sos-app
maintainers:
  - name: DevOps Team
    email: devops@example.com
sources:
  - https://github.com/your-org/sos-app
EOF

# Create values.yaml
cat > "${SERVICE_NAME}/values.yaml" <<EOF
# Default values for ${SERVICE_NAME}

replicaCount: 3

image:
  repository: ${IMAGE_REPO}/${SERVICE_NAME}
  pullPolicy: IfNotPresent
  tag: "latest"

imagePullSecrets: []
nameOverride: ""
fullnameOverride: ""

serviceAccount:
  create: true
  annotations: {}
  name: ""

podAnnotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "${PORT}"
  prometheus.io/path: "/metrics"

podSecurityContext:
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 1000

securityContext:
  capabilities:
    drop:
    - ALL
  readOnlyRootFilesystem: false
  allowPrivilegeEscalation: false

service:
  type: ClusterIP
  port: ${PORT}
  targetPort: ${PORT}
  annotations: {}

ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/rate-limit: "100"
  hosts:
    - host: api.sos-app.local
      paths:
        - path: /api/v1/${SERVICE_NAME//-service/}
          pathType: Prefix
  tls:
    - secretName: sos-app-tls
      hosts:
        - api.sos-app.local

resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 250m
    memory: 512Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

livenessProbe:
  httpGet:
    path: /health
    port: ${PORT}
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  successThreshold: 1
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health
    port: ${PORT}
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  successThreshold: 1
  failureThreshold: 3

startupProbe:
  httpGet:
    path: /health
    port: ${PORT}
  initialDelaySeconds: 0
  periodSeconds: 5
  timeoutSeconds: 3
  successThreshold: 1
  failureThreshold: 30

nodeSelector: {}
tolerations: []

affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchExpressions:
              - key: app
                operator: In
                values:
                  - ${SERVICE_NAME}
          topologyKey: kubernetes.io/hostname

env:
  - name: NODE_ENV
    value: "production"
  - name: PORT
    value: "${PORT}"
  - name: LOG_LEVEL
    value: "info"

envFrom:
  - secretRef:
      name: ${SERVICE_NAME}-secrets
  - configMapRef:
      name: ${SERVICE_NAME}-config

volumeMounts: []
volumes: []

podDisruptionBudget:
  enabled: true
  minAvailable: 2

networkPolicy:
  enabled: true
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: sos-app
      ports:
        - protocol: TCP
          port: ${PORT}
  egress:
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: TCP
          port: 5432
        - protocol: TCP
          port: 6379
        - protocol: TCP
          port: 53
          protocol: UDP

serviceMonitor:
  enabled: true
  interval: 30s
  path: /metrics
  labels:
    prometheus: kube-prometheus
EOF

# Copy template files from auth-service
echo "Copying template files..."
cp -r auth-service/templates/* "${SERVICE_NAME}/templates/"

# Update _helpers.tpl
sed -i "s/auth-service/${SERVICE_NAME}/g" "${SERVICE_NAME}/templates/_helpers.tpl"

echo "✅ Helm chart for ${SERVICE_NAME} created successfully!"
echo "Location: ./${SERVICE_NAME}"
