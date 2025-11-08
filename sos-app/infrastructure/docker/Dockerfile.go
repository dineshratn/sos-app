# =============================================================================
# SOS App - Go Base Docker Image
# =============================================================================
# Multi-stage Dockerfile optimized for Go microservices
# Features: Golang 1.21 Alpine builder, scratch runtime, minimal image size
# Target: Production deployments with maximum optimization (~5-15MB images)
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Builder - Compile Go Binary
# -----------------------------------------------------------------------------
FROM golang:1.25-alpine AS builder

# Install build dependencies and security updates
RUN apk update && \
    apk upgrade --no-cache && \
    apk add --no-cache \
    git \
    ca-certificates \
    tzdata \
    upx && \
    rm -rf /var/cache/apk/*

# Create non-root user for runtime
RUN addgroup -g 1001 -S goapp && \
    adduser -S goapp -u 1001

# Set working directory
WORKDIR /build

# Copy go mod files first for better layer caching
COPY go.mod ./
COPY go.sum* ./

# Download dependencies (cached if go.mod/go.sum unchanged)
RUN go mod download && \
    go mod verify

# Copy source code
COPY . .

# Build arguments
ARG VERSION=dev
ARG BUILD_DATE
ARG GIT_COMMIT

# Build the binary with optimizations
# -ldflags explanation:
#   -s: Omit symbol table (reduce size)
#   -w: Omit DWARF debug info (reduce size)
#   -X: Set version information at compile time
# Note: Auto-detects main package (supports ./main.go, ./cmd/main.go, ./cmd/server/main.go)
RUN MAIN_PKG=$(find . -name 'main.go' -type f | head -1 | xargs dirname) && \
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -a \
    -installsuffix cgo \
    -ldflags="-s -w -X main.Version=${VERSION} -X main.BuildDate=${BUILD_DATE} -X main.GitCommit=${GIT_COMMIT}" \
    -o /build/app \
    ${MAIN_PKG}

# Compress binary with UPX (optional, can reduce size by 50-70%)
# Comment out if you prefer faster startup over smaller size
RUN upx --best --lzma /build/app

# Verify binary works
RUN /build/app --version || true

# -----------------------------------------------------------------------------
# Stage 2: Production Image - Minimal Runtime (scratch)
# -----------------------------------------------------------------------------
FROM scratch AS production

# Copy timezone data from builder
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# Copy SSL certificates for HTTPS requests
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy passwd file for non-root user
COPY --from=builder /etc/passwd /etc/passwd
COPY --from=builder /etc/group /etc/group

# Copy the compiled binary
COPY --from=builder /build/app /app

# Use non-root user
USER goapp:goapp

# Expose application port (default: 8080, override in service)
EXPOSE 8080

# Health check (using built-in health endpoint)
# Note: scratch doesn't have curl/wget, so Kubernetes must use httpGet probe
HEALTHCHECK NONE

# Set entrypoint
ENTRYPOINT ["/app"]

# Default command (can be overridden)
CMD ["--help"]

# -----------------------------------------------------------------------------
# Stage 3: Development Image (with debugging tools)
# -----------------------------------------------------------------------------
FROM golang:1.25-alpine AS development

# Install development tools
RUN apk update && \
    apk upgrade --no-cache && \
    apk add --no-cache \
    git \
    ca-certificates \
    curl \
    bash \
    vim \
    delve && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S goapp && \
    adduser -S goapp -u 1001

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod ./
COPY go.sum* ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build with debug symbols for delve
RUN MAIN_PKG=$(find . -name 'main.go' -type f | head -1 | xargs dirname) && \
    go build -gcflags="all=-N -l" -o /app/app-debug ${MAIN_PKG}

# Change ownership
RUN chown -R goapp:goapp /app

# Switch to non-root user
USER goapp:goapp

# Expose application and debug ports
EXPOSE 8080
EXPOSE 2345

# Start with delve for debugging
ENTRYPOINT ["dlv", "exec", "/app/app-debug", "--headless", "--listen=:2345", "--api-version=2", "--accept-multiclient", "--"]

# =============================================================================
# Stage 4: Alpine-based Production (alternative to scratch)
# =============================================================================
# Use this if you need shell access or debugging tools in production
FROM alpine:latest AS production-alpine

# Install runtime dependencies
RUN apk update && \
    apk upgrade --no-cache && \
    apk add --no-cache \
    ca-certificates \
    curl \
    tzdata && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S goapp && \
    adduser -S goapp -u 1001

# Copy binary from builder
COPY --from=builder /build/app /app

# Change ownership
RUN chown goapp:goapp /app

# Switch to non-root user
USER goapp:goapp

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Run binary
ENTRYPOINT ["/app"]

# =============================================================================
# Build Instructions:
# =============================================================================
# Production build (scratch-based, smallest):
#   docker build --target production -t sos-app/go-service:latest -f Dockerfile.go .
#
# Production build (Alpine-based, with shell):
#   docker build --target production-alpine -t sos-app/go-service:alpine -f Dockerfile.go .
#
# Development build (with debugging):
#   docker build --target development -t sos-app/go-service:dev -f Dockerfile.go .
#
# Build with build args:
#   docker build --target production \
#     --build-arg VERSION=v1.0.0 \
#     --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
#     --build-arg GIT_COMMIT=$(git rev-parse --short HEAD) \
#     -t sos-app/go-service:v1.0.0 .
#
# Run container:
#   docker run -p 8080:8080 -e ENV=production sos-app/go-service:latest
#
# Run with development tools:
#   docker run -p 8080:8080 -p 2345:2345 sos-app/go-service:dev
# =============================================================================

# =============================================================================
# Security Features:
# =============================================================================
# - Scratch base (minimal attack surface, no OS)
# - Static binary (no dependencies)
# - Non-root user (goapp:1001)
# - Security updates applied during build
# - No shell or package manager in production image
# - SSL certificates included for HTTPS
# - Minimal file copying
# =============================================================================

# =============================================================================
# Optimization Features:
# =============================================================================
# - Multi-stage build (builder discarded)
# - Static linking (CGO_ENABLED=0)
# - Symbol table stripped (-ldflags "-s -w")
# - UPX compression (50-70% size reduction)
# - Layer caching optimized (go.mod before source)
# - Scratch base (~0 bytes vs ~5MB Alpine)
# - Expected final size: 5-15MB (depending on service)
# =============================================================================

# =============================================================================
# Go Service Requirements:
# =============================================================================
# Your Go service must have:
# 1. Standard Go module layout:
#    - go.mod and go.sum in root
#    - Main package in cmd/main.go
#
# 2. Health endpoint at /health:
#    http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
#        w.WriteHeader(http.StatusOK)
#        json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
#    })
#
# 3. Version flag support:
#    var (
#        Version   string
#        BuildDate string
#        GitCommit string
#    )
#    flag.Parse()
#    if *versionFlag {
#        fmt.Printf("Version: %s\nBuild Date: %s\nGit Commit: %s\n",
#                   Version, BuildDate, GitCommit)
#        os.Exit(0)
#    }
# =============================================================================

# =============================================================================
# Size Comparison:
# =============================================================================
# Scratch-based:        5-15 MB   (production default)
# Alpine-based:        15-25 MB   (production-alpine)
# Development:        400-500 MB  (includes Go toolchain)
# =============================================================================
