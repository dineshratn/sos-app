# SOS App - Local Deployment

## Quick Start (5 minutes)

### 1. Deploy Phase 1 Infrastructure

```bash
cd /mnt/c/Users/dinesh.rj/Downloads/sos-app
./local-deploy.sh start
```

This will automatically:
- ✅ Start Minikube (8GB RAM, 4 CPUs, 50GB disk)
- ✅ Deploy namespace, ConfigMaps, Secrets
- ✅ Deploy databases (PostgreSQL, TimescaleDB, MongoDB, Redis)
- ✅ Deploy message brokers (Kafka, Zookeeper, Schema Registry, MQTT)
- ✅ Create 24 Kafka topics

**Time:** 5-10 minutes

### 2. Validate Deployment

```bash
./validate-deployment.sh
```

This will test:
- Minikube status
- All pods are running
- Services are accessible
- Kafka topics created
- No errors

### 3. Check Status Anytime

```bash
./local-deploy.sh status
```

## Available Commands

| Command | Description |
|---------|-------------|
| `./local-deploy.sh start` | Deploy everything |
| `./local-deploy.sh status` | Show current status |
| `./local-deploy.sh stop` | Stop Minikube |
| `./local-deploy.sh restart` | Restart everything |
| `./local-deploy.sh clean` | Delete all resources |
| `./validate-deployment.sh` | Run validation tests |

## What Gets Deployed?

### Databases
- **PostgreSQL** - Main relational database (5 databases)
- **TimescaleDB** - Time-series location data
- **MongoDB** - Document storage for logs/events
- **Redis** - Caching and sessions
- **Redis Pub/Sub** - Real-time messaging

### Message Brokers
- **Zookeeper** - Coordination service
- **Kafka** - Event streaming (24 topics)
- **Schema Registry** - Avro schema management
- **MQTT** - IoT device messaging

### Kafka Topics (24)
Emergency: created, updated, cancelled, resolved
Location: updated, shared
Contact: acknowledged, notified
Notification: sent, failed, delivered
Communication: sent, received
Device: connected, disconnected, alert
User: registered, profile-updated, deleted
Medical: profile-created, profile-updated
Analytics: audit-log, analytics-events

## Quick Tests

### Test PostgreSQL
```bash
kubectl exec -it -n sos-app postgres-0 -- psql -U postgres -d sos_app_auth
\l
```

### Test Redis
```bash
kubectl exec -it -n sos-app deployment/redis -- redis-cli PING
```

### Test Kafka Topics
```bash
kubectl exec -it -n sos-app kafka-0 -- kafka-topics --bootstrap-server localhost:9092 --list
```

### Test Schema Registry
```bash
kubectl port-forward -n sos-app svc/schema-registry-service 8081:8081 &
curl http://localhost:8081/subjects
```

## Monitoring

### View All Pods
```bash
kubectl get pods -n sos-app -w
```

### View Logs
```bash
kubectl logs -n sos-app <pod-name> -f
```

### Kubernetes Dashboard
```bash
minikube dashboard
```

### Resource Usage
```bash
kubectl top pods -n sos-app
kubectl top nodes
```

## Troubleshooting

### Pods not starting?
```bash
kubectl describe pod -n sos-app <pod-name>
kubectl logs -n sos-app <pod-name>
```

### Need more resources?
```bash
minikube delete
export MINIKUBE_MEMORY=10240  # 10GB
export MINIKUBE_CPUS=6
./local-deploy.sh start
```

### Start fresh?
```bash
./local-deploy.sh clean
./local-deploy.sh start
```

## Files Created

```
sos-app/
├── local-deploy.sh              # Main deployment script
├── validate-deployment.sh       # Validation tests
├── LOCAL-TESTING-GUIDE.md      # Comprehensive guide
├── README-LOCAL-DEPLOYMENT.md  # This file
└── infrastructure/
    └── kubernetes/
        └── base/
            ├── namespace.yaml
            ├── configmap.yaml
            ├── secrets-template.yaml
            ├── postgres-statefulset.yaml
            ├── postgres-init.sql
            ├── timescale-statefulset.yaml
            ├── timescale-init.sql
            ├── mongodb-statefulset.yaml
            ├── mongodb-init.js
            ├── redis-deployment.yaml
            ├── redis-pubsub-deployment.yaml
            ├── kafka-statefulset.yaml
            ├── zookeeper-statefulset.yaml
            ├── kafka-topics-init.sh
            ├── schema-registry-deployment.yaml
            └── mqtt-deployment.yaml
```

## System Requirements

### Minimum
- 8GB RAM available for Minikube
- 4 CPU cores
- 50GB disk space
- Docker running

### Recommended
- 12GB RAM
- 6 CPU cores
- 100GB disk space

## Next Steps

After successful deployment:

1. ✅ Verify everything with `./validate-deployment.sh`
2. ✅ Test each component (see LOCAL-TESTING-GUIDE.md)
3. ✅ Note resource usage and performance
4. ✅ Document any issues
5. ✅ Move to Phase 2: Authentication & User Services
6. ✅ Plan cloud migration

## Support

For detailed testing instructions, see:
- **LOCAL-TESTING-GUIDE.md** - Comprehensive testing guide
- **infrastructure/kubernetes/base/** - All Kubernetes manifests

## Current Status

- ✅ Phase 1: Foundation & Infrastructure (100% complete - 21/21 tasks)
- ⏳ Phase 2: Authentication & User Services (0% - ready to start)
- ⏳ Phase 3: Emergency Core (0.4% - 1/242 tasks)
- ⏳ Phase 4-6: Not started

---

**Happy Testing!** 🚀

If you encounter any issues, check the logs and events:
```bash
kubectl get events -n sos-app --sort-by='.lastTimestamp'
```
