# SOS App - API Gateway

## Overview

The API Gateway is the central entry point for all client requests in the SOS App microservices architecture. It handles request routing, authentication, rate limiting, load balancing, and provides a unified API interface for all backend services.

## Features

- **Request Routing**: Routes requests to appropriate microservices
- **Authentication**: JWT token validation and user authentication
- **Rate Limiting**: Redis-based distributed rate limiting
- **Circuit Breaker**: Prevents cascading failures with circuit breaker pattern
- **Load Balancing**: Distributes requests across service instances
- **Request/Response Logging**: Comprehensive logging for monitoring
- **Error Handling**: Centralized error handling and standardized responses
- **Health Checks**: Kubernetes-ready health check endpoints
- **CORS**: Configurable cross-origin resource sharing
- **Compression**: Response compression for improved performance
- **Security**: Helmet.js security headers

## Architecture

```
┌─────────────┐
│   Clients   │
│ (Web/Mobile)│
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│        API Gateway              │
│  - Authentication               │
│  - Rate Limiting                │
│  - Request Routing              │
│  - Circuit Breaker              │
└────────┬────────────────────────┘
         │
    ┌────┴─────┬──────────┬────────────┬─────────────┬────────────┐
    │          │          │            │             │            │
    ▼          ▼          ▼            ▼             ▼            ▼
┌────────┐ ┌──────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐
│  Auth  │ │ User │ │Emergency │ │ Location │ │Notification│ │Communication│
│Service │ │Service│ │ Service  │ │ Service  │ │  Service  │ │  Service   │
└────────┘ └──────┘ └──────────┘ └──────────┘ └──────────┘ └────────────┘
```

## Technology Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript
- **HTTP Client**: Axios
- **Rate Limiting**: Redis + rate-limit-redis
- **Logging**: Winston
- **Security**: Helmet.js
- **Compression**: compression middleware

## Project Structure

```
api-gateway/
├── src/
│   ├── config/
│   │   └── index.ts                 # Configuration management
│   ├── middleware/
│   │   ├── authMiddleware.ts        # JWT authentication
│   │   ├── errorHandler.ts          # Error handling
│   │   └── rateLimiter.ts          # Rate limiting
│   ├── routes/
│   │   ├── auth.routes.ts           # Auth service routes
│   │   ├── user.routes.ts           # User service routes
│   │   ├── emergency.routes.ts      # Emergency service routes
│   │   ├── location.routes.ts       # Location service routes
│   │   ├── notification.routes.ts   # Notification service routes
│   │   └── communication.routes.ts  # Communication service routes
│   ├── utils/
│   │   ├── logger.ts                # Winston logger
│   │   └── httpClient.ts            # HTTP client with retry logic
│   └── index.ts                     # Application entry point
├── tests/
│   ├── unit/                        # Unit tests
│   └── integration/                 # Integration tests
├── package.json
├── tsconfig.json
├── Dockerfile
├── .env.example
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 20+
- Redis 6+
- Running microservices (auth, user, emergency, etc.)

### Installation

1. Clone the repository
```bash
cd services/api-gateway
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start development server
```bash
npm run dev
```

5. Build for production
```bash
npm run build
npm start
```

## Configuration

### Environment Variables

See `.env.example` for all available configuration options.

#### Required Variables

```bash
# JWT Secret (must match auth service)
JWT_SECRET=your-secret-key

# Microservice URLs
AUTH_SERVICE_URL=http://auth-service:3001
USER_SERVICE_URL=http://user-service:3002
EMERGENCY_SERVICE_URL=http://emergency-service:3003
LOCATION_SERVICE_URL=http://location-service:3004
NOTIFICATION_SERVICE_URL=http://notification-service:3005
COMMUNICATION_SERVICE_URL=http://communication-service:3006

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
```

#### Optional Variables

```bash
# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000        # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# Circuit Breaker
CIRCUIT_BREAKER_ENABLED=true
CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT=60000
CIRCUIT_BREAKER_RESET_TIMEOUT=30000

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:8080
```

## API Endpoints

### Health Checks

```
GET  /health                    - Basic health check
GET  /health/startup            - Kubernetes startup probe
GET  /health/ready              - Kubernetes readiness probe
GET  /health/live               - Kubernetes liveness probe
GET  /health/circuit-breakers   - Circuit breaker status
```

### Authentication Service

