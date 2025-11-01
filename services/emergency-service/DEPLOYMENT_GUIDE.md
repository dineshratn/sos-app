# Emergency Service - Deployment Guide

## Quick Start

### Prerequisites
- Go 1.21+
- PostgreSQL 15+
- Apache Kafka 3.0+
- Docker (optional)

### Step 1: Setup Database

```bash
# Create database
createdb sos_app_emergency

# Or using PostgreSQL CLI
psql -U postgres -c "CREATE DATABASE sos_app_emergency;"

# Run migrations
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/sos_app_emergency?sslmode=disable"
make migrate-up
```

### Step 2: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
vim .env
```

Required variables:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=sos_app_emergency

# Kafka
KAFKA_BROKERS=localhost:9092

# Service
COUNTDOWN_SECONDS=10
ESCALATION_TIMEOUT_MIN=2
```

### Step 3: Run Service

**Option A: Local Development**
```bash
# Install dependencies
go mod download

# Run service
go run main.go
```

**Option B: Using Make**
```bash
make build
./emergency-service
```

**Option C: Docker**
```bash
make docker-build
make docker-run
```

### Step 4: Verify Service

```bash
# Health check
curl http://localhost:8080/health

# Expected response:
# {"status":"healthy","service":"emergency-service"}

# Readiness check
curl http://localhost:8080/ready

# Expected response:
# {"status":"ready","service":"emergency-service"}
```

## Kubernetes Deployment

### Create Kubernetes Manifests

```yaml
# kubernetes/emergency-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: emergency-service
  namespace: sos-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: emergency-service
  template:
    metadata:
      labels:
        app: emergency-service
    spec:
      containers:
      - name: emergency-service
        image: sos-app/emergency-service:latest
        ports:
        - containerPort: 8080
        env:
        - name: PORT
          value: "8080"
        - name: DB_HOST
          valueFrom:
            configMapKeyRef:
              name: emergency-service-config
              key: db-host
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: emergency-service-secrets
              key: db-password
        - name: KAFKA_BROKERS
          valueFrom:
            configMapKeyRef:
              name: emergency-service-config
              key: kafka-brokers
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: emergency-service
  namespace: sos-app
spec:
  selector:
    app: emergency-service
  ports:
  - port: 80
    targetPort: 8080
  type: ClusterIP
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: emergency-service-config
  namespace: sos-app
data:
  db-host: "postgres.sos-app.svc.cluster.local"
  db-port: "5432"
  db-name: "sos_app_emergency"
  kafka-brokers: "kafka.sos-app.svc.cluster.local:9092"
  countdown-seconds: "10"
  escalation-timeout-min: "2"
```

### Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace sos-app

# Create secrets
kubectl create secret generic emergency-service-secrets \
  --from-literal=db-password=your_password \
  --namespace=sos-app

# Apply manifests
kubectl apply -f kubernetes/emergency-service-deployment.yaml

# Verify deployment
kubectl get pods -n sos-app
kubectl logs -f deployment/emergency-service -n sos-app
```

## Testing

### Unit Tests
```bash
make test
```

### Integration Tests

```bash
# Test trigger emergency
curl -X POST http://localhost:8080/api/v1/emergency/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "emergency_type": "MEDICAL",
    "location": {
      "latitude": 37.7749,
      "longitude": -122.4194,
      "timestamp": "2025-10-30T10:00:00Z"
    },
    "triggered_by": "user",
    "auto_triggered": false
  }'

# Get emergency
curl http://localhost:8080/api/v1/emergency/{emergency_id}

# Acknowledge emergency
curl -X POST http://localhost:8080/api/v1/emergency/{emergency_id}/acknowledge \
  -H "Content-Type: application/json" \
  -d '{
    "contact_id": "223e4567-e89b-12d3-a456-426614174000",
    "contact_name": "John Doe",
    "contact_phone": "+1234567890"
  }'

# Resolve emergency
curl -X PUT http://localhost:8080/api/v1/emergency/{emergency_id}/resolve \
  -H "Content-Type: application/json" \
  -d '{
    "resolution_notes": "Emergency resolved safely"
  }'
