# SOS App - Local Testing Guide

## Overview

This guide will help you deploy and test Phase 1 infrastructure on your local machine using Minikube before migrating to the cloud.

## Prerequisites

✅ All prerequisites are already installed on your machine:
- Docker (v28.5.1)
- kubectl (v1.34.1)
- Minikube (v1.37.0)

## Quick Start

### 1. Deploy Everything

```bash
cd sos-app
./local-deploy.sh start
```

This will:
1. Start Minikube with 8GB RAM, 4 CPUs, 50GB disk
2. Create the `sos-app` namespace
3. Deploy ConfigMaps and Secrets
4. Deploy all databases (PostgreSQL, TimescaleDB, MongoDB, Redis)
5. Deploy message brokers (Kafka, Zookeeper, Schema Registry, MQTT)
6. Initialize Kafka topics

**Expected time:** 5-10 minutes (depending on your internet speed)

### 2. Check Status

```bash
./local-deploy.sh status
```

### 3. Stop Everything

```bash
./local-deploy.sh stop
```

### 4. Clean Up (Remove all resources)

```bash
./local-deploy.sh clean
```

## Detailed Testing Steps

### Step 1: Verify Minikube is Running

```bash
minikube status
```

Expected output:
```
minikube
type: Control Plane
host: Running
kubelet: Running
apiserver: Running
kubeconfig: Configured
```

### Step 2: Check Namespace

```bash
kubectl get namespace sos-app
```

Expected output:
```
NAME      STATUS   AGE
sos-app   Active   Xm
```

### Step 3: Verify All Pods are Running

```bash
kubectl get pods -n sos-app
```

Expected pods:
- `postgres-0` - PostgreSQL database
- `mongodb-0` - MongoDB database
- `redis-*` - Redis cache deployment
- `redis-pubsub-*` - Redis Pub/Sub deployment
- `zookeeper-0` - Zookeeper for Kafka
- `kafka-0` - Kafka broker
- `schema-registry-*` - Schema Registry deployment
- `mqtt-*` - MQTT broker deployment

**Note:** It may take 5-10 minutes for all pods to be in `Running` status.

Check pod status continuously:
```bash
kubectl get pods -n sos-app -w
```

### Step 4: Check Persistent Volumes

```bash
kubectl get pvc -n sos-app
```

You should see PVCs for:
- PostgreSQL data
- MongoDB data
- Kafka data
- Zookeeper data

### Step 5: Check Services

```bash
kubectl get svc -n sos-app
```

Expected services:
- `postgres-service`
- `mongodb-service`
- `redis-service`
- `redis-pubsub-service`
- `kafka-service`
- `schema-registry-service`
- `mqtt-service`

## Testing Individual Components

### PostgreSQL

#### 1. Port Forward to PostgreSQL

```bash
kubectl port-forward -n sos-app svc/postgres-service 5432:5432
```

#### 2. Connect using psql (in another terminal)

```bash
# If you have psql installed
psql -h localhost -U postgres -d sos_app_auth

# Or use kubectl exec
kubectl exec -it -n sos-app postgres-0 -- psql -U postgres -d sos_app_auth
```

#### 3. Verify databases exist

```sql
\l
```

Expected databases:
- `sos_app_auth`
- `sos_app_users`
- `sos_app_emergency`
- `sos_app_devices`
- `sos_app_medical`

### MongoDB

#### 1. Port Forward to MongoDB

```bash
kubectl port-forward -n sos-app svc/mongodb-service 27017:27017
```

#### 2. Connect using mongosh

```bash
# Using kubectl exec
kubectl exec -it -n sos-app mongodb-0 -- mongosh
```

#### 3. Verify collections

```javascript
show dbs
use sos_app_logs
show collections
```

### Redis

#### 1. Port Forward to Redis

```bash
kubectl port-forward -n sos-app svc/redis-service 6379:6379
```

#### 2. Test Redis connection

```bash
# Using kubectl exec
kubectl exec -it -n sos-app deployment/redis -- redis-cli

# Test commands
127.0.0.1:6379> PING
PONG
127.0.0.1:6379> SET test "Hello from SOS App"
OK
127.0.0.1:6379> GET test
"Hello from SOS App"
```

