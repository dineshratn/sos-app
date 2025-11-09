# Tasks 12-16 Status: Database Setup (Partial Completion)

## Overview

Database setup tasks for SOS App infrastructure.

## Completion Status

### ✅ Task 12: PostgreSQL Initialization Script - COMPLETE

**File Created:** `postgres-init.sql` (10.2 KB)

**What It Does:**
- Creates 5 isolated databases:
  - `sos_app_auth` - Authentication data
  - `sos_app_users` - User profiles and emergency contacts
  - `sos_app_emergency` - Emergency alerts and acknowledgments
  - `sos_app_medical` - Medical profiles (HIPAA-compliant)
  - `sos_app_devices` - IoT device management

- Creates 6 database roles with least privilege:
  - `auth_service` - Full access to auth database only
  - `user_service` - Full access to users database only
  - `emergency_service` - Full access to emergency database only
  - `medical_service` - Full access to medical database only
  - `device_service` - Full access to devices database only
  - `readonly_service` - Read-only access to all databases (analytics)

- Enables PostgreSQL extensions:
  - `uuid-ossp` - UUID generation
  - `pgcrypto` - Encryption functions (for HIPAA)
  - `postgis` - Geospatial support (for emergency database)

- Security features:
  - Connection limits per role (50-100 connections)
  - Schema-level isolation
  - RBAC-based access control
  - Default privileges for future tables
  - Placeholder passwords (must be changed!)

**Usage:**
```bash
# Create ConfigMap from init script
kubectl create configmap postgres-init-scripts \
  --from-file=init.sql=postgres-init.sql \
  -n sos-app

# The PostgreSQL StatefulSet (Task 11) already mounts this
# Script runs automatically on first startup
```

**Connection Strings:**
```
Auth:      postgresql://auth_service:PASSWORD@postgres-service:5432/sos_app_auth
Users:     postgresql://user_service:PASSWORD@postgres-service:5432/sos_app_users
Emergency: postgresql://emergency_service:PASSWORD@postgres-service:5432/sos_app_emergency
Medical:   postgresql://medical_service:PASSWORD@postgres-service:5432/sos_app_medical
Devices:   postgresql://device_service:PASSWORD@postgres-service:5432/sos_app_devices
Read-Only: postgresql://readonly_service:PASSWORD@postgres-readonly-service:5432/sos_app_*
```

---

### ⏸️ Tasks 13-16: Remaining Database Infrastructure - PENDING

Due to context length limitations, Tasks 13-16 are documented below with implementation guidelines.

---

## Task 13: TimescaleDB StatefulSet (Location Data)

**File to Create:** `timescale-statefulset.yaml`

**Purpose:** Time-series database optimized for location tracking data

**Requirements:**
- Base image: `timescale/timescaledb:latest-pg15` (TimescaleDB + PostgreSQL 15)
- Hypertable for location data (partitioned by time)
- Retention policy: 7 days for detailed data, 90 days for aggregated
- Compression after 1 day
- 3 replicas for high availability
- 50Gi storage per replica (150Gi total)
- Resources: 500m-1 CPU, 1-2Gi memory per pod
- Continuous aggregates for performance (hourly, daily summaries)

**Key Configuration:**
```sql
-- Create hypertable
SELECT create_hypertable('location_updates', 'timestamp');

-- Retention policy (keep 7 days detailed)
SELECT add_retention_policy('location_updates', INTERVAL '7 days');

-- Compression policy (compress after 1 day)
SELECT add_compression_policy('location_updates', INTERVAL '1 day');

-- Continuous aggregate (hourly summaries)
CREATE MATERIALIZED VIEW location_hourly
WITH (timescaledb.continuous) AS
SELECT user_id,
       time_bucket('1 hour', timestamp) AS hour,
       COUNT(*) as update_count,
       AVG(latitude) as avg_latitude,
       AVG(longitude) as avg_longitude
FROM location_updates
GROUP BY user_id, hour;
```

**Integration:**
- Used by Location Service (Go)
- Stores real-time location updates during emergencies
- Provides location trail/history
- Optimized for time-range queries

---

## Task 14: MongoDB StatefulSet (Logs & Events)

**File to Create:** `mongodb-statefulset.yaml`

**Purpose:** Document database for unstructured data (logs, messages, events)

**Requirements:**
- Image: `mongo:7.0`
- Replica set with 3 members
- Authentication enabled (SCRAM-SHA-256)
- Storage: 100Gi per replica (300Gi total)
- Resources: 500m-1 CPU, 1-2Gi memory per pod
- Collections:
  - `emergency_logs` - Emergency event logs
  - `emergency_messages` - Communication messages
  - `emergency_media` - Media metadata (S3 references)
  - `audit_logs` - HIPAA audit trail
  - `device_telemetry` - IoT device data

**Replica Set Configuration:**
```yaml
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: mongodb
        image: mongo:7.0
        env:
        - name: MONGO_INITDB_ROOT_USERNAME
          value: "admin"
        - name: MONGO_INITDB_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mongodb-credentials
              key: mongodb-root-password
        command:
        - mongod
        - "--replSet=sos-app-rs"
        - "--bind_ip_all"
        - "--auth"
```

**Integration:**
- Used by Communication Service
- Stores emergency logs and message history
- HIPAA audit logging
- Device telemetry storage

---

## Task 15: Redis Deployment (Caching & Sessions)

**File to Create:** `redis-deployment.yaml`

**Purpose:** In-memory cache for auth tokens, sessions, and frequently accessed data

