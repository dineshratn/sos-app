# SOS App Microservices Deployment Guide (Tasks 21-35)

## Overview

This document provides deployment specifications for all SOS App microservices (Tasks 21-30). Each service follows the same base pattern with service-specific configurations.

**Status:** Tasks 21-22 Complete (detailed YAMLs), Tasks 23-30 Template-based

---

## Completed Service Deployments

### ✅ Task 21: Auth Service (auth-service.yaml)
- **Purpose:** Authentication, JWT, OAuth
- **Database:** PostgreSQL (sos_app_auth)
- **Ports:** HTTP 8080, gRPC 9090, Metrics 9091
- **Replicas:** 3-10 (HPA)
- **Resources:** 100m-500m CPU, 128-512Mi memory

### ✅ Task 22: User Service (user-service.yaml)
- **Purpose:** User profiles, emergency contacts
- **Database:** PostgreSQL (sos_app_users)
- **Ports:** HTTP 8080, gRPC 9090, Metrics 9091
- **Replicas:** 3-10 (HPA)
- **Resources:** 100m-500m CPU, 128-512Mi memory

---

## Service Deployment Template

All remaining services follow this pattern. Copy and modify for each service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: {SERVICE_NAME}
  namespace: sos-app
  labels:
    app.kubernetes.io/name: {SERVICE_NAME}
    app.kubernetes.io/component: backend
    app.kubernetes.io/part-of: sos-app
spec:
  type: ClusterIP
  ports:
  - name: http
    port: 8080
    targetPort: 8080
  - name: grpc
    port: 9090
    targetPort: 9090
  - name: metrics
    port: 9091
    targetPort: 9091
  selector:
    app.kubernetes.io/name: {SERVICE_NAME}

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {SERVICE_NAME}
  namespace: sos-app
  labels:
    app.kubernetes.io/name: {SERVICE_NAME}
    app.kubernetes.io/version: "1.0.0"
spec:
  replicas: 3
  selector:
    matchLabels:
      app.kubernetes.io/name: {SERVICE_NAME}
  template:
    metadata:
      labels:
        app.kubernetes.io/name: {SERVICE_NAME}
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9091"
    spec:
      priorityClassName: sos-app-high
      containers:
      - name: {SERVICE_NAME}
        image: sos-app/{SERVICE_NAME}:latest
        ports:
        - containerPort: 8080
        - containerPort: 9090
        - containerPort: 9091
        env:
        - name: SERVICE_NAME
          value: "{SERVICE_NAME}"
        # Add service-specific env vars
        resources:
          requests:
            cpu: {CPU_REQUEST}
            memory: {MEMORY_REQUEST}
          limits:
            cpu: {CPU_LIMIT}
            memory: {MEMORY_LIMIT}
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8080
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          capabilities:
            drop: [ALL]
```

---

## Task 23: Emergency Service

**File:** `emergency-service.yaml`

### Configuration
- **Language:** Go
- **Database:** PostgreSQL (sos_app_emergency)
- **Message Broker:** Kafka (producer/consumer)
- **Real-time:** Redis Pub/Sub
- **Replicas:** 5-15 (critical service, high traffic)
- **Resources:** 200m-1 CPU, 256Mi-1Gi memory

### Environment Variables
```yaml
DB_NAME: sos_app_emergency
KAFKA_TOPICS: emergency.created,emergency.updated,emergency.resolved
REDIS_PUBSUB_HOST: redis-pubsub-service
LOCATION_SERVICE_URL: http://location-service:9090
NOTIFICATION_SERVICE_URL: http://notification-service:9090
USER_SERVICE_URL: http://user-service:9090
```

### API Endpoints
```
POST   /api/v1/emergencies              - Create emergency
GET    /api/v1/emergencies/:id          - Get emergency details
PUT    /api/v1/emergencies/:id          - Update emergency
POST   /api/v1/emergencies/:id/resolve  - Resolve emergency
POST   /api/v1/emergencies/:id/escalate - Escalate emergency
GET    /api/v1/emergencies              - List user emergencies
POST   /api/v1/emergencies/:id/ack      - Acknowledge (contact)
```

### Database Schema
```sql
emergencies:
- id, user_id, type (MEDICAL, FIRE, POLICE, FALL, etc.)
- status (CREATED, ACKNOWLEDGED, IN_PROGRESS, RESOLVED)
- latitude, longitude, address
- created_at, acknowledged_at, resolved_at