### Kafka

#### 1. Check Kafka Topics

```bash
# Check if topics were created
kubectl exec -it -n sos-app kafka-0 -- kafka-topics \
  --bootstrap-server localhost:9092 \
  --list
```

Expected topics (24 total):
- emergency-created
- emergency-updated
- emergency-cancelled
- emergency-resolved
- location-updated
- location-shared
- contact-acknowledged
- contact-notified
- notification-sent
- notification-failed
- notification-delivered
- message-sent
- message-received
- device-connected
- device-disconnected
- device-alert
- user-registered
- user-profile-updated
- user-deleted
- medical-profile-created
- medical-profile-updated
- audit-log
- analytics-events

#### 2. Test Kafka Producer/Consumer

```bash
# Terminal 1: Start a consumer
kubectl exec -it -n sos-app kafka-0 -- kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic emergency-created \
  --from-beginning

# Terminal 2: Send a test message
kubectl exec -it -n sos-app kafka-0 -- kafka-console-producer \
  --bootstrap-server localhost:9092 \
  --topic emergency-created

# Type a message and press Enter
> {"emergencyId": "test-123", "userId": "user-456", "type": "MEDICAL"}
```

#### 3. Check Topic Details

```bash
kubectl exec -it -n sos-app kafka-0 -- kafka-topics \
  --bootstrap-server localhost:9092 \
  --describe \
  --topic emergency-created
```

Expected configuration:
- Partitions: 10
- Replication Factor: 3 (will be 1 in single-node Minikube)
- Min In-Sync Replicas: 2 (adjusted for local)

### Schema Registry

#### 1. Port Forward to Schema Registry

```bash
kubectl port-forward -n sos-app svc/schema-registry-service 8081:8081
```

#### 2. Check Schema Registry API

```bash
# List subjects
curl http://localhost:8081/subjects

# Get Schema Registry config
curl http://localhost:8081/config

# Check compatibility level
curl http://localhost:8081/config | jq
```

Expected response:
```json
{
  "compatibilityLevel": "BACKWARD"
}
```

### MQTT Broker

#### 1. Port Forward to MQTT

```bash
kubectl port-forward -n sos-app svc/mqtt-service 1883:1883
```

#### 2. Test with mosquitto_sub/pub (if installed)

```bash
# Terminal 1: Subscribe to topic
mosquitto_sub -h localhost -t "sos/test" -v

# Terminal 2: Publish message
mosquitto_pub -h localhost -t "sos/test" -m "Hello from SOS App"
```

## Monitoring and Debugging

### View Pod Logs

```bash
# View logs for a specific pod
kubectl logs -n sos-app <pod-name>

# Follow logs in real-time
kubectl logs -n sos-app <pod-name> -f

# View logs for previous pod instance (if crashed)
kubectl logs -n sos-app <pod-name> --previous
```

### Describe Pods (for troubleshooting)

```bash
kubectl describe pod -n sos-app <pod-name>
```

### Get Events

```bash
kubectl get events -n sos-app --sort-by='.lastTimestamp'
```

### Access Kubernetes Dashboard

```bash
minikube dashboard
```

This will open the Kubernetes Dashboard in your browser where you can:
- View all resources visually
- Monitor resource usage
- View logs
- Execute commands in pods

### Check Resource Usage

```bash
# Node resources
kubectl top nodes

# Pod resources
kubectl top pods -n sos-app
```

## Common Issues and Solutions

### Issue: Pods stuck in Pending state

**Solution:** Check if you have enough resources allocated to Minikube

```bash
# Delete Minikube and recreate with more resources
minikube delete
export MINIKUBE_MEMORY=10240  # 10GB
export MINIKUBE_CPUS=6
./local-deploy.sh start
```

### Issue: Pods in CrashLoopBackOff

**Solution:** Check pod logs to identify the issue

```bash
kubectl logs -n sos-app <pod-name>
kubectl describe pod -n sos-app <pod-name>
```

