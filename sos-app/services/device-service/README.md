# Device Service

The Device Service is a Go-based microservice that manages IoT devices for the SOS emergency app. It handles device pairing, telemetry processing, vital signs monitoring, and automatic emergency triggering based on device events.

## Features

- **Device Management**: Pair/unpair IoT devices (smart watches, panic buttons, fall detectors)
- **Real-time Telemetry**: Process device telemetry via MQTT
- **Fall Detection**: Automatic emergency triggering on high-confidence fall detection
- **SOS Button**: Immediate emergency response on panic button press
- **Vital Signs Monitoring**: Monitor heart rate, SpO2, temperature, and blood pressure
- **Battery Monitoring**: Alert users when device battery is low (20% and 10% thresholds)
- **Connectivity Monitoring**: Detect and alert on device disconnections
- **RESTful API**: HTTP API for device management

## Architecture

- **Language**: Go 1.21+
- **HTTP Framework**: Gorilla Mux
- **MQTT Client**: Paho MQTT
- **Database**: PostgreSQL with pgx/v5
- **Logging**: Zerolog
- **Testing**: Testify

## Project Structure

```
device-service/
├── cmd/
│   └── server/
│       └── main.go                 # Application entry point
├── internal/
│   ├── models/
│   │   └── device.go               # Domain models
│   ├── repository/
│   │   └── device_repository.go    # Database operations
│   ├── handlers/
│   │   ├── device_handler.go       # HTTP request handlers
│   │   ├── device_handler_test.go  # Handler tests
│   │   └── health_handler.go       # Health check handler
│   ├── mqtt/
│   │   ├── client.go               # MQTT client
│   │   └── handlers/
│   │       ├── telemetry_handler.go # Telemetry processing
│   │       ├── event_handler.go     # Event processing (fall detection)
│   │       ├── event_handler_test.go
│   │       └── sos_handler.go       # SOS button handler
│   ├── services/
│   │   ├── vitals_service.go        # Vital signs monitoring
│   │   ├── battery_monitor.go       # Battery level monitoring
│   │   ├── battery_monitor_test.go
│   │   └── connectivity_monitor.go  # Device connectivity tracking
│   └── db/
│       └── migrations/
│           └── 001_create_devices_table.sql
├── configs/
│   └── vitals_thresholds.yaml      # Vital sign thresholds configuration
├── go.mod
├── go.sum
└── README.md
```

## Prerequisites

- Go 1.21 or higher
- PostgreSQL 14+
- MQTT Broker (Mosquitto)
- Emergency Service running (for auto-trigger integration)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SERVER_ADDRESS` | HTTP server address | `:8082` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://device_user:device_pass@localhost:5432/device_db?sslmode=disable` |
| `MQTT_BROKER_URL` | MQTT broker URL | `tcp://localhost:1883` |
| `MQTT_CLIENT_ID` | MQTT client identifier | `device-service` |
| `MQTT_USERNAME` | MQTT username (optional) | `` |
| `MQTT_PASSWORD` | MQTT password (optional) | `` |
| `MQTT_USE_TLS` | Enable TLS for MQTT | `false` |
| `EMERGENCY_SERVICE_URL` | Emergency Service base URL | `http://emergency-service:8080` |
| `VITALS_CONFIG_PATH` | Path to vitals thresholds config | `/app/configs/vitals_thresholds.yaml` |

## Setup Instructions

### 1. Database Setup

Create the database and run migrations:

```bash
# Create database
createdb device_db

# Set database URL
export DATABASE_URL="postgres://device_user:device_pass@localhost:5432/device_db?sslmode=disable"

# Run migrations
psql $DATABASE_URL < internal/db/migrations/001_create_devices_table.sql
```

### 2. MQTT Broker Setup

Install and start Mosquitto:

```bash
# Ubuntu/Debian
sudo apt-get install mosquitto mosquitto-clients

# macOS
brew install mosquitto

# Start Mosquitto
mosquitto -v
```

### 3. Install Dependencies

```bash
go mod download
```

### 4. Configure Vital Sign Thresholds

Edit `configs/vitals_thresholds.yaml` to customize vital sign thresholds:

```yaml
default:
  heart_rate:
    min: 40
    max: 120
  spo2:
    min: 90
  temperature:
    min: 35.0
    max: 38.5
  blood_pressure:
    systolic:
      min: 90
      max: 180
    diastolic:
      min: 60
      max: 120
```

### 5. Run the Service

```bash
# Development mode
go run cmd/server/main.go

# Build and run
go build -o device-service cmd/server/main.go
./device-service
```

### 6. Run Tests

```bash
# Run all tests
go test ./...

# Run with coverage
go test -cover ./...

# Run specific test
go test ./internal/handlers -v
```

## API Endpoints

### Device Management

#### Pair Device
```http
POST /api/v1/devices/pair
Content-Type: application/json
X-User-ID: <user-id>

{
  "device_type": "SMART_WATCH",
  "manufacturer": "Apple",
  "model": "Watch Series 8",
  "mac_address": "00:1A:2B:3C:4D:5E",
  "capabilities": ["heart_rate", "fall_detection", "spo2"]
}
```

#### Get User Devices
```http
GET /api/v1/devices
X-User-ID: <user-id>
```

