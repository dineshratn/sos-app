# Emergency Service

High-performance emergency alert orchestration service built in Go for the SOS App platform.

## Overview

The Emergency Service is the core orchestration service responsible for managing emergency alert lifecycle including:
- Emergency triggering with countdown timer
- Emergency cancellation and resolution
- Contact acknowledgment tracking
- Escalation logic to secondary contacts
- Auto-trigger support for IoT devices
- Emergency history and reporting

## Architecture

- **Language**: Go 1.21+
- **HTTP Framework**: Gorilla Mux
- **Database**: PostgreSQL (pgx driver)
- **Message Broker**: Apache Kafka
- **Logging**: Zerolog

## Project Structure

```
emergency-service/
├── main.go                 # Application entry point
├── go.mod                  # Go module dependencies
├── internal/
│   ├── config/            # Configuration management
│   ├── models/            # Data models and structs
│   ├── handlers/          # HTTP request handlers
│   ├── repository/        # Database access layer
│   ├── kafka/             # Kafka producer and consumer
│   ├── services/          # Business logic services
│   └── db/
│       └── migrations/    # Database migrations
└── tests/                 # Unit and integration tests
```

## Setup

### Prerequisites

- Go 1.21 or higher
- PostgreSQL 15+
- Apache Kafka 3.0+

### Installation

1. Install dependencies:
```bash
go mod download
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Run database migrations:
```bash
# Migrations will be applied automatically on startup
```

4. Run the service:
```bash
go run main.go
```

## API Endpoints

### Health Checks
- `GET /health` - Service health status
- `GET /ready` - Service readiness status

### Emergency Operations
- `POST /api/v1/emergency/trigger` - Trigger emergency alert
- `POST /api/v1/emergency/auto-trigger` - Auto-trigger from IoT device
- `GET /api/v1/emergency/{id}` - Get emergency details
- `PUT /api/v1/emergency/{id}/cancel` - Cancel pending emergency
- `PUT /api/v1/emergency/{id}/resolve` - Resolve active emergency
- `POST /api/v1/emergency/{id}/acknowledge` - Acknowledge emergency
- `GET /api/v1/emergency/history` - Get emergency history

## Configuration

Configuration is managed through environment variables. See `.env.example` for available options.

Key configurations:
- `COUNTDOWN_SECONDS`: Countdown before emergency activation (default: 10)
- `ESCALATION_TIMEOUT_MIN`: Minutes before escalating to secondary contacts (default: 2)
- `MAX_EMERGENCIES_PER_USER`: Maximum active emergencies per user (default: 1)

## Kafka Topics

### Producer Topics
- `emergency-created`: Published when emergency becomes ACTIVE
- `emergency-resolved`: Published when emergency is resolved
- `emergency-cancelled`: Published when emergency is cancelled

### Consumer Topics
- `contact-acknowledged`: Consumed when contact acknowledges emergency
- `location-updated`: Consumed for location updates during emergency

## Development

### Running Tests
```bash
go test ./... -v
```

### Building
```bash
go build -o emergency-service main.go
```

### Docker Build
```bash
docker build -t sos-app/emergency-service:latest .
```

## Performance Targets

- Emergency trigger response time: < 2 seconds
- Countdown accuracy: ±100ms
- Concurrent emergencies supported: 10,000+
- Database connection pool: 25 max connections

## Security

- JWT token authentication on all endpoints
- Rate limiting: 100 requests/minute per user
- Input validation on all requests
- SQL injection prevention via prepared statements

## License

Copyright (c) 2025 SOS App. All rights reserved.