### Issue: ImagePullBackOff errors

**Solution:** Minikube may not have internet access or Docker registry is unreachable

```bash
# Restart Minikube
minikube stop
minikube start
```

### Issue: PVC stuck in Pending

**Solution:** Check if storage provisioner is working

```bash
kubectl get storageclass
kubectl get pv
```

### Issue: Kafka topics not created

**Solution:** Check the Kafka topics initialization job

```bash
# View job status
kubectl get jobs -n sos-app

# View job logs
kubectl logs -n sos-app job/kafka-topics-init

# Re-run the job if needed
kubectl delete job -n sos-app kafka-topics-init
# Then re-deploy
```

## Performance Tuning for Local Testing

### Reduce Replicas for Local Testing

For better performance on local machine, you can reduce replicas:

```bash
# Scale down replicas
kubectl scale statefulset kafka -n sos-app --replicas=1
kubectl scale deployment schema-registry -n sos-app --replicas=1
```

### Adjust Resource Limits

Edit deployments to reduce resource requests:

```bash
kubectl edit deployment redis -n sos-app
# Reduce memory requests/limits
```

## Testing Checklist

Use this checklist to verify everything is working:

- [ ] Minikube is running
- [ ] All pods are in Running state
- [ ] All PVCs are Bound
- [ ] PostgreSQL is accessible and has all databases
- [ ] MongoDB is accessible
- [ ] Redis is accessible and responding to commands
- [ ] Kafka is running and has all 24 topics
- [ ] Kafka producer/consumer works
- [ ] Schema Registry is accessible
- [ ] MQTT broker is accessible
- [ ] No errors in pod logs
- [ ] Resource usage is acceptable

## Next Steps

Once Phase 1 is verified locally:

1. **Document any issues encountered** and their solutions
2. **Take note of resource usage** for cloud sizing
3. **Test basic operations** (database queries, Kafka messages, etc.)
4. **Move to Phase 2** - Deploy Authentication & User Services
5. **Prepare for cloud migration**:
   - Adjust resource limits for production
   - Set up proper secrets management
   - Configure ingress/load balancers
   - Set up monitoring and logging

## Useful Commands Reference

```bash
# Quick status check
kubectl get all -n sos-app

# Delete and recreate everything
./local-deploy.sh clean
./local-deploy.sh start

# Access Minikube VM
minikube ssh

# Get Minikube IP
minikube ip

# List Minikube addons
minikube addons list

# Pause Minikube (save resources)
minikube pause

# Resume Minikube
minikube unpause

# View Minikube logs
minikube logs
```

## Support

If you encounter any issues:

1. Check pod logs: `kubectl logs -n sos-app <pod-name>`
2. Check events: `kubectl get events -n sos-app`
3. Describe resources: `kubectl describe <resource-type> <resource-name> -n sos-app`
4. Review the error messages carefully

## Architecture Verification

After successful deployment, you should have:

```
┌─────────────────────────────────────────────────────────────┐
│                    Minikube Cluster                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              sos-app Namespace                        │  │
│  │                                                       │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │  │
│  │  │  PostgreSQL  │  │  TimescaleDB │  │  MongoDB   │ │  │
│  │  │ (StatefulSet)│  │ (StatefulSet)│  │(StatefulSet)│ │  │
│  │  └──────────────┘  └──────────────┘  └────────────┘ │  │
│  │                                                       │  │
│  │  ┌──────────────┐  ┌──────────────────────────────┐ │  │
│  │  │    Redis     │  │    Redis Pub/Sub             │ │  │
│  │  │ (Deployment) │  │    (Deployment)              │ │  │
│  │  └──────────────┘  └──────────────────────────────┘ │  │
│  │                                                       │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │  │
│  │  │  Zookeeper   │  │    Kafka     │  │   MQTT     │ │  │
│  │  │ (StatefulSet)│  │ (StatefulSet)│  │(Deployment)│ │  │
│  │  └──────────────┘  └──────────────┘  └────────────┘ │  │
│  │                                                       │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │        Schema Registry (Deployment)             │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

Happy Testing! 🚀
