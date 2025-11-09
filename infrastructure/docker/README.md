# SOS App - Docker Base Images

This directory contains Docker base images and build tooling for all SOS App microservices.

## Overview

The Docker infrastructure provides optimized, secure, and production-ready base images for:
- **Node.js Services**: Auth, User, Medical, Notification services
- **Go Services**: Emergency, Location, Device services (see Dockerfile.go)

## Features

### Security
- ✅ **Alpine Linux Base**: Minimal attack surface (~5MB vs ~130MB for full Linux)
- ✅ **Non-Root User**: Services run as `nodejs:1001` user
- ✅ **Security Updates**: Latest patches applied during build
- ✅ **No Secrets**: .dockerignore prevents credential leakage
- ✅ **dumb-init**: Proper signal handling for graceful shutdowns

### Optimization
- ✅ **Multi-Stage Build**: Separate build and runtime stages
- ✅ **Layer Caching**: Dependencies cached before source code
- ✅ **Production Dependencies Only**: Dev dependencies excluded from final image
- ✅ **Minimal File Copying**: Only necessary files included
- ✅ **npm Cache Cleaned**: No cache bloat in final image

### Operational
- ✅ **Health Checks**: Built-in `/health` endpoint monitoring
- ✅ **Development Mode**: Separate target for local development
- ✅ **Debug Support**: Port 9229 exposed for debugging
- ✅ **Metadata Labels**: OCI-compliant image labels
- ✅ **Build Scripts**: Automated build tooling included

## Files

```
infrastructure/docker/
├── Dockerfile.node         # Node.js base image (multi-stage)
├── Dockerfile.go           # Go base image (multi-stage, scratch runtime)
├── .dockerignore          # Files to exclude from build context
├── build-node-image.sh    # Build script for Node.js services
├── build-go-image.sh      # Build script for Go services
└── README.md              # This file
```

## Quick Start

### Building a Node.js Service

```bash
# Build production image for auth-service
./infrastructure/docker/build-node-image.sh auth-service production v1.0.0

# Build development image for user-service
./infrastructure/docker/build-node-image.sh user-service development latest
```

### Manual Build

```bash
# Navigate to service directory
cd services/auth-service

# Copy Dockerfile
cp ../../infrastructure/docker/Dockerfile.node ./Dockerfile
cp ../../infrastructure/docker/.dockerignore ./

# Build production image
docker build --target production -t sos-app/auth-service:latest .

# Build development image
docker build --target development -t sos-app/auth-service:dev .
```

### Running Containers

```bash
# Run production container
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgresql://... \
  sos-app/auth-service:latest

# Run development container with hot reload
docker run -p 3000:3000 -p 9229:9229 \
  -e NODE_ENV=development \
  -v $(pwd)/src:/app/src \
  sos-app/auth-service:dev

# Run with Docker Compose
docker-compose up auth-service
```

### Building a Go Service

```bash
# Build production image (scratch-based, smallest)
./infrastructure/docker/build-go-image.sh emergency-service production v1.0.0

# Build production-alpine image (with shell for debugging)
./infrastructure/docker/build-go-image.sh location-service production-alpine v1.0.0

# Build development image (with Delve debugger)
./infrastructure/docker/build-go-image.sh device-service development latest
```

### Manual Build (Go)

```bash
# Navigate to service directory
cd services/emergency-service

# Copy Dockerfile
cp ../../infrastructure/docker/Dockerfile.go ./Dockerfile
cp ../../infrastructure/docker/.dockerignore ./

# Build scratch-based production image (smallest)
docker build --target production -t sos-app/emergency-service:latest .

# Build Alpine-based production image (with shell)
docker build --target production-alpine -t sos-app/emergency-service:alpine .

# Build development image with debugger
docker build --target development -t sos-app/emergency-service:dev .
```

### Running Go Containers

