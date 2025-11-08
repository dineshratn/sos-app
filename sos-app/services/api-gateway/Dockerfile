# Multi-stage build for Node.js service with debug support
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy monorepo files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Build TypeScript
RUN npm run build -- --projects=@sos-app/api-gateway

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache dumb-init curl

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies
ENV HUSKY=0
RUN npm ci --omit=dev --legacy-peer-deps

# Copy built application from builder
COPY --from=builder /app/services/api-gateway/dist ./dist

EXPOSE 3000 9229

ENTRYPOINT ["/sbin/dumb-init", "--"]

# Run with Node inspect enabled for debugging
CMD ["node", "--inspect=0.0.0.0:9229", "dist/index.js"]
