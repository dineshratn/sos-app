# SOS App - Emergency Response Platform

A comprehensive emergency response application designed to provide immediate assistance during critical situations. Built with a modern, decoupled microservices architecture supporting web, mobile, and IoT integrations.

## 🏗️ Monorepo Structure

This is an Nx monorepo containing all services, applications, and shared libraries for the SOS App platform.

```
sos-app/
├── apps/                    # Client applications
│   ├── mobile-ios/         # Native iOS app (Swift)
│   ├── mobile-android/     # Native Android app (Kotlin)
│   ├── web/                # React web app (Next.js)
│   └── admin/              # Admin dashboard (Next.js)
├── services/               # Backend microservices
│   ├── api-gateway/        # API Gateway (Node.js/TypeScript)
│   ├── auth-service/       # Authentication service (Node.js/TypeScript)
│   ├── user-service/       # User management (Node.js/TypeScript)
│   ├── emergency-service/  # Emergency orchestration (Go)
│   ├── location-service/   # Real-time location tracking (Go)
│   ├── notification-service/ # Multi-channel notifications (Node.js/TypeScript)
│   ├── device-service/     # IoT device integration (Go)
│   ├── communication-service/ # Chat & messaging (Node.js/TypeScript) ✅
│   ├── medical-service/    # Medical profiles (Node.js/TypeScript)
│   └── llm-service/        # AI integration (Python/FastAPI)
├── libs/                   # Shared libraries
│   ├── shared/             # Common utilities and types
│   ├── ui-components/      # Shared UI components
│   └── api-client/         # Generated API clients
├── infrastructure/         # Infrastructure as Code
│   ├── docker/             # Dockerfiles
│   ├── kubernetes/         # K8s manifests and Helm charts
│   └── terraform/          # Terraform configurations
└── tools/                  # Build tools and scripts
```

## ✨ Features

- 🆘 **Emergency Alert System** - Instant SOS triggering with < 2s response time
- 📍 **Real-Time Location Tracking** - GPS tracking with 10m accuracy
- 👥 **Emergency Contact Management** - Priority-based notification system
- 💬 **Real-Time Communication** - WebSocket-based emergency chat
- 🏥 **Medical Information** - HIPAA-compliant health records
- 📱 **Multi-Platform Support** - iOS, Android, and Web
- ⌚ **IoT Device Integration** - Wearables and panic buttons
- 🔒 **Enterprise Security** - OAuth 2.0, JWT, end-to-end encryption
- 🚀 **High Availability** - 99.9% uptime target with auto-scaling

## 🛠️ Technology Stack

### Backend Services
- **Node.js + TypeScript** - API Gateway, Auth, Communication, Notification services
- **Go** - High-performance Emergency, Location, Device services
- **Python + FastAPI** - LLM integration service

### Frontend
- **React + Next.js** - Web application with SSR/SSG
- **Swift** - Native iOS application
- **Kotlin** - Native Android application

### Data Layer
- **PostgreSQL** - Primary relational database
- **MongoDB** - Logs and event storage
- **Redis** - Caching, sessions, and real-time data
- **TimescaleDB** - Time-series location data

### Message Broker
- **Apache Kafka** - Event streaming and guaranteed delivery
- **Redis Pub/Sub** - Real-time WebSocket scaling

### Infrastructure
- **Docker** - Containerization
- **Kubernetes** - Orchestration and scaling
- **Terraform** - Infrastructure as Code
- **Nx** - Monorepo management and build system

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 20.0.0
- **npm** >= 10.0.0
- **Go** >= 1.21 (for Go services)
- **Python** >= 3.11 (for LLM service)
- **Docker** & **Docker Compose**
- **Kubernetes** (Minikube for local development)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/sos-app.git
cd sos-app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Development

```bash
# Run all services in development mode
npm run dev

# Run specific service
npx nx dev communication-service

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint all projects
npm run lint

# Format code
npm run format
```

### Building

```bash
# Build all projects
npm run build

# Build specific service
npx nx build communication-service

# Build affected projects only
npm run affected:build
```