```bash
# Run production container (scratch-based)
docker run -p 8080:8080 \
  -e ENV=production \
  -e DATABASE_URL=postgresql://... \
  sos-app/emergency-service:latest

# Run production-alpine container (with shell access)
docker run -p 8080:8080 \
  -e ENV=production \
  sos-app/emergency-service:alpine

# Run development container with debugger
docker run -p 8080:8080 -p 2345:2345 \
  sos-app/emergency-service:dev

# Connect to debugger with dlv CLI
dlv connect localhost:2345

# Or use VS Code with this launch.json configuration:
# {
#   "type": "go",
#   "request": "attach",
#   "mode": "remote",
#   "remotePath": "/app",
#   "port": 2345,
#   "host": "localhost"
# }
```

## Dockerfile.node Architecture

### Multi-Stage Build

The Dockerfile uses a 5-stage build process:

```
┌─────────────────────────────────────────────────────────────────┐
│ Stage 1: BASE                                                   │
│ - Node.js 20 LTS on Alpine Linux                               │
│ - Security updates and essential tools                          │
│ - Non-root user setup                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│ Stage 2: DEPENDENCIES     │   │ Stage 3: BUILD            │
│ - Install prod deps       │───│ - TypeScript compilation  │
│ - Install dev deps        │   │ - Run build scripts       │
└───────────────────────────┘   └───────────────────────────┘
                │                           │
                ▼                           ▼
┌───────────────────────────────────────────────────────────────┐
│ Stage 4: PRODUCTION (default)                                 │
│ - Copy prod dependencies only                                 │
│ - Copy built artifacts                                        │
│ - Non-root user                                               │
│ - Health checks enabled                                       │
│ - Final size: ~50-150MB (depending on service)                │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│ Stage 5: DEVELOPMENT (optional)                               │
│ - All dependencies (incl. dev)                                │
│ - Source code (not built)                                     │
│ - Hot reload support                                          │
│ - Debug port exposed                                          │
└───────────────────────────────────────────────────────────────┘
```

### Image Layers

Production image layer breakdown:

```
Layer 1: Alpine Linux base          ~5 MB
Layer 2: Node.js 20 runtime         ~40 MB
Layer 3: System dependencies        ~5 MB
Layer 4: npm production deps        ~20-100 MB (varies by service)
Layer 5: Built application code     ~5-20 MB (varies by service)
─────────────────────────────────────────────────────
Total:                              ~75-170 MB
```

## Dockerfile.go Architecture

### Multi-Stage Build

The Go Dockerfile uses a 4-stage build process with scratch/Alpine runtime options:

```
┌─────────────────────────────────────────────────────────────────┐
│ Stage 1: BUILDER (golang:1.21-alpine)                          │
│ - Install build dependencies (git, ca-certificates, upx)       │
│ - Create non-root user (goapp:1001)                            │
│ - Download Go modules (cached if go.mod/sum unchanged)         │
│ - Compile static binary with optimizations                     │
│ - Strip symbols and debug info (-ldflags "-s -w")              │
│ - Compress binary with UPX (50-70% size reduction)             │
│ - Size: ~400-500MB (discarded after build)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┬─────────────┐
                ▼             ▼             ▼             ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ Stage 2:         │ │ Stage 3:         │ │ Stage 4:         │
│ PRODUCTION       │ │ DEVELOPMENT      │ │ PRODUCTION-      │
│ (scratch)        │ │ (golang:alpine)  │ │ ALPINE           │
│ - Certs only     │ │ - Full toolchain │ │ (alpine:latest)  │
│ - Timezone data  │ │ - Delve debugger │ │ - Shell access   │
│ - Binary only    │ │ - Debug symbols  │ │ - curl, certs    │
│ - Non-root user  │ │ - Port 2345      │ │ - Health checks  │
│ - No shell       │ │ - Hot reload     │ │ - Binary only    │
│ - Size: 5-15 MB  │ │ - Size: 400-500  │ │ - Size: 15-25 MB │
└──────────────────┘ └──────────────────┘ └──────────────────┘
     (DEFAULT)           (DEBUGGING)          (WITH TOOLS)
```

