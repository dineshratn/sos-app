# Location Service

High-performance real-time location tracking service for the SOS App, built with Go.

## Features

- Real-time location tracking with WebSocket support
- TimescaleDB hypertable for efficient time-series storage
- Redis geospatial caching for fast location retrieval
- Batch write optimization for high-frequency updates
- Reverse geocoding integration (Mapbox/Google Maps)
- Offline location cache handling
- Fallback location provider logic (GPS > WiFi > Cellular)
- Kafka event streaming for location updates

## Technology Stack

- **Language**: Go 1.21
- **Web Framework**: Fiber v2
- **Database**: TimescaleDB (PostgreSQL extension)
- **Cache**: Redis with geospatial support
- **Message Broker**: Apache Kafka
- **WebSocket**: gorilla/websocket

## Prerequisites

- Go 1.21 or higher
- TimescaleDB instance
- Redis instance
- Apache Kafka cluster
- Mapbox or Google Maps API key (for geocoding)

## Installation

1. Clone the repository and navigate to the location service:
```bash
cd services/location-service
```

2. Install dependencies:
```bash
go mod download
```

3. Copy the example environment file and configure:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run database migrations:
```bash
go run internal/db/migrations/run_migrations.go
```

## Running the Service

### Development
```bash
go run main.go
```

### Production
```bash
go build -o location-service
./location-service
```

### Docker
```bash
docker build -t location-service .
docker run -p 3003:3003 --env-file .env location-service
```

## API Endpoints

### Location Tracking
- `POST /api/v1/location/update` - Update user location
- `POST /api/v1/location/batch-update` - Batch update locations (offline sync)
- `GET /api/v1/location/current/:emergencyId` - Get current location
- `GET /api/v1/location/trail/:emergencyId` - Get location trail (last 30 min)
- `GET /api/v1/location/history/:emergencyId` - Get full location history

### WebSocket
- `GET /api/v1/location/subscribe` - Subscribe to real-time location updates

### Health Check
- `GET /health` - Service health status

## WebSocket Protocol

### Subscribe to Location Updates
```javascript
const ws = new WebSocket('ws://localhost:3003/api/v1/location/subscribe');

ws.onopen = () => {
  // Subscribe to emergency room
  ws.send(JSON.stringify({
    action: 'subscribe',
    emergencyId: 'emg_123456'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Location update:', data);
};
```

### Location Update Message Format
```json
{
  "type": "location:update",
  "emergencyId": "emg_123456",
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "accuracy": 8.5,
    "altitude": 10.2,
    "speed": 0.0,
    "heading": 180.0,
    "provider": "GPS",
    "address": "123 Market St, San Francisco, CA",
    "timestamp": "2025-10-30T12:00:00Z"
  }
}
```

## Performance Optimizations

1. **Batch Writes**: Location updates are buffered and written in batches every 500ms
2. **Redis Geospatial Cache**: Current locations cached for O(1) retrieval
3. **Connection Pooling**: pgx connection pool for efficient database access
4. **Compression**: TimescaleDB automatic compression after 7 days
5. **Retention Policy**: 2-year data retention with automatic cleanup

## Testing

Run unit tests:
```bash
go test ./... -v
```

Run integration tests:
```bash
go test ./... -tags=integration -v
```

## Architecture

```
┌─────────────────┐
│  Mobile Clients │
└────────┬────────┘
         │
         v
┌─────────────────────────────────────┐
│      Location Service (Fiber)       │
│  ┌─────────────────────────────┐   │
│  │   Location Handler          │   │
│  │  - Update Location          │   │
│  │  - Get Current/Trail/History│   │
│  └─────────────┬───────────────┘   │
│                │                    │
│  ┌─────────────v───────────────┐   │
│  │   Location Service          │   │
│  │  - Batch Processing         │   │
│  │  - Validation               │   │
│  │  - Geocoding                │   │
│  └──┬────────┬─────────────┬───┘   │
└─────┼────────┼─────────────┼───────┘
      │        │             │
      v        v             v
┌──────────┐ ┌─────┐  ┌──────────┐
│TimescaleDB│ │Redis│  │  Kafka   │
│(Location │ │Geo  │  │(Events)  │
│ Points)  │ │Cache│  │          │
└──────────┘ └─────┘  └──────────┘
      │
      v
┌──────────────────────┐
│   WebSocket Hub      │
│  (Broadcast Service) │
└──────────┬───────────┘
           │
           v
    ┌──────────────┐
    │   Contacts   │
    │  (Real-time) │
    └──────────────┘
```

## Environment Variables

See `.env.example` for all available configuration options.

## License

Copyright (c) 2025 SOS App. All rights reserved.