**Requirements:**
- Image: `redis:7.2-alpine`
- Persistence: RDB + AOF (Append-Only File)
- Single instance or master-replica (2 replicas)
- Storage: 10Gi for persistence
- Resources: 100m-500m CPU, 256Mi-1Gi memory
- Password authentication
- Eviction policy: `allkeys-lru` (Least Recently Used)

**Configuration:**
```yaml
# redis.conf
maxmemory 512mb
maxmemory-policy allkeys-lru
save 900 1           # Save after 900 sec if 1 key changed
save 300 10          # Save after 300 sec if 10 keys changed
save 60 10000        # Save after 60 sec if 10000 keys changed
appendonly yes       # Enable AOF
appendfsync everysec # AOF sync every second
```

**Use Cases:**
- JWT token blacklist (logout, revocation)
- Session storage
- User profile cache (30min TTL)
- Emergency contact cache (1hour TTL)
- Rate limiting counters
- API response cache

**Integration:**
- Used by all services for caching
- Auth Service for session management
- Reduces database load

---

## Task 16: Redis Pub/Sub Deployment (Real-Time Features)

**File to Create:** `redis-pubsub-deployment.yaml`

**Purpose:** Separate Redis instance for publish/subscribe messaging (WebSocket scaling)

**Requirements:**
- Image: `redis:7.2-alpine`
- NO persistence (pub/sub is ephemeral)
- 2-3 replicas for availability
- Resources: 100m-200m CPU, 128-256Mi memory
- No password (internal only, NetworkPolicy-protected)
- High throughput configuration

**Configuration:**
```yaml
# redis-pubsub.conf
maxmemory 128mb
maxmemory-policy noeviction  # Don't evict for pub/sub
save ""                      # Disable persistence
```

**Channels:**
- `emergency:{emergencyId}` - Emergency-specific events
- `location:{userId}` - Real-time location updates
- `notification:{userId}` - Real-time notifications
- `presence:{userId}` - User online/offline status

**Use Cases:**
- WebSocket message broadcasting across pods
- Real-time location updates to emergency contacts
- Real-time notification delivery
- Presence detection (online/offline)
- Chat/communication features

**Integration:**
- Used by Communication Service
- Used by Location Service for real-time tracking
- Used by Notification Service
- Enables horizontal scaling of WebSocket servers

---

## Implementation Recommendations

### Priority Order:
1. ✅ **Task 12**: PostgreSQL init script (DONE)
2. **Task 15**: Redis (caching) - Needed for all services
3. **Task 16**: Redis Pub/Sub - Needed for real-time features
4. **Task 13**: TimescaleDB - Needed for Location Service
5. **Task 14**: MongoDB - Needed for Communication Service

### Quick Implementation Guide:

**For Tasks 13-16, follow this pattern (based on Task 11 PostgreSQL):**

1. **Create StatefulSet/Deployment YAML:**
   - Service (headless for StatefulSet)
   - StatefulSet or Deployment
   - PersistentVolumeClaim template (for StatefulSets)
   - ConfigMap for configuration
   - Resource limits and requests
   - Health checks (liveness, readiness)
   - Security context (non-root)
   - Anti-affinity rules

2. **Add to secrets-template.yaml:**
   - Database credentials
   - Connection strings

3. **Update configmap.yaml:**
   - Service endpoints
   - Connection settings
   - Configuration parameters

4. **Create init scripts (if needed):**
   - TimescaleDB: hypertable setup, retention policies
   - MongoDB: replica set initialization, collections

5. **Documentation:**
   - Usage examples
   - Connection strings
   - Monitoring setup
   - Backup procedures

### Estimated Effort:
- Task 13 (TimescaleDB): ~2-3 hours (similar to PostgreSQL)
- Task 14 (MongoDB): ~2-3 hours (replica set complexity)
- Task 15 (Redis): ~1 hour (simpler, single instance or master-replica)
- Task 16 (Redis Pub/Sub): ~30 minutes (simplified Redis)

**Total: ~6-8 hours for all 4 tasks**

---

## Current Status Summary

**Completed:**
- ✅ Task 12: PostgreSQL initialization script

**Remaining:**
- ⏸️ Task 13: TimescaleDB StatefulSet
- ⏸️ Task 14: MongoDB StatefulSet
- ⏸️ Task 15: Redis Deployment
- ⏸️ Task 16: Redis Pub/Sub Deployment

**Database Infrastructure Progress: 1/5 tasks (20%)**

---

## Next Steps

1. **Complete Tasks 13-16** using the guidelines above
2. **Test database connectivity:**
   ```bash
   # PostgreSQL
   kubectl exec -it postgres-0 -n sos-app -c postgres -- \
     psql -U postgres -c "\l"

   # TimescaleDB (when ready)
   kubectl exec -it timescale-0 -n sos-app -- \
     psql -U postgres -c "SELECT * FROM timescaledb_information.hypertables;"

   # MongoDB (when ready)
   kubectl exec -it mongodb-0 -n sos-app -- \
     mongosh --eval "rs.status()"

   # Redis (when ready)
   kubectl exec -it redis-0 -n sos-app -- redis-cli ping
   ```

3. **Update secrets** with actual passwords
4. **Apply all database infrastructure**
5. **Proceed to Task 17-20** (Message Brokers: Kafka, MQTT)

---

**Tasks 12-16 Status:** Partially Complete (1/5)
**Last Updated:** 2025-10-29
**Ready for:** Service implementation (once Tasks 13-16 are completed)