### Image Size Comparison

```
Production (scratch):      5-15 MB   ← Smallest, production default
Production-Alpine:        15-25 MB   ← With shell for debugging
Development:            400-500 MB   ← Full Go toolchain + debugger
```

### Go Binary Optimization

The builder stage applies aggressive optimizations:

```bash
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
  -a \
  -installsuffix cgo \
  -ldflags="-s -w -X main.Version=${VERSION}" \
  -o /build/app \
  ./cmd/main.go

# Then compress with UPX
upx --best --lzma /build/app
```

**Optimization Breakdown:**
- `CGO_ENABLED=0`: Static linking (no C dependencies)
- `-a`: Force rebuild of all packages
- `-ldflags "-s"`: Omit symbol table (reduces size)
- `-ldflags "-w"`: Omit DWARF debug info (reduces size)
- `-ldflags "-X"`: Set version info at compile time
- `upx --best --lzma`: Compress binary (50-70% reduction)

**Result:** A 20MB uncompressed binary becomes ~6-8MB after UPX compression

### Production Image Layers (Scratch)

The scratch-based production image is minimal:

```
Layer 1: Scratch base                 0 bytes
Layer 2: SSL certificates            ~200 KB
Layer 3: Timezone data               ~400 KB
Layer 4: User/group files             ~1 KB
Layer 5: Compiled Go binary          ~5-15 MB
─────────────────────────────────────────────
Total:                               ~5-15 MB
```

**No OS, no shell, no package manager - just your binary!**

## Build Script Usage

### Syntax

```bash
./build-node-image.sh <service-name> [environment] [version]
```

### Parameters

- **service-name** (required): Name of the Node.js service
  - Examples: `auth-service`, `user-service`, `medical-service`, `notification-service`
- **environment** (optional): Build target
  - Options: `production` (default), `development`
- **version** (optional): Image version tag
  - Default: `latest`
  - Examples: `v1.0.0`, `v1.2.3`, `staging`, `dev`

### Examples

```bash
# Build production image with default version
./build-node-image.sh auth-service

# Build production image with specific version
./build-node-image.sh auth-service production v1.0.0

# Build development image
./build-node-image.sh user-service development latest

# Build staging version
./build-node-image.sh medical-service production staging
```

### Build Output

The script provides:
- ✅ Pre-build validation checks
- ✅ Colored console output for readability
- ✅ Build progress information
- ✅ Image size and metadata
- ✅ Security scan (if Trivy installed)
- ✅ Next steps and commands

Example output:

```
[INFO] ===================================================================
[INFO] SOS App - Docker Image Build
[INFO] ===================================================================
[INFO] Service:      auth-service
[INFO] Environment:  production
[INFO] Version:      v1.0.0
[INFO] Image:        ghcr.io/sos-app/auth-service:v1.0.0
[INFO] Target:       production
[INFO] ===================================================================
[SUCCESS] Pre-build checks passed
[INFO] Building Docker image...
[SUCCESS] Docker image built successfully: ghcr.io/sos-app/auth-service:v1.0.0
[SUCCESS] Image Size: 125MB
```

### Go Build Script Usage

#### Syntax

```bash
./build-go-image.sh <service-name> [target] [version]
```

#### Parameters

- **service-name** (required): Name of the Go service
  - Examples: `emergency-service`, `location-service`, `device-service`
- **target** (optional): Build target
  - Options: `production` (default, scratch), `production-alpine` (with shell), `development` (with debugger)
- **version** (optional): Image version tag
  - Default: `latest`
  - Examples: `v1.0.0`, `v1.2.3`, `staging`

#### Examples

```bash
# Build scratch-based production image (smallest)
./build-go-image.sh emergency-service

# Build production image with specific version
./build-go-image.sh emergency-service production v1.0.0

# Build Alpine-based production (with shell for debugging)
./build-go-image.sh location-service production-alpine v1.0.0

# Build development image with Delve debugger
./build-go-image.sh device-service development latest
```

