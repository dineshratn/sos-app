# Communication Service

Real-time messaging and communication service for the SOS App emergency response platform. This service handles WebSocket connections, emergency room management, and real-time participant tracking.

## Features

- **Emergency Room Management**: Join/leave emergency communication rooms
- **Real-Time Presence Tracking**: Track online/offline status of participants
- **WebSocket Communication**: Bi-directional real-time messaging via Socket.IO
- **Redis-Based State**: Fast, scalable participant state management
- **Authentication & Authorization**: JWT-based authentication with role-based access
- **Horizontal Scalability**: Redis adapter for multi-instance deployment

## Technology Stack

- **Node.js** with **TypeScript**
- **Socket.IO** for WebSocket communication
- **Redis** for presence tracking and session management
- **Express** for HTTP endpoints
- **JWT** for authentication
- **Winston** for logging
- **Jest** for testing

## Architecture

```
┌─────────────┐
│   Client    │
│  (Web/App)  │
└──────┬──────┘
       │ WebSocket (Socket.IO)
       │
┌──────▼──────────────────────┐
│   Communication Service     │
│  ┌──────────────────────┐   │
│  │  Socket.IO Server    │   │
│  └──────────┬───────────┘   │
│             │                │
│  ┌──────────▼───────────┐   │
│  │   Room Handler       │   │
│  │  - Join Room         │   │
│  │  - Leave Room        │   │
│  │  - Get Participants  │   │
│  └──────────┬───────────┘   │
│             │                │
│  ┌──────────▼───────────┐   │
│  │   Redis Service      │   │
│  │  - Presence Tracking │   │
│  │  - Room Management   │   │
│  └──────────────────────┘   │
└─────────────┬───────────────┘
              │
         ┌────▼────┐
         │  Redis  │
         └─────────┘
```

## Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Update .env with your configuration
```

## Development

```bash
# Start in development mode with hot reload
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## Build & Deploy

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

## API Documentation

### HTTP Endpoints

#### Health Check
```http
GET /health

Response:
{
  "status": "ok",
  "service": "communication-service",
  "timestamp": "2025-10-28T10:30:00.000Z"
}
```

### WebSocket Events

#### Authentication
Clients must provide a JWT token during connection:

```javascript
const socket = io('http://localhost:3003', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

#### Join Emergency Room

**Event**: `room:join`

**Request**:
```javascript
socket.emit('room:join', {
  emergencyId: 'emg_123',
  userId: 'user_123',
  name: 'John Doe',
  role: 'USER' // USER | CONTACT | RESPONDER | ADMIN
}, (response) => {
  console.log(response);
});
```

**Response**:
```javascript
{
  success: true,
  message: "Successfully joined emergency room",
  participant: {
    userId: "user_123",
    socketId: "socket_abc",
    name: "John Doe",
    role: "USER",
    joinedAt: "2025-10-28T10:30:00.000Z",
    lastSeenAt: "2025-10-28T10:30:00.000Z",
    isOnline: true
  },
  participants: [...], // Array of all participants
  roomInfo: {
    emergencyId: "emg_123",
    participantCount: 5,
    createdAt: "2025-10-28T10:00:00.000Z",
    status: "ACTIVE"
  }
}
```

**Broadcast to Room** (other participants receive):
```javascript
socket.on('user:joined', (event) => {
  // event.participant contains info about user who joined
});
```

#### Leave Emergency Room

**Event**: `room:leave`

**Request**:
```javascript
socket.emit('room:leave', {
  emergencyId: 'emg_123',
  userId: 'user_123'
}, (response) => {
  console.log(response);
});
```

**Response**:
```javascript
{
  success: true,
  message: "Successfully left emergency room"
}
```

**Broadcast to Room**:
```javascript
socket.on('user:left', (event) => {
  // event.participant contains info about user who left
});
```

#### Get Online Participants

**Event**: `room:get-participants`

**Request**:
```javascript
socket.emit('room:get-participants', {
  emergencyId: 'emg_123'
}, (response) => {
  console.log(response.participants);
});
```

**Response**:
```javascript
{
  success: true,
  participants: [
    {
      userId: "user_123",
      name: "John Doe",
      role: "USER",
      isOnline: true,
      joinedAt: "2025-10-28T10:30:00.000Z",
      lastSeenAt: "2025-10-28T10:35:00.000Z"
    },
    // ... more participants
  ]
}
```

#### Update Last Seen

**Event**: `room:update-last-seen`

**Request**:
```javascript
socket.emit('room:update-last-seen', {
  emergencyId: 'emg_123',
  userId: 'user_123'
});
```

No response (fire-and-forget).

## Redis Data Structure

### Participant Data
```
Key: participant:{userId}:{emergencyId}
Type: Hash
Fields:
  - userId: string
  - socketId: string
  - name: string
  - role: string
  - joinedAt: ISO timestamp
  - lastSeenAt: ISO timestamp
  - isOnline: boolean
TTL: 24 hours
```

### Room Participants Set
```
Key: room:{emergencyId}:participants
Type: Set
Members: userId strings
TTL: 24 hours
```

## Testing

The service includes comprehensive unit tests:

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Test Coverage

- ✅ Join room handler with validation
- ✅ Authorization checks
- ✅ User ID mismatch handling
- ✅ Invalid role validation
- ✅ Reconnection handling
- ✅ Leave room functionality
- ✅ Participant retrieval
- ✅ Error handling

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3003` |
| `NODE_ENV` | Environment | `development` |
| `CORS_ORIGIN` | CORS allowed origin | `http://localhost:3000` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `JWT_SECRET` | JWT signing secret | Required |
| `LOG_LEVEL` | Logging level | `info` |

## Deployment

### Docker

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 3003

CMD ["node", "dist/index.js"]
```

### Kubernetes

The service is designed to run in a Kubernetes cluster with:
- Multiple replicas for high availability
- Redis adapter for Socket.IO session sharing
- Horizontal pod autoscaling based on connection count

## Monitoring

### Metrics

- Connection count
- Room join/leave events
- Message throughput
- Error rates
- Redis connection status

### Logging

Structured JSON logging with Winston:
- Connection/disconnection events
- Room join/leave events
- Authentication failures
- Error events with stack traces

## Security

- JWT-based authentication
- Role-based authorization
- User ID validation
- Rate limiting (to be implemented)
- CORS configuration
- Helmet security headers

## Requirements Traceability

This implementation satisfies **Requirement 8.0.1: Communication During Emergencies**:

✅ Emergency chat interface connecting users with contacts
✅ Real-time presence tracking
✅ Multi-user room support
✅ Authentication and authorization
✅ Scalable architecture with Redis

## Contributing

1. Create feature branch
2. Write tests for new functionality
3. Ensure all tests pass (`npm test`)
4. Ensure code coverage > 80%
5. Follow TypeScript/ESLint conventions
6. Submit pull request

## License

MIT License - SOS App Team
