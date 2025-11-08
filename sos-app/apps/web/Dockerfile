# Multi-stage build for Next.js frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy monorepo files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy app code
COPY apps/web ./apps/web
COPY libs ./libs

# Build Next.js
RUN npm run build -- --projects=@sos-app/web

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
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY apps/web/package.json ./apps/web/

EXPOSE 3000

ENTRYPOINT ["/sbin/dumb-init", "--"]

# Run Next.js production server
CMD ["npm", "run", "start", "--workspace=@sos-app/web"]