#### Build Output

The Go build script provides:
- ✅ Pre-build validation (Docker, go.mod, cmd/main.go)
- ✅ Go module analysis (module name, dependency count)
- ✅ Colored console output
- ✅ Binary version testing
- ✅ Layer analysis (with dive if installed)
- ✅ Security scan (with Trivy if installed)
- ✅ Target-specific next steps

Example output:

```
[INFO] ===================================================================
[INFO] SOS App - Go Docker Image Build
[INFO] ===================================================================
[INFO] Service:      emergency-service
[INFO] Target:       production
[INFO] Version:      v1.0.0
[INFO] Image:        ghcr.io/sos-app/emergency-service:v1.0.0
[BUILD] Build Date: 2025-10-29T03:30:00Z
[BUILD] Git Commit: abc1234
[SUCCESS] Docker image built successfully
[SUCCESS] Image Size: 8.2MB
[INFO] Layers: 5
```

### Go Service Requirements

Your Go service must meet these requirements:

#### 1. Standard Go Module Layout

```
services/emergency-service/
├── cmd/
│   └── main.go              # Main package entry point
├── internal/                # Internal packages
│   ├── handlers/
│   ├── models/
│   └── repository/
├── pkg/                     # Exported packages (optional)
├── go.mod                   # Go module definition
├── go.sum                   # Dependency checksums
└── README.md
```

#### 2. Health Endpoint

```go
// health.go
package main

import (
    "encoding/json"
    "net/http"
)

type HealthResponse struct {
    Status    string `json:"status"`
    Timestamp string `json:"timestamp"`
    Version   string `json:"version"`
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)

    response := HealthResponse{
        Status:    "healthy",
        Timestamp: time.Now().UTC().Format(time.RFC3339),
        Version:   Version,
    }

    json.NewEncoder(w).Encode(response)
}

// In main.go
http.HandleFunc("/health", healthHandler)
```

#### 3. Version Flag Support

```go
// main.go
package main

import (
    "flag"
    "fmt"
    "os"
)

var (
    Version   string = "dev"
    BuildDate string = "unknown"
    GitCommit string = "unknown"
)

func main() {
    versionFlag := flag.Bool("version", false, "Print version information")
    flag.Parse()

    if *versionFlag {
        fmt.Printf("Version:    %s\n", Version)
        fmt.Printf("Build Date: %s\n", BuildDate)
        fmt.Printf("Git Commit: %s\n", GitCommit)
        os.Exit(0)
    }

    // Application startup...
}
```

## Docker Ignore

The `.dockerignore` file excludes unnecessary files from the build context:

### Excluded Categories

- **Version Control**: `.git`, `.github`
- **Dependencies**: `node_modules` (reinstalled in container)
- **Tests**: `*.test.ts`, `*.spec.ts`, `__tests__`, `coverage`
- **Build Output**: `dist`, `build` (rebuilt in container)
- **Environment Files**: `.env*` (provided at runtime)
- **IDE Files**: `.vscode`, `.idea`, `.DS_Store`
- **CI/CD**: `.github/workflows`, `.gitlab-ci.yml`
- **Documentation**: `*.md`, `docs/`
- **Docker Files**: `Dockerfile*`, `docker-compose*.yml`
- **Secrets**: `*.pem`, `*.key`, `credentials.json`

### Why This Matters

Excluding files from build context:
- ✅ **Faster Builds**: Less data to send to Docker daemon
- ✅ **Smaller Images**: Only necessary files included
- ✅ **Better Security**: No secrets or credentials in images
- ✅ **Cache Efficiency**: Better layer caching with focused context

## Environment Variables

### Production Container

```bash
# Required
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Optional
PORT=3000
LOG_LEVEL=info
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092
JWT_SECRET=your-secret-key
```

### Development Container