#### Get Device
```http
GET /api/v1/devices/{id}
X-User-ID: <user-id>
```

#### Update Device Settings
```http
PUT /api/v1/devices/{id}/settings
Content-Type: application/json
X-User-ID: <user-id>

{
  "settings": {
    "fall_detection_enabled": true,
    "heart_rate_monitoring_interval": 60
  }
}
```

#### Unpair Device
```http
DELETE /api/v1/devices/{id}
X-User-ID: <user-id>
```

### Health Check
```http
GET /health
```

## MQTT Topics

### Subscribe (Service receives from devices)

- `devices/+/telemetry` - Device telemetry data
  ```json
  {
    "device_id": "device-123",
    "timestamp": "2024-01-15T10:30:00Z",
    "battery_level": 85,
    "vital_signs": {
      "heart_rate": 72,
      "spo2": 98,
      "temperature": 36.8
    },
    "location": {
      "latitude": 37.7749,
      "longitude": -122.4194
    }
  }
  ```

- `devices/+/events` - Device events (falls, SOS, etc.)
  ```json
  {
    "device_id": "device-123",
    "event_type": "FallDetected",
    "timestamp": "2024-01-15T10:30:00Z",
    "confidence": 0.95,
    "data": {
      "impact_force": 8.5,
      "location": {
        "latitude": 37.7749,
        "longitude": -122.4194
      }
    }
  }
  ```

### Publish (Service sends to devices)

- `devices/{device-id}/commands` - Commands and settings updates
  ```json
  {
    "command": "update_settings",
    "settings": {
      "fall_detection_enabled": true,
      "monitoring_interval": 60
    }
  }
  ```

## Event Types

- `FallDetected` - Fall detection event (auto-triggers emergency if confidence > 0.8)
- `SOSButtonPressed` - Panic button pressed (immediately triggers emergency)
- `GeofenceExit` - Device exited safe zone (notification only)

## Monitoring Features

### Battery Monitoring
- Sends notification at 20% battery level
- Sends critical notification at 10% battery level
- Automatically resets notification tracking when device is recharged

### Connectivity Monitoring
- Marks devices as DISCONNECTED if no telemetry for 5 minutes
- Sends notification when device disconnects
- Automatically marks as ACTIVE when device reconnects
- Runs background check every 1 minute

### Vital Signs Monitoring
- Monitors heart rate, SpO2, temperature, and blood pressure
- Sends alerts when values exceed configured thresholds
- Supports per-user threshold customization
- Thresholds configurable via YAML file

## Emergency Integration

The service integrates with the Emergency Service for automatic emergency triggering:

- **Fall Detection**: Triggers emergency if confidence > 0.8
- **SOS Button**: Immediately triggers emergency on button press

Emergency trigger payload:
```json
{
  "user_id": "user-123",
  "device_id": "device-123",
  "event_type": "FallDetected",
  "reason": "Fall detected with high confidence",
  "priority": "HIGH",
  "timestamp": "2024-01-15T10:30:00Z",
  "confidence": 0.95,
  "event_data": { ... }
}
```

## Testing

### Unit Tests
```bash
# Run all tests
go test ./...

# Run specific package tests
go test ./internal/handlers -v
go test ./internal/services -v
go test ./internal/mqtt/handlers -v

# Run with coverage
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

### Manual Testing with MQTT

```bash
# Publish telemetry
mosquitto_pub -t "devices/test-device-123/telemetry" -m '{
  "battery_level": 15,
  "vital_signs": {
    "heart_rate": 72,
    "spo2": 98,
    "temperature": 36.8
  }
}'

# Publish fall detection event
mosquitto_pub -t "devices/test-device-123/events" -m '{
  "event_type": "FallDetected",
  "timestamp": "2024-01-15T10:30:00Z",
  "confidence": 0.95,
  "data": {
    "location": {
      "latitude": 37.7749,
      "longitude": -122.4194
    }
  }
}'

# Publish SOS button event
mosquitto_pub -t "devices/test-device-123/events" -m '{
  "event_type": "SOSButtonPressed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "location": {
      "latitude": 37.7749,
      "longitude": -122.4194
    }
  }
}'
```

## Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
pg_isready

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### MQTT Connection Issues
```bash
# Test MQTT broker
mosquitto_sub -t "test" -v

# Check if Mosquitto is running
ps aux | grep mosquitto
```

### Device Not Receiving Commands
1. Verify MQTT client is connected (check /health endpoint)
2. Check device subscription in logs
3. Verify MQTT topic format: `devices/{device-id}/commands`

## Performance Considerations

- Database connection pool: 5-25 connections
- MQTT QoS level: 1 (at least once delivery)
- HTTP request timeout: 15 seconds
- Graceful shutdown timeout: 30 seconds
- Connectivity check interval: 1 minute
- Disconnection threshold: 5 minutes

## Security Notes

- In production, enable TLS for MQTT (`MQTT_USE_TLS=true`)
- Use proper TLS certificates (set `TLSSkipVerify` to `false`)
- Implement authentication middleware for HTTP endpoints
- Use environment variables for sensitive credentials
- Enable PostgreSQL SSL mode in production
- Validate all user inputs
- Implement rate limiting for API endpoints

## License

Copyright © 2024 SOS App. All rights reserved.