```
POST   /api/v1/auth/register           - Register new user
POST   /api/v1/auth/login              - Login user
POST   /api/v1/auth/refresh            - Refresh access token
POST   /api/v1/auth/logout             - Logout user (requires auth)
GET    /api/v1/auth/me                 - Get current user (requires auth)
GET    /api/v1/auth/sessions           - Get user sessions (requires auth)
GET    /api/v1/auth/google             - Initiate Google OAuth
GET    /api/v1/auth/google/callback    - Google OAuth callback
GET    /api/v1/auth/apple              - Initiate Apple OAuth
POST   /api/v1/auth/apple/callback     - Apple OAuth callback
POST   /api/v1/auth/link/:provider     - Link OAuth account (requires auth)
DELETE /api/v1/auth/unlink             - Unlink OAuth account (requires auth)
GET    /api/v1/auth/oauth/status       - Get OAuth status (requires auth)
```

### User Service

```
GET    /api/v1/users/profile                    - Get user profile (requires auth)
PUT    /api/v1/users/profile                    - Update user profile (requires auth)
DELETE /api/v1/users/profile                    - Delete user account (requires auth)
GET    /api/v1/users/emergency-contacts         - Get emergency contacts (requires auth)
POST   /api/v1/users/emergency-contacts         - Add emergency contact (requires auth)
GET    /api/v1/users/emergency-contacts/:id     - Get emergency contact (requires auth)
PUT    /api/v1/users/emergency-contacts/:id     - Update emergency contact (requires auth)
DELETE /api/v1/users/emergency-contacts/:id     - Delete emergency contact (requires auth)
```

### Emergency Service

```
POST   /api/v1/emergencies                  - Create emergency alert (requires auth)
GET    /api/v1/emergencies                  - Get user's emergencies (requires auth)
GET    /api/v1/emergencies/:id              - Get emergency details (requires auth)
PUT    /api/v1/emergencies/:id/status       - Update emergency status (requires auth)
PUT    /api/v1/emergencies/:id/cancel       - Cancel emergency (requires auth)
PUT    /api/v1/emergencies/:id/resolve      - Resolve emergency (requires auth)
GET    /api/v1/emergencies/:id/timeline     - Get emergency timeline (requires auth)
```

### Location Service

```
POST   /api/v1/locations                      - Update user location (requires auth)
GET    /api/v1/locations/current              - Get current location (requires auth)
GET    /api/v1/locations/history              - Get location history (requires auth)
GET    /api/v1/locations/emergency/:id        - Get emergency location (requires auth)
POST   /api/v1/locations/share                - Share location (requires auth)
```

### Notification Service

```
GET    /api/v1/notifications                  - Get notifications (requires auth)
GET    /api/v1/notifications/:id              - Get notification (requires auth)
PUT    /api/v1/notifications/:id/read         - Mark as read (requires auth)
PUT    /api/v1/notifications/mark-all-read    - Mark all as read (requires auth)
DELETE /api/v1/notifications/:id              - Delete notification (requires auth)
GET    /api/v1/notifications/unread/count     - Get unread count (requires auth)
GET    /api/v1/notifications/preferences      - Get preferences (requires auth)
PUT    /api/v1/notifications/preferences      - Update preferences (requires auth)
```

### Communication Service

```
POST   /api/v1/communications/messages            - Send message (requires auth)
GET    /api/v1/communications/messages            - Get messages (requires auth)
GET    /api/v1/communications/conversations/:id   - Get conversation (requires auth)
POST   /api/v1/communications/calls               - Initiate call (requires auth)
PUT    /api/v1/communications/calls/:id/status    - Update call status (requires auth)
GET    /api/v1/communications/calls/history       - Get call history (requires auth)
```

## Authentication

The API Gateway uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <access-token>
```

### Token Flow

1. User authenticates via `/api/v1/auth/login`
2. Receive `accessToken` and `refreshToken`
3. Include `accessToken` in subsequent requests
4. When `accessToken` expires, use `/api/v1/auth/refresh` with `refreshToken`

## Rate Limiting

Rate limits are applied globally and per-endpoint:

### Global Rate Limit
- 100 requests per 15 minutes per IP

### Authentication Endpoints
- 10 requests per 15 minutes per IP

### Emergency Endpoints
- 30 requests per minute per IP

### User-Specific Rate Limit
- 200 requests per 15 minutes per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1609459200
```

## Circuit Breaker

The API Gateway implements a circuit breaker pattern to prevent cascading failures:

### States

- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Service is down, requests fail immediately
- **HALF_OPEN**: Testing if service is back up

### Configuration

```bash
CIRCUIT_BREAKER_THRESHOLD=5         # Failures before opening
CIRCUIT_BREAKER_TIMEOUT=60000       # Time circuit stays open (ms)
CIRCUIT_BREAKER_RESET_TIMEOUT=30000 # Time before testing recovery (ms)
```

### Monitoring