```bash
# Required
NODE_ENV=development

# Optional (with defaults)
PORT=3000
LOG_LEVEL=debug
```

## Health Checks

All containers include built-in health checks:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1
```

### Health Check Behavior

- **Interval**: Check every 30 seconds
- **Timeout**: Fail if check takes >10 seconds
- **Start Period**: Wait 40 seconds before starting checks (allow app startup)
- **Retries**: Mark unhealthy after 3 consecutive failures

### Endpoint Requirements

Each service must implement a `/health` endpoint:

```typescript
// Example health endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});
```

## Security Best Practices

### 1. Non-Root User

All services run as the `nodejs` user (UID 1001):

```dockerfile
USER nodejs
```

This prevents privilege escalation attacks if the container is compromised.

### 2. Read-Only Root Filesystem (Recommended)

When running containers, use read-only root filesystem:

```bash
docker run --read-only -v /tmp:/tmp sos-app/auth-service:latest
```

### 3. Security Scanning

Use Trivy to scan images for vulnerabilities:

```bash
# Install Trivy
brew install aquasecurity/trivy/trivy  # macOS
apt-get install trivy                   # Ubuntu/Debian

# Scan image
trivy image sos-app/auth-service:latest

# Fail build on critical vulnerabilities
trivy image --severity CRITICAL --exit-code 1 sos-app/auth-service:latest
```

### 4. Secrets Management

**Never** include secrets in images:
- ❌ No hardcoded passwords
- ❌ No API keys in code
- ❌ No `.env` files in images

**Instead**, provide secrets at runtime:
- ✅ Environment variables
- ✅ Kubernetes secrets
- ✅ Docker secrets
- ✅ Vault integration

### 5. Image Signing (Recommended)

Sign images for supply chain security:

```bash
# Enable Docker Content Trust
export DOCKER_CONTENT_TRUST=1

# Push signed image
docker push ghcr.io/sos-app/auth-service:v1.0.0
```

## Optimization Tips

### 1. Layer Caching

Order Dockerfile instructions from least to most frequently changing:

```dockerfile
# ✅ Good: Dependencies change less often than source code
COPY package*.json ./
RUN npm ci
COPY . .

# ❌ Bad: Copying everything invalidates cache
COPY . .
RUN npm ci
```

### 2. Multi-Stage Builds

Use separate stages to keep final image small:

```dockerfile
# Build stage (includes dev dependencies and build tools)
FROM base AS build
COPY --from=dependencies /app/node_modules ./node_modules
RUN npm run build