```

## Monitoring

### Metrics to Track

1. **Emergency Metrics:**
   - Total emergencies triggered
   - Active emergencies count
   - Average countdown time
   - Cancellation rate
   - Resolution time

2. **Acknowledgment Metrics:**
   - Average acknowledgment time
   - Escalation rate
   - Multiple acknowledgments per emergency

3. **System Metrics:**
   - Request latency (p50, p95, p99)
   - Error rate
   - Database connection pool usage
   - Kafka message lag

### Prometheus Integration

```go
// Add to main.go for Prometheus metrics
import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

// Example metrics
var (
    emergencyCounter = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "emergency_total",
            Help: "Total number of emergencies triggered",
        },
        []string{"type"},
    )

    emergencyDuration = prometheus.NewHistogram(
        prometheus.HistogramOpts{
            Name: "emergency_duration_seconds",
            Help: "Duration of emergencies from trigger to resolution",
        },
    )
)

// Add metrics endpoint
router.Handle("/metrics", promhttp.Handler())
```

## Troubleshooting

### Common Issues

**1. Database Connection Failed**
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Verify credentials
psql -U postgres -d sos_app_emergency -c "SELECT 1;"
```

**2. Kafka Connection Failed**
```bash
# Check Kafka is running
kafka-topics.sh --list --bootstrap-server localhost:9092

# Verify topics exist
kafka-topics.sh --describe --topic emergency-created --bootstrap-server localhost:9092
```

**3. Port Already in Use**
```bash
# Find process using port 8080
lsof -i :8080

# Change port in .env
PORT=8081
```

**4. Countdown Timer Not Working**
```bash
# Check logs for timer creation
grep "Starting countdown timer" logs/emergency-service.log

# Verify status transition
psql -d sos_app_emergency -c "SELECT id, status, activated_at FROM emergencies ORDER BY created_at DESC LIMIT 5;"
```

## Performance Tuning

### Database Optimization

```sql
-- Add additional indexes if needed
CREATE INDEX CONCURRENTLY idx_emergencies_created_at_user
ON emergencies(user_id, created_at DESC);

-- Analyze table statistics
ANALYZE emergencies;
ANALYZE emergency_acknowledgments;

-- Check slow queries
SELECT * FROM pg_stat_statements
WHERE query LIKE '%emergencies%'
ORDER BY total_exec_time DESC LIMIT 10;
```

### Connection Pool Tuning

```env
# Increase pool size for high load
DB_MAX_CONNS=50
DB_MIN_CONNS=10
```

### Kafka Performance

```env
# Increase batch size for higher throughput
# (requires code changes in producer.go)
```

## Security Best Practices

1. **Use Secrets Management:**
   - Kubernetes Secrets
   - HashiCorp Vault
   - AWS Secrets Manager

2. **Enable TLS:**
   - Database connections
   - Kafka connections
   - HTTPS for API

3. **Network Policies:**
   - Restrict pod-to-pod communication
   - Only allow necessary ports

4. **Authentication:**
   - Integrate with Auth Service
   - Validate JWT tokens
   - Implement rate limiting

## Backup and Recovery

### Database Backups

```bash
# Manual backup
pg_dump -U postgres sos_app_emergency > backup_$(date +%Y%m%d).sql

# Restore from backup
psql -U postgres sos_app_emergency < backup_20251030.sql
```

### Disaster Recovery

1. **Database replication** for high availability
2. **Multi-region Kafka** for fault tolerance
3. **Kubernetes pod autoscaling** for resilience
4. **Regular backup testing**

## Scaling

### Horizontal Scaling

```bash
# Increase replicas
kubectl scale deployment emergency-service --replicas=5 -n sos-app

# Enable autoscaling
kubectl autoscale deployment emergency-service \
  --min=3 --max=10 \
  --cpu-percent=70 \
  -n sos-app
```

### Database Scaling

- Use read replicas for GET operations
- Partition large tables by date
- Implement caching layer (Redis)

## Support

For issues or questions:
- Check logs: `kubectl logs -f deployment/emergency-service -n sos-app`
- Review metrics: `http://localhost:8080/metrics`
- Consult documentation: `README.md`, `IMPLEMENTATION_SUMMARY.md`

---

**Version:** 1.0.0
**Last Updated:** 2025-10-30