### Testing

```bash
# Run all tests
npm test

# Run tests for specific service
npx nx test communication-service

# Run affected tests only
npm run affected:test

# Watch mode
npx nx test communication-service --watch
```

## 📦 Workspace Commands

```bash
# View dependency graph
npm run graph

# Run command on multiple projects
npx nx run-many --target=build --projects=auth-service,user-service

# Run command on affected projects
npx nx affected --target=test

# Clear Nx cache
npm run clean
```

## 🏃 Running Services

### Local Development (Docker Compose)

```bash
# Start all infrastructure services (databases, message brokers)
docker-compose up -d postgres mongodb redis kafka

# Start a specific service
npx nx dev communication-service

# Access service logs
npx nx serve communication-service --verbose
```

### Kubernetes (Local with Minikube)

```bash
# Start Minikube
minikube start

# Deploy infrastructure
kubectl apply -f infrastructure/kubernetes/base/

# Deploy services
kubectl apply -f infrastructure/kubernetes/services/

# Check service status
kubectl get pods -n sos-app

# View logs
kubectl logs -f deployment/communication-service -n sos-app
```

## 🧪 Testing Strategy

- **Unit Tests**: Jest with 80% minimum coverage
- **Integration Tests**: Service-to-service communication
- **E2E Tests**: Cypress (web), Detox (mobile)
- **Load Tests**: k6 for performance testing

## 📚 Documentation

- [Architecture Overview](./docs/architecture.md)
- [API Documentation](./docs/api/README.md)
- [Development Guide](./docs/development.md)
- [Deployment Guide](./docs/deployment.md)
- [Contributing Guide](./CONTRIBUTING.md)

## 🔒 Security

- OAuth 2.0 and OpenID Connect authentication
- JWT-based authorization
- End-to-end encryption for sensitive data
- HIPAA-compliant medical data handling
- Regular security audits and dependency updates

## 📊 Monitoring & Observability

- **Metrics**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Tracing**: Jaeger distributed tracing
- **Alerting**: PagerDuty integration

## 🌍 Environment Variables

Each service has its own `.env` file. See `.env.example` files in respective service directories.

Common variables:
```env
NODE_ENV=development
LOG_LEVEL=info
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/sos_app

# Redis
REDIS_URL=redis://localhost:6379

# Kafka
KAFKA_BROKERS=localhost:9092

# JWT
JWT_SECRET=your-secret-key
```

## 📈 Project Status

- ✅ **Requirements**: Complete
- ✅ **Design**: Complete
- ✅ **Task Breakdown**: Complete (262 tasks)
- 🔄 **Implementation**: In Progress (1/262 tasks)

### Completed Tasks
1. ✅ Task 1: Initialize monorepo with Nx workspace
2. ✅ Task 127: Implement join emergency room handler

### Current Focus
- Foundation & Infrastructure setup (Tasks 2-60)
- Communication service messaging features (Tasks 128-135)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Workflow

1. Create a feature branch from `main`
2. Make your changes with tests
3. Ensure all tests pass: `npm test`
4. Ensure code is formatted: `npm run format`
5. Ensure linting passes: `npm run lint`
6. Submit a pull request

## 📝 License

MIT License - see [LICENSE](./LICENSE) file for details

## 👥 Team

SOS App Team - Building emergency response technology that saves lives

## 🆘 Support

For issues and questions:
- 📧 Email: support@sos-app.com
- 💬 Slack: [Join our workspace](https://sos-app.slack.com)
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/sos-app/issues)

## 🎯 Roadmap

- [x] Project initialization and monorepo setup
- [x] Communication service with room management
- [ ] Infrastructure setup (Kubernetes, databases)
- [ ] Authentication and user services
- [ ] Emergency core services
- [ ] Mobile applications (iOS & Android)
- [ ] Web application
- [ ] AI/LLM integration
- [ ] Beta testing
- [ ] Production launch

---

**Built with ❤️ for emergency response**