# Production stage (only runtime dependencies)
FROM base AS production
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
```

### 3. Minimize Layers

Combine RUN commands to reduce layers:

```dockerfile
# ✅ Good: Single layer
RUN apk add --no-cache curl ca-certificates && \
    rm -rf /var/cache/apk/*

# ❌ Bad: Multiple layers
RUN apk add --no-cache curl
RUN apk add --no-cache ca-certificates
RUN rm -rf /var/cache/apk/*
```

### 4. Clean Caches

Remove package manager caches:

```dockerfile
RUN npm ci --only=production && \
    npm cache clean --force
```

## Troubleshooting

### Build Fails: "EACCES: permission denied"

**Cause**: Docker daemon doesn't have permission to access build context.

**Solution**:
```bash
# Check Docker socket permissions
ls -la /var/run/docker.sock

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### Build Fails: "npm ERR! 404 Not Found"

**Cause**: Private npm packages not accessible.

**Solution**:
```bash
# Set npm token
echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc

# Or use build arg
docker build --build-arg NPM_TOKEN=${NPM_TOKEN} .
```

### Container Exits Immediately

**Cause**: Application crashes on startup.

**Solution**:
```bash
# Check logs
docker logs <container-id>

# Run container interactively
docker run -it sos-app/auth-service:latest sh

# Check environment variables
docker run sos-app/auth-service:latest env
```

### Health Check Fails

**Cause**: Health endpoint not responding or service not starting.

**Solution**:
```bash
# Check health check status
docker inspect --format='{{json .State.Health}}' <container-id>

# Test health endpoint manually
docker exec <container-id> curl -f http://localhost:3000/health
```

### Go-Specific Issues

#### Build Fails: "cannot find package"

**Cause**: Go modules not downloaded or incorrect import paths.

**Solution**:
```bash
# Ensure go.mod and go.sum exist
cd services/emergency-service
go mod download
go mod verify

# Tidy dependencies
go mod tidy
```

#### Scratch Container Won't Start (No Shell)

**Cause**: Trying to debug scratch-based container without shell.

**Solution**:
```bash
# Use production-alpine target instead
./build-go-image.sh emergency-service production-alpine v1.0.0

# Or check logs from outside
docker logs <container-id>

# Or use docker exec with binary commands
docker exec <container-id> /app --version
```

#### UPX Compression Fails

**Cause**: Binary too large or UPX not compatible with binary.

**Solution**:
```bash
# Comment out UPX compression in Dockerfile.go:
# Line: RUN upx --best --lzma /build/app

# Rebuild without UPX (binary will be larger but functional)
```

#### Binary Size Larger Than Expected

**Cause**: Debug symbols not stripped or large dependencies.

**Solution**:
```bash
# Verify build flags in Dockerfile.go
# Ensure: -ldflags="-s -w"

# Analyze binary size
docker run --rm -it sos-app/emergency-service:latest /app --version

# Use dive tool to inspect layers
dive sos-app/emergency-service:latest
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Build Docker Image

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Image
        run: |
          ./infrastructure/docker/build-node-image.sh auth-service production ${{ github.sha }}

      - name: Push to Registry
        run: |
          echo ${{ secrets.GITHUB_TOKEN }} | docker login ghcr.io -u ${{ github.actor }} --password-stdin
          docker push ghcr.io/sos-app/auth-service:${{ github.sha }}
```

### GitLab CI

```yaml
build-image:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - ./infrastructure/docker/build-node-image.sh auth-service production $CI_COMMIT_SHA
    - docker push $CI_REGISTRY_IMAGE/auth-service:$CI_COMMIT_SHA
```

## Registry Configuration

### GitHub Container Registry (GHCR)

```bash
# Login
echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USER --password-stdin

# Push image
docker push ghcr.io/sos-app/auth-service:v1.0.0
```

### Docker Hub

```bash
# Login
docker login -u $DOCKER_USER -p $DOCKER_PASSWORD

# Push image
docker push sosapp/auth-service:v1.0.0
```

### Private Registry

```bash
# Login
docker login registry.example.com -u $USER -p $PASSWORD

# Push image
docker push registry.example.com/sos-app/auth-service:v1.0.0
```

## Best Practices Checklist

### Before Building
- [ ] Service has `package.json` with `build` script
- [ ] Service has `src/index.ts` or equivalent entry point
- [ ] Service implements `/health` endpoint
- [ ] No secrets or credentials in source code
- [ ] `.dockerignore` is up to date

### After Building
- [ ] Image size is reasonable (<200MB for Node.js)
- [ ] Security scan shows no critical vulnerabilities
- [ ] Health check works in running container
- [ ] Service starts successfully
- [ ] All environment variables documented

### Before Deploying
- [ ] Image tagged with semantic version
- [ ] Image tested in staging environment
- [ ] Kubernetes manifests updated with new image tag
- [ ] Rollback plan documented
- [ ] Monitoring and alerts configured

## Related Documentation

- [Kubernetes Deployment Guide](../kubernetes/README.md)
- [Service Development Guide](../../docs/development.md)
- [Security Best Practices](../../docs/security.md)
- [CI/CD Pipeline](../../docs/ci-cd.md)

## Support

For issues or questions:
- Open an issue on GitHub
- Contact DevOps team
- See troubleshooting section above

---

**Last Updated**: 2025-10-29
**Maintained By**: SOS App DevOps Team
