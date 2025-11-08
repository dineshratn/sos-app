# Multi-stage build for Go service with debug support
FROM golang:1.21-alpine as builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git make

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build with debug symbols (dlv)
RUN CGO_ENABLED=0 GOOS=linux go build -v -o app .

# Debug stage for development
FROM golang:1.21-alpine as debug

WORKDIR /app

# Install delve debugger
RUN go install github.com/go-delve/delve/cmd/dlv@latest

# Copy built binary from builder
COPY --from=builder /app/app /app/app
COPY . .

EXPOSE 3000 40000

# Run with delve debugger
CMD ["dlv", "exec", "/app/app", "--headless", "--listen=0.0.0.0:40000", "--api-version=2"]

# Production stage (doesn't include debugger)
FROM alpine:latest as production

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache ca-certificates curl

# Copy built application
COPY --from=builder /app/app /app/app

EXPOSE 3000

CMD ["/app/app"]