emergency_acknowledgments:
- id, emergency_id, contact_id
- acknowledged_at, location_shared
```

### Kafka Events
- **Produces:** `emergency.created`, `emergency.updated`, `emergency.resolved`
- **Consumes:** `location.realtime` (for emergency tracking)

---

## Task 24: Location Service

**File:** `location-service.yaml`

### Configuration
- **Language:** Go
- **Database:** TimescaleDB (sos_app_location)
- **Message Broker:** Kafka
- **Replicas:** 5-20 (high throughput)
- **Resources:** 200m-1 CPU, 256Mi-1Gi memory

### Environment Variables
```yaml
TIMESCALE_HOST: timescale-service
DB_NAME: sos_app_location
KAFKA_TOPICS: location.realtime,location.geofence
REDIS_PUBSUB_HOST: redis-pubsub-service
EMERGENCY_SERVICE_URL: http://emergency-service:9090
GOOGLE_MAPS_API_KEY: (from secret)
```

### API Endpoints
```
POST   /api/v1/location/update          - Update location
GET    /api/v1/location/latest/:userId  - Get latest location
GET    /api/v1/location/trail/:emergencyId - Get emergency trail
POST   /api/v1/location/geofence        - Create geofence
GET    /api/v1/location/nearby          - Find nearby users
```

### Performance Requirements
- **Ingestion:** 10,000+ location updates/second
- **Latency:** <50ms p99
- **Retention:** 7 days detailed, 90 days emergency trails

---

## Task 25: Medical Service

**File:** `medical-service.yaml`

### Configuration
- **Language:** Go
- **Database:** PostgreSQL (sos_app_medical) - HIPAA compliant
- **Encryption:** Field-level (pgcrypto)
- **Replicas:** 3-8
- **Resources:** 100m-500m CPU, 128-512Mi memory

### Environment Variables
```yaml
DB_NAME: sos_app_medical
ENCRYPTION_KEY: (from secret - medical-encryption-key)
AUDIT_ENABLED: true
KAFKA_AUDIT_TOPIC: audit.access
HIPAA_LOGGING: enabled
```

### API Endpoints
```
GET    /api/v1/medical/profile          - Get medical profile
PUT    /api/v1/medical/profile          - Update medical profile
POST   /api/v1/medical/conditions       - Add condition
DELETE /api/v1/medical/conditions/:id   - Remove condition
GET    /api/v1/medical/medications      - List medications
POST   /api/v1/medical/allergies        - Add allergy
GET    /api/v1/medical/emergency-info   - Get emergency medical info
```

### Security Features
- Field-level encryption for sensitive data
- Audit logging for all access (HIPAA)
- RBAC with fine-grained permissions
- Auto-expiring access grants

---

## Task 26: Device Service

**File:** `device-service.yaml`

### Configuration
- **Language:** Go
- **Database:** PostgreSQL (sos_app_devices)
- **MQTT:** Device communication
- **MongoDB:** Device telemetry
- **Replicas:** 3-10
- **Resources:** 100m-500m CPU, 128-512Mi memory

### Environment Variables
```yaml
DB_NAME: sos_app_devices
MQTT_BROKER: mqtt-service:1883
MQTT_USERNAME: sos_service
MONGODB_HOST: mongodb-service
MONGODB_DATABASE: device_telemetry
KAFKA_TOPICS: device.alerts,device.telemetry
```

### API Endpoints
```
POST   /api/v1/devices/register         - Register device
GET    /api/v1/devices                  - List user devices
PUT    /api/v1/devices/:id              - Update device
DELETE /api/v1/devices/:id              - Remove device
GET    /api/v1/devices/:id/telemetry    - Get device telemetry
POST   /api/v1/devices/:id/command      - Send command
```

### MQTT Topics (Subscribed)
- `device/+/telemetry` - Device metrics
- `device/+/alert` - Device alerts (fall, button)
- `device/+/status` - Online/offline status

### MQTT Topics (Published)
- `device/{deviceId}/command` - Commands to device
- `device/{deviceId}/config` - Configuration updates

---

## Task 27: Communication Service

**File:** `communication-service.yaml`

### Configuration
- **Language:** Node.js (WebSocket support)
- **Database:** MongoDB (emergency_messages)
- **Real-time:** Redis Pub/Sub
- **S3:** Media storage
- **Replicas:** 5-20 (WebSocket connections)
- **Resources:** 100m-500m CPU, 256Mi-1Gi memory

### Environment Variables
```yaml
MONGODB_HOST: mongodb-service
MONGODB_DATABASE: emergency_messages
REDIS_PUBSUB_HOST: redis-pubsub-service
S3_MEDIA_BUCKET: (from secret)
WEBSOCKET_PORT: 8080
GOOGLE_SPEECH_API_KEY: (from secret - for audio transcription)
MAX_CONNECTIONS_PER_POD: 5000
```

### WebSocket Events
```javascript
// Client -> Server
connect(token)
send_message(emergencyId, message)
send_media(emergencyId, mediaData)
typing_indicator(emergencyId)

