# SOS App - Monitoring & Observability Stack

Complete monitoring, tracing, and logging solution for the SOS App microservices platform.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Components](#components)
- [Quick Start](#quick-start)
- [Prometheus](#prometheus)
- [Grafana](#grafana)
- [Jaeger](#jaeger)
- [ELK Stack](#elk-stack)
- [Dashboards](#dashboards)
- [Alerts](#alerts)
- [Troubleshooting](#troubleshooting)

## Overview

This monitoring stack provides comprehensive observability for the SOS App platform:

- **Metrics**: Prometheus + Grafana
- **Tracing**: Jaeger
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana, Filebeat)
- **Alerts**: Prometheus Alertmanager
- **Visualization**: Grafana dashboards

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SOS App Services (sos-app namespace)          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  Auth    │  │  User    │  │ Medical  │  │Emergency │  ...   │
│  │ Service  │  │ Service  │  │ Service  │  │ Service  │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │             │             │             │                 │
│       │ /metrics    │ /metrics    │ /metrics    │ traces         │
│       ▼             ▼             ▼             ▼                 │
└───────┼─────────────┼─────────────┼─────────────┼─────────────────┘
        │             │             │             │
        │             │             │             │
┌───────▼─────────────▼─────────────▼─────────────▼─────────────────┐
│                  Observability Stack (sos-app namespace)           │
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  Prometheus  │  │    Jaeger    │  │   Filebeat   │           │
│  │  (Metrics)   │  │   (Traces)   │  │ (Log Shipper)│           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                  │                  │                    │
│         ▼                  ▼                  ▼                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   Grafana    │  │  Jaeger UI   │  │  Logstash    │           │
│  │ (Dashboards) │  │              │  │  (Pipeline)  │           │
│  └──────────────┘  └──────────────┘  └──────┬───────┘           │
│                                               │                    │
│                                               ▼                    │
│  ┌─────────────────────────────────────────────────┐             │
│  │            Elasticsearch (Storage)                │             │
│  │     • Traces  • Logs  • Metrics History          │             │
│  └──────────────────────┬──────────────────────────┘             │
│                         │                                          │
│                         ▼                                          │
│                  ┌──────────────┐                                 │
│                  │    Kibana    │                                 │
│                  │  (Log UI)    │                                 │
│                  └──────────────┘                                 │
└────────────────────────────────────────────────────────────────────┘
```

## Components

### Prometheus
- **Version**: v2.47.0
- **Purpose**: Metrics collection and storage
- **Replicas**: 2 (HA)
- **Storage**: 100Gi persistent storage
- **Retention**: 30 days
- **Scrape Interval**: 30s

### Grafana
- **Version**: 10.1.5
- **Purpose**: Metrics visualization
- **Replicas**: 1
- **Storage**: 10Gi persistent storage
- **Dashboards**: API Performance, Emergency, Location, System

### Jaeger
- **Version**: 1.51
- **Purpose**: Distributed tracing
- **Components**: Collector, Query, Agent
- **Storage**: Badger (dev) / Elasticsearch (prod)
- **Sampling**: Configurable per service

### Elasticsearch
- **Version**: 8.11.0
- **Purpose**: Log and trace storage
- **Replicas**: 3 (cluster)
- **Storage**: 100Gi per node
- **Indices**: sos-app-logs-*, jaeger-span-*

### Logstash
- **Version**: 8.11.0
- **Purpose**: Log processing pipeline
- **Replicas**: 2
- **Inputs**: Filebeat (port 5044), TCP (port 5000)

### Kibana
- **Version**: 8.11.0
- **Purpose**: Log visualization
- **Replicas**: 1
- **URL**: http://kibana.sos-app.local

### Filebeat
- **Version**: 8.11.0
- **Purpose**: Log collection from pods
- **Type**: DaemonSet (runs on all nodes)
- **Target**: Kubernetes container logs

## Quick Start

### Deploy All Components

```bash
# 1. Deploy Prometheus and Grafana
kubectl apply -f monitoring/prometheus-config.yaml
kubectl apply -f monitoring/prometheus-rules.yaml
kubectl apply -f monitoring/prometheus-deployment.yaml
kubectl apply -f monitoring/grafana-deployment.yaml
kubectl apply -f monitoring/grafana-dashboards-provisioning.yaml
kubectl apply -f monitoring/grafana-dashboards/

# 2. Deploy Jaeger
kubectl apply -f monitoring/jaeger/jaeger-deployment.yaml
kubectl apply -f monitoring/jaeger/jaeger-daemonset.yaml

# 3. Deploy ELK Stack
kubectl apply -f logging/elasticsearch.yaml
kubectl apply -f logging/logstash.yaml
kubectl apply -f logging/kibana.yaml
kubectl apply -f logging/filebeat.yaml

# 4. Wait for all pods to be ready
kubectl wait --for=condition=ready pod \
  --all \
  --namespace sos-app \
  --timeout=300s
```

### Access UIs

```bash
# Grafana (metrics dashboards)
kubectl port-forward svc/grafana 3000:3000 -n sos-app
# Open: http://localhost:3000
# Default credentials: admin / admin123

# Prometheus (metrics explorer)
kubectl port-forward svc/prometheus 9090:9090 -n sos-app
# Open: http://localhost:9090

# Jaeger (distributed tracing)
kubectl port-forward svc/jaeger-query 16686:16686 -n observability
# Open: http://localhost:16686

# Kibana (log analytics)
kubectl port-forward svc/kibana 5601:5601 -n logging
# Open: http://localhost:5601
```

## Prometheus

### Metrics Endpoints

All services expose metrics at `/metrics`:

```bash
# View service metrics
kubectl exec -it <pod-name> -n sos-app -- curl localhost:3001/metrics
```

### Query Examples

```promql
# Request rate per service
sum(rate(http_requests_total{namespace="sos-app"}[5m])) by (service)

# 95th percentile latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))

# Emergency alert delivery time
histogram_quantile(0.95, rate(emergency_alert_delivery_duration_seconds_bucket[5m]))

# Location update frequency
sum(rate(location_updates_total[5m]))
```

### Custom Metrics

Services should expose these custom metrics:

```javascript
// Node.js (Prometheus client)
const promClient = require('prom-client');

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
});

const emergencyAlerts = new promClient.Counter({
  name: 'emergency_alerts_total',
  help: 'Total number of emergency alerts',
  labelNames: ['type', 'priority']
});
```

## Grafana

### Pre-configured Dashboards

1. **API Performance Dashboard**
   - Request rate by service
   - 95th percentile latency
   - Error rate percentage
   - Status code distribution
   - Slowest endpoints
   - Authentication metrics

2. **Emergency Alert Metrics**
   - Real-time alert rate
   - Alert delivery time (p50, p95, p99)
   - Success rate gauge
   - Active emergencies
   - Alerts by type
   - Escalation metrics
   - Contact notification status

3. **Location Tracking Dashboard**
   - Update frequency
   - Update latency
   - Active tracking sessions
   - Geofence violations
   - Accuracy distribution
   - GPS vs Network location
   - Distance calculations

4. **System Overview Dashboard**
   - Pod status
   - CPU/Memory usage
   - Network I/O
   - Pod restarts
   - Service health
   - Database connection pools
   - Cache hit rates

### Creating Custom Dashboards

```bash
# 1. Access Grafana UI
kubectl port-forward svc/grafana 3000:3000 -n sos-app

# 2. Login with admin/admin123

# 3. Create new dashboard
# - Add panel
# - Select Prometheus datasource
# - Enter PromQL query
# - Configure visualization
# - Save dashboard
```

## Jaeger

### Tracing Integration

**Node.js Services:**

```javascript
const { initTracer } = require('jaeger-client');

const config = {
  serviceName: 'auth-service',
  sampler: {
    type: 'probabilistic',
    param: 0.5 // Sample 50% of traces
  },
  reporter: {
    agentHost: 'localhost',
    agentPort: 6831
  }
};

const tracer = initTracer(config);

// Trace HTTP requests
app.use((req, res, next) => {
  const span = tracer.startSpan('http_request');
  span.setTag('http.method', req.method);
  span.setTag('http.url', req.url);
  req.span = span;

  res.on('finish', () => {
    span.setTag('http.status_code', res.statusCode);
    span.finish();
  });

  next();
});
```

**Go Services:**

```go
import (
    "github.com/uber/jaeger-client-go"
    "github.com/uber/jaeger-client-go/config"
)

cfg := config.Configuration{
    ServiceName: "emergency-service",
    Sampler: &config.SamplerConfig{
        Type:  jaeger.SamplerTypeProbabilistic,
        Param: 1.0, // Sample 100% for critical service
    },
    Reporter: &config.ReporterConfig{
        LocalAgentHostPort: "localhost:6831",
    },
}

tracer, closer, _ := cfg.NewTracer()
defer closer.Close()
```

### Viewing Traces

1. Access Jaeger UI: http://localhost:16686
2. Select service from dropdown
3. Filter by operation, tags, or duration
4. View trace timeline and dependencies
5. Analyze service dependencies

## ELK Stack

### Log Format

**Structured JSON Logging:**

```javascript
// Node.js with Winston
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'auth-service',
    environment: 'production'
  },
  transports: [
    new winston.transports.Console()
  ]
});

logger.info('User login successful', {
  userId: '12345',
  email: 'user@example.com',
  ip: '192.168.1.1'
});
```

**Output:**
```json
{
  "timestamp": "2025-11-07T10:00:00.000Z",
  "level": "info",
  "message": "User login successful",
  "service": "auth-service",
  "environment": "production",
  "userId": "12345",
  "email": "user@example.com",
  "ip": "192.168.1.1"
}
```

### Kibana Queries

**Search for errors:**
```
log_level:ERROR OR log_level:FATAL
```

**Emergency service logs:**
```
service:emergency-service AND log_level:INFO
```

**Specific user activity:**
```
userId:"12345" AND timestamp:[now-1h TO now]
```

**Failed authentication:**
```
service:auth-service AND message:*failed*
```

### Creating Index Patterns

```bash
# Access Kibana
kubectl port-forward svc/kibana 5601:5601 -n logging

# Navigate to Management > Stack Management > Index Patterns
# Create pattern: sos-app-logs-*
# Select timestamp field: @timestamp
```

## Alerts

### Alert Rules

50+ pre-configured alert rules in `prometheus-rules.yaml`:

**Critical Alerts:**
- ServiceDown
- CriticalAPILatency
- CriticalErrorRate
- EmergencyAlertDeliveryDelayed
- EmergencyAlertFailureRateHigh
- PodMemoryOOM
- UnauthorizedMedicalDataAccess

**Warning Alerts:**
- HighAPILatency
- HighErrorRate
- HighCPUUsage
- HighMemoryUsage
- SlowDatabaseQueries
- HighNotificationFailureRate

### Alert Configuration

Alerts are configured in Prometheus and can be sent to:
- Slack
- PagerDuty
- Email
- Webhooks

**Example Alertmanager Configuration:**

```yaml
route:
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 12h
  receiver: 'slack-critical'
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'
    - match:
        severity: warning
      receiver: 'slack-warnings'

receivers:
  - name: 'slack-critical'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#sos-app-critical'

  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_KEY'
```

## Troubleshooting

### Prometheus Not Scraping

```bash
# Check Prometheus targets
kubectl port-forward svc/prometheus 9090:9090 -n sos-app
# Open: http://localhost:9090/targets

# Verify service annotations
kubectl get pods -n sos-app -o yaml | grep -A 3 "annotations:"

# Expected annotations:
# prometheus.io/scrape: "true"
# prometheus.io/port: "3001"
# prometheus.io/path: "/metrics"
```

### Grafana Dashboard Not Loading

```bash
# Check Grafana logs
kubectl logs -f deployment/grafana -n sos-app

# Verify datasource
kubectl exec -it deployment/grafana -n sos-app -- \
  curl http://prometheus:9090/api/v1/query?query=up

# Reload dashboards
kubectl rollout restart deployment/grafana -n sos-app
```

### Jaeger Not Receiving Traces

```bash
# Check Jaeger collector
kubectl logs -f deployment/jaeger -n observability

# Verify agent connectivity
kubectl exec -it <app-pod> -n sos-app -- \
  telnet localhost 6831

# Check sampling configuration
kubectl get cm jaeger-sampling-config -n observability -o yaml
```

### Elasticsearch Yellow/Red Status

```bash
# Check cluster health
kubectl exec -it elasticsearch-0 -n logging -- \
  curl -X GET "localhost:9200/_cluster/health?pretty"

# Check indices
kubectl exec -it elasticsearch-0 -n logging -- \
  curl -X GET "localhost:9200/_cat/indices?v"

# Increase replicas if needed
kubectl scale statefulset elasticsearch --replicas=3 -n logging
```

### Logs Not Appearing in Kibana

```bash
# Check Filebeat status
kubectl get pods -n logging -l app=filebeat

# View Filebeat logs
kubectl logs -f daemonset/filebeat -n logging

# Check Logstash pipeline
kubectl logs -f deployment/logstash -n logging

# Verify Elasticsearch indices
kubectl exec -it elasticsearch-0 -n logging -- \
  curl -X GET "localhost:9200/_cat/indices?v" | grep sos-app-logs
```

## Performance Tuning

### Prometheus

```yaml
# Adjust retention
--storage.tsdb.retention.time=60d

# Increase scrape interval for high-volume metrics
scrape_interval: 60s

# Reduce cardinality
- drop:
    - __name__
    regex: 'high_cardinality_metric.*'
```

### Elasticsearch

```yaml
# Increase heap size
ES_JAVA_OPTS: "-Xms4g -Xmx4g"

# Configure index lifecycle
PUT /_ilm/policy/sos-app-logs-policy
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_age": "1d",
            "max_size": "50gb"
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "forcemerge": {
            "max_num_segments": 1
          }
        }
      },
      "delete": {
        "min_age": "30d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

## Scaling

### Horizontal Scaling

```bash
# Scale Prometheus
kubectl scale deployment prometheus --replicas=3 -n sos-app

# Scale Jaeger collector
kubectl scale deployment jaeger-collector-prod --replicas=5 -n observability

# Scale Logstash
kubectl scale deployment logstash --replicas=4 -n logging

# Scale Elasticsearch
kubectl scale statefulset elasticsearch --replicas=5 -n logging
```

### Vertical Scaling

```yaml
# Increase resources
resources:
  requests:
    cpu: 2000m
    memory: 8Gi
  limits:
    cpu: 4000m
    memory: 16Gi
```

## Best Practices

1. **Use structured logging** (JSON format)
2. **Tag metrics appropriately** (service, environment, version)
3. **Sample traces intelligently** (100% for critical paths)
4. **Set up retention policies** (7-30 days for logs, 30-90 days for metrics)
5. **Configure alerts** based on SLOs
6. **Dashboard organization** (one dashboard per service/domain)
7. **Regular cleanup** of old indices
8. **Monitor the monitors** (meta-monitoring)
9. **Document custom metrics** and their meaning
10. **Test alerting rules** before production

## Support

For issues or questions:
- Check component logs
- Review Prometheus/Grafana/Jaeger/Kibana documentation
- Consult troubleshooting section
- Open issue in project repository

---

**Last Updated**: 2025-11-07
**Version**: 1.0.0
**Maintainer**: DevOps Team