Check circuit breaker status:
```bash
GET /health/circuit-breakers
```

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "stack": "..." // Only in development
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `NO_TOKEN_PROVIDED` | 401 | Missing authentication token |
| `INVALID_TOKEN` | 401 | Invalid or malformed token |
| `TOKEN_EXPIRED` | 401 | Access token expired |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `SERVICE_UNAVAILABLE` | 503 | Microservice is down |
| `ROUTE_NOT_FOUND` | 404 | Endpoint does not exist |

## Logging

The API Gateway uses Winston for structured logging:

### Log Levels

- `error`: Critical errors requiring immediate attention
- `warn`: Warning messages for non-critical issues
- `info`: General informational messages (default)
- `debug`: Detailed debugging information

### Log Format

Development:
```
2025-10-31 10:30:45 [info]: GET /api/v1/users/profile {"userId": "123"}
```

Production (JSON):
```json
{
  "level": "info",
  "message": "GET /api/v1/users/profile",
  "timestamp": "2025-10-31T10:30:45.123Z",
  "service": "api-gateway",
  "userId": "123"
}
```

## Docker

### Build Image

```bash
docker build -t sos-app/api-gateway:latest .
```

### Run Container

```bash
docker run -d \
  -p 3000:3000 \
  --name api-gateway \
  --env-file .env \
  sos-app/api-gateway:latest
```

### Docker Compose

```yaml
version: '3.8'

services:
  api-gateway:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - AUTH_SERVICE_URL=http://auth-service:3001
      - USER_SERVICE_URL=http://user-service:3002
      - REDIS_HOST=redis
    depends_on:
      - redis
      - auth-service
      - user-service
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

## Kubernetes Deployment

### Deployment YAML

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: sos-app/api-gateway:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secret
              key: secret
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        startupProbe:
          httpGet:
            path: /health/startup
            port: 3000
          failureThreshold: 30
          periodSeconds: 10
```

### Service YAML

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
spec:
  selector:
    app: api-gateway
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

## Testing

### Run Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Coverage
npm test -- --coverage
```

### Manual Testing

```bash
# Health check
curl http://localhost:3000/health

# Register user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "deviceId": "test-device"
  }'

# Authenticated request
curl http://localhost:3000/api/v1/users/profile \
  -H "Authorization: Bearer <access-token>"
```

## Performance

### Optimizations

- **Response Compression**: Gzip compression for responses > 1KB
- **Connection Pooling**: Axios connection reuse for backend services
- **Request Caching**: Redis caching for frequently accessed data
- **Circuit Breaker**: Prevents wasted requests to failing services
- **Rate Limiting**: Prevents resource exhaustion

### Benchmarks

- **Request Latency**: < 50ms (p95) for simple proxying
- **Throughput**: > 1000 req/s per instance
- **Memory Usage**: ~100-200 MB per instance
- **CPU Usage**: < 10% at moderate load

## Monitoring

### Metrics to Track

- Request rate (req/s)
- Response time (ms)
- Error rate (%)
- Circuit breaker states
- Rate limit hits
- Service availability

### Recommended Tools

- **Prometheus**: Metrics collection
- **Grafana**: Metrics visualization
- **ELK Stack**: Log aggregation and search
- **Sentry**: Error tracking
- **New Relic / Datadog**: APM

## Security

### Best Practices

✅ **JWT Validation**: All protected routes validate tokens
✅ **Rate Limiting**: Prevents brute force attacks
✅ **CORS**: Restricts cross-origin requests
✅ **Helmet**: Security headers (XSS, CSP, etc.)
✅ **Input Validation**: Request validation at service level
✅ **HTTPS**: Use TLS in production
✅ **Secrets Management**: Use environment variables/secrets

### Security Headers

```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
```

## Troubleshooting

### Common Issues

**Issue**: Circuit breaker is OPEN
```bash
# Check circuit breaker status
curl http://localhost:3000/health/circuit-breakers

# Verify service health
curl http://auth-service:3001/health
```

**Issue**: Rate limit exceeded
```bash
# Check Redis connection
redis-cli ping

# Clear rate limit (development only)
redis-cli FLUSHDB
```

**Issue**: Authentication fails
```bash
# Verify JWT secret matches auth service
echo $JWT_SECRET

# Check token expiry
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <token>"
```

## Contributing

1. Follow TypeScript best practices
2. Add tests for new features
3. Update documentation
4. Follow existing code style

## License

Proprietary - SOS App

## Support

For issues and questions:
- GitHub Issues: [sos-app/issues](https://github.com/sos-app/issues)
- Email: support@sos-app.com

---

**Version**: 1.0.0
**Last Updated**: 2025-10-31