// Server -> Client
message_received(message)
location_update(location)
emergency_updated(status)
contact_acknowledged(contactId)
```

### API Endpoints
```
GET    /api/v1/messages/:emergencyId    - Get messages
POST   /api/v1/messages/:emergencyId    - Send message
POST   /api/v1/media/upload             - Upload media
GET    /api/v1/media/:id                - Get media URL
WebSocket: /ws                           - WebSocket connection
```

---

## Task 28: Notification Service

**File:** `notification-service.yaml`

### Configuration
- **Language:** Node.js
- **Database:** MongoDB (for notification history)
- **Message Broker:** Kafka consumer
- **Replicas:** 3-10
- **Resources:** 100m-500m CPU, 128-512Mi memory

### Environment Variables
```yaml
KAFKA_CONSUMER_GROUP: notification-service
KAFKA_TOPICS: emergency.created,emergency.updated
TWILIO_ACCOUNT_SID: (from secret)
TWILIO_AUTH_TOKEN: (from secret)
FCM_SERVER_KEY: (from secret - Firebase)
APNS_KEY_ID: (from secret - Apple Push)
SENDGRID_API_KEY: (from secret)
```

### Notification Channels
1. **Push Notifications** (FCM/APNS)
2. **SMS** (Twilio)
3. **Email** (SendGrid)
4. **Voice Call** (Twilio)

### API Endpoints
```
POST   /api/v1/notifications/send       - Send notification
GET    /api/v1/notifications            - List notifications
PUT    /api/v1/notifications/:id/read   - Mark as read
GET    /api/v1/notifications/settings   - Get settings
PUT    /api/v1/notifications/settings   - Update settings
POST   /api/v1/notifications/test       - Test notification
```

### Kafka Consumers
- `emergency.created` → Send alerts to emergency contacts
- `emergency.updated` → Send status updates
- `device.alerts` → Send device alert notifications

---

## Task 29: API Gateway

**File:** `api-gateway.yaml`

### Configuration
- **Technology:** Kong or Nginx + Lua
- **Purpose:** Single entry point, rate limiting, auth
- **Replicas:** 5-15
- **Resources:** 200m-1 CPU, 256-512Mi memory

### Features
- **Authentication:** JWT validation (via Auth Service)
- **Rate Limiting:** Per-user, per-endpoint
- **Request Transformation:** Header injection, body transformation
- **Response Caching:** Redis-backed caching
- **CORS:** Cross-origin configuration
- **Logging:** Access logs, request/response logging
- **Metrics:** Prometheus metrics

### Routes
```yaml
/api/v1/auth/*       -> auth-service:8080
/api/v1/users/*      -> user-service:8080
/api/v1/emergencies/* -> emergency-service:8080
/api/v1/location/*   -> location-service:8080
/api/v1/medical/*    -> medical-service:8080
/api/v1/devices/*    -> device-service:8080
/api/v1/messages/*   -> communication-service:8080
/api/v1/notifications/* -> notification-service:8080
/ws                  -> communication-service:8080 (WebSocket)
```

### Rate Limiting
```yaml
Default: 1000 requests/minute per user
Auth endpoints: 100 requests/minute
Emergency creation: 10 requests/minute
Location updates: 2 requests/second
```

---

## Task 30: Service Mesh (Istio)

**File:** `service-mesh-config.yaml`

### Components
1. **Istio Control Plane** (istiod)
2. **Istio Ingress Gateway**
3. **Istio Egress Gateway** (for external APIs)
4. **Envoy Sidecars** (auto-injected)

### Features
- **Traffic Management:** Canary deployments, A/B testing
- **Security:** mTLS between services
- **Observability:** Distributed tracing, metrics
- **Resilience:** Circuit breakers, retries, timeouts

### Configuration

**Enable Istio Injection:**
```bash
kubectl label namespace sos-app istio-injection=enabled
```

**Virtual Service Example:**
```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: emergency-service
  namespace: sos-app
spec:
  hosts:
  - emergency-service
  http:
  - match:
    - headers:
        x-version:
          exact: canary
    route:
    - destination:
        host: emergency-service
        subset: canary
      weight: 10
    - destination:
        host: emergency-service
        subset: stable
      weight: 90
```

**Circuit Breaker:**
```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: emergency-service
spec:
  host: emergency-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
    outlierDetection:
      consecutiveErrors: 5
      interval: 30s
      baseEjectionTime: 30s
```

---

## Deployment Summary

### Service Resource Requirements

| Service | Replicas | CPU Request | Memory Request | Priority |
|---------|----------|-------------|----------------|----------|
| Auth | 3-10 | 100m | 128Mi | High |
| User | 3-10 | 100m | 128Mi | High |
| Emergency | 5-15 | 200m | 256Mi | Critical |
| Location | 5-20 | 200m | 256Mi | Critical |
| Medical | 3-8 | 100m | 128Mi | High |
| Device | 3-10 | 100m | 128Mi | High |
| Communication | 5-20 | 100m | 256Mi | Critical |
| Notification | 3-10 | 100m | 128Mi | High |
| API Gateway | 5-15 | 200m | 256Mi | Critical |
| **TOTAL (Min)** | **35 pods** | **4.5 cores** | **6Gi** | |
| **TOTAL (Max)** | **118 pods** | **15+ cores** | **25+Gi** | |

### Deployment Order

```bash
# 1. Core Services (auth, user)
kubectl apply -f auth-service.yaml
kubectl apply -f user-service.yaml
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=auth-service -n sos-app
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=user-service -n sos-app

# 2. Business Logic Services
kubectl apply -f emergency-service.yaml
kubectl apply -f location-service.yaml
kubectl apply -f medical-service.yaml
kubectl apply -f device-service.yaml

# 3. Supporting Services
kubectl apply -f communication-service.yaml
kubectl apply -f notification-service.yaml

# 4. Gateway
kubectl apply -f api-gateway.yaml

# 5. Service Mesh (optional)
istioctl install --set profile=production
kubectl label namespace sos-app istio-injection=enabled
kubectl rollout restart deployment -n sos-app
```

### Health Checks

```bash
# Check all services
kubectl get pods -n sos-app -l app.kubernetes.io/component=backend

# Check service endpoints
for svc in auth user emergency location medical device communication notification; do
  echo "Testing $svc-service..."
  kubectl run -it --rm curl --image=curlimages/curl --restart=Never -n sos-app -- \
    curl -s http://$svc-service:8080/health/ready
done
```

### Service Dependencies

```
Auth Service (no dependencies)
  ↓
User Service (requires Auth)
  ↓
Emergency Service (requires User, Location)
  ↓
Location Service (requires Emergency)
  ↓
Medical Service (requires User)
  ↓
Device Service (requires User, Emergency)
  ↓
Communication Service (requires Emergency, User)
  ↓
Notification Service (requires User, Emergency)
  ↓
API Gateway (requires all services)
```

---

## Next Steps

1. **Create service-specific Dockerfiles** in `services/` directories
2. **Implement service code** (Go/Node.js)
3. **Build and push Docker images**
4. **Apply Kubernetes manifests**
5. **Configure Istio** (if using service mesh)
6. **Set up monitoring** (Prometheus, Grafana)
7. **Configure logging** (ELK/Loki)
8. **Enable distributed tracing** (Jaeger)

---

**Tasks 21-30 Status:** Architecture Complete, Implementation Ready
**Last Updated:** 2025-10-29
