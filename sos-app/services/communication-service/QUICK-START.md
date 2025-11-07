# Communication Service - Quick Start Guide

## Prerequisites

- Node.js 18+ and npm
- MongoDB running on localhost:27017
- Redis running on localhost:6379
- Kafka running on localhost:9092 (optional, service will work without it)

## Installation

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

## Environment Setup

```env
# Server
PORT=3003
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info

# MongoDB
MONGODB_URI=mongodb://localhost:27017/sos-communication

# Redis
REDIS_URL=redis://localhost:6379

# Kafka (optional)
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=communication-service

# JWT
JWT_SECRET=your-secret-key-change-in-production

# Media Storage
MEDIA_STORAGE_PATH=/tmp/sos-media
```

## Running the Service

```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build
npm start

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Testing the Service

### Health Check

```bash
curl http://localhost:3003/health
```

### Generate Test JWT Token

Create a test script to generate tokens:

```javascript
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  {
    userId: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'USER'
  },
  'your-secret-key-change-in-production',
  { expiresIn: '24h' }
);

console.log('Token:', token);
```

### Connect via Socket.IO

```javascript
const io = require('socket.io-client');

const socket = io('http://localhost:3003', {
  auth: {
    token: 'YOUR_JWT_TOKEN_HERE'
  }
});

// Join emergency room
socket.emit('room:join', {
  emergencyId: 'emergency-123',
  userId: 'test-user-123',
  name: 'Test User',
  role: 'USER'
}, (response) => {
  console.log('Join response:', response);
});

// Send message
socket.emit('message:send', {
  emergencyId: 'emergency-123',
  senderId: 'test-user-123',
  type: 'TEXT',
  content: 'Hello, this is a test message!'
}, (response) => {
  console.log('Message sent:', response);
});

// Listen for new messages
socket.on('message:new', (event) => {
  console.log('New message:', event.message);
});

// Start typing
socket.emit('typing:start', {
  emergencyId: 'emergency-123',
  userId: 'test-user-123'
});

// Stop typing
socket.emit('typing:stop', {
  emergencyId: 'emergency-123',
  userId: 'test-user-123'
});
```

### REST API Examples

```bash
# Get message history
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3003/api/v1/messages/emergency-123?limit=50&offset=0

# Upload media
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/image.jpg" \
  -F "emergencyId=emergency-123" \
  -F "content=Check out this image" \
  http://localhost:3003/api/v1/media/upload

# Sync offline messages
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "emergencyId": "emergency-123",
    "messages": [
      {
        "senderId": "test-user-123",
        "type": "TEXT",
        "content": "Offline message 1"
      }
    ]
  }' \
  http://localhost:3003/api/v1/messages/sync
```

## Socket.IO Events Reference

### Client → Server Events

| Event | Description | Payload |
|-------|-------------|---------|
| `room:join` | Join emergency room | `{ emergencyId, userId, name, role }` |
| `room:leave` | Leave emergency room | `{ emergencyId, userId }` |
| `message:send` | Send new message | `{ emergencyId, senderId, type, content, metadata? }` |
| `message:edit` | Edit message | `{ messageId, content, emergencyId }` |
| `message:delete` | Delete message | `{ messageId, emergencyId }` |
| `typing:start` | Start typing | `{ emergencyId, userId }` |
| `typing:stop` | Stop typing | `{ emergencyId, userId }` |
| `message:delivered` | Mark delivered | `{ emergencyId, messageId, userId }` |
| `message:read` | Mark read | `{ emergencyId, messageId, userId }` |

### Server → Client Events

| Event | Description | Payload |
|-------|-------------|---------|
| `user:joined` | User joined room | `{ event, emergencyId, participant, timestamp }` |
| `user:left` | User left room | `{ event, emergencyId, participant, timestamp }` |
| `message:new` | New message | `{ event, emergencyId, message, timestamp }` |
| `message:updated` | Message edited | `{ event, emergencyId, message, timestamp }` |
| `message:deleted` | Message deleted | `{ event, emergencyId, message, timestamp }` |
| `typing:start` | User typing | `{ emergencyId, userId, userName, isTyping }` |
| `typing:stop` | User stopped | `{ emergencyId, userId, userName, isTyping }` |
| `message:delivered` | Message delivered | `{ messageId, userId, timestamp }` |
| `message:read` | Message read | `{ messageId, userId, timestamp }` |

## REST API Reference

### GET /health
Health check endpoint

### GET /api/v1/messages/:emergencyId
Get message history with pagination

Query params:
- `limit` (default: 50, max: 100)
- `offset` (default: 0)
- `before` (ISO date)
- `after` (ISO date)

### POST /api/v1/messages/sync
Sync offline messages

Body:
```json
{
  "emergencyId": "string",
  "messages": [
    {
      "senderId": "string",
      "type": "TEXT|VOICE|IMAGE|VIDEO|LOCATION",
      "content": "string",
      "metadata": {}
    }
  ]
}
```

### POST /api/v1/media/upload
Upload media file

Form data:
- `file` (multipart)
- `emergencyId`
- `content` (optional)

### POST /api/v1/media/transcribe
Transcribe audio file

Form data:
- `audio` (multipart)
- `languageCode` (optional, default: en-US)

### GET /api/v1/media/signed-url/:key
Generate signed URL for media access

Query params:
- `expiresIn` (seconds, default: 3600)

### GET /api/v1/media/languages
Get supported transcription languages

## Troubleshooting

### MongoDB connection fails
```bash
# Check MongoDB is running
mongosh --eval "db.adminCommand('ping')"

# Start MongoDB
mongod --dbpath /path/to/data
```

### Redis connection fails
```bash
# Check Redis is running
redis-cli ping

# Start Redis
redis-server
```

### Socket.IO authentication fails
- Verify JWT_SECRET matches between services
- Check token expiration
- Ensure token is passed in auth.token or query.token

### Media upload fails
- Check MEDIA_STORAGE_PATH directory exists and is writable
- Verify file size is under 50MB
- Ensure supported file type (images, videos, audio)

## Production Deployment

1. Set `NODE_ENV=production`
2. Use strong JWT_SECRET
3. Configure MongoDB replica set
4. Setup Redis cluster
5. Configure AWS S3 for media storage
6. Setup Google Cloud Speech-to-Text
7. Add monitoring (Prometheus, Grafana)
8. Configure log aggregation
9. Enable HTTPS/WSS
10. Setup load balancer with sticky sessions

## Development Tips

- Use `npm run dev` for hot reload
- Check logs/ directory for detailed logs
- Run tests before committing
- Use `npm run lint:fix` to fix linting issues
- Mock external services are used by default (S3, Speech-to-Text)

## Support

For issues or questions, check:
- IMPLEMENTATION-SUMMARY.md for detailed implementation info
- README.md for architecture overview
- Source code comments for specific functionality
