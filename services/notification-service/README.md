# Notification Service

Multi-channel notification service for SOS App emergency alerts. Provides reliable notification delivery via push notifications (FCM/APNs), SMS (Twilio), and email (SendGrid) with retry logic and fallback channels.

## Features

- **Multi-Channel Support**: Push (FCM/APNs), SMS (Twilio), Email (SendGrid)
- **Reliable Job Processing**: Bull queue with Redis for guaranteed delivery
- **Event-Driven Architecture**: Kafka consumer for emergency events
- **Retry Logic**: Automatic retries with exponential backoff
- **Fallback Channels**: Automatic fallback from push → SMS → email
- **Escalation Support**: Notify secondary contacts if primary don't acknowledge
- **Priority Queue**: High-priority queue for emergency notifications
- **Delivery Tracking**: MongoDB for notification logs and delivery status
- **Webhook Receivers**: Track delivery confirmations from providers

## Architecture

```
┌──────────────┐
│ Kafka Events │ → Emergency Created, Escalation
└──────┬───────┘
       ↓
┌──────────────────┐
│ Notification     │
│ Dispatcher       │
└──────┬───────────┘
       ↓
┌──────────────────┐
│ Bull Queue       │ → Regular Queue + Priority Queue
│ (Redis)          │
└──────┬───────────┘
       ↓
┌──────────────────┐
│ Job Processor    │
│ (10 workers)     │
└──────┬───────────┘
       ↓
┌──────────────────────────────────────┐
│ Providers                            │
│ - FCM (Firebase Cloud Messaging)     │
│ - APNs (Apple Push Notifications)    │
│ - Twilio (SMS)                       │
│ - SendGrid (Email)                   │
└──────┬───────────────────────────────┘
       ↓
┌──────────────────┐
│ MongoDB          │ → Notification logs & batch tracking
└──────────────────┘
```

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/sos_notifications

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Kafka
KAFKA_BROKERS=localhost:9092

# Firebase Cloud Messaging (FCM)
FCM_PROJECT_ID=your-project-id
FCM_PRIVATE_KEY=your-private-key
FCM_CLIENT_EMAIL=your-client-email

# Apple Push Notifications (APNs)
APNS_KEY_ID=your-key-id
APNS_TEAM_ID=your-team-id
APNS_KEY_PATH=./certs/AuthKey.p8
APNS_PRODUCTION=false

# Twilio SMS
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# SendGrid Email
SENDGRID_API_KEY=your-api-key
SENDGRID_FROM_EMAIL=alerts@sos-app.com
```

## Running the Service

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Tests
```bash
npm test
npm run test:watch
npm run test:coverage
```

## API Endpoints

### Health Check
```
GET /health
```

### Webhook Receivers

#### Twilio SMS Status
```
POST /api/v1/webhooks/twilio/status
```

#### SendGrid Email Events
```
POST /api/v1/webhooks/sendgrid/events
```

#### FCM Delivery Receipt
```
POST /api/v1/webhooks/fcm/receipt
```

#### Generic Delivery Confirmation
```
POST /api/v1/webhooks/delivery/confirm
```

## Kafka Topics

### Consumed Topics
- `emergency-created`: New emergency events
- `emergency-escalation`: Escalation events for secondary contacts

### Event Formats

#### Emergency Created
```json
{
  "emergencyId": "emg_123",
  "userId": "user_456",
  "userName": "John Doe",
  "emergencyType": "MEDICAL",
  "status": "ACTIVE",
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "address": "123 Main St, San Francisco, CA"
  },
  "contacts": [
    {
      "id": "contact_1",
      "name": "Jane Doe",
      "phoneNumber": "+1234567890",
      "email": "jane@example.com",
      "priority": "PRIMARY",
      "fcmToken": "fcm_token_123"
    }
  ]
}
```

## Notification Flow

1. **Emergency Created** → Kafka event received
2. **Dispatcher** → Creates notification jobs for each contact/channel
3. **Queue** → Jobs added to Bull queue (priority or regular)
4. **Worker** → Processes jobs with appropriate provider
5. **Provider** → Sends notification (FCM/APNs/Twilio/SendGrid)
6. **Retry** → On failure, retry with backoff or fallback channel
7. **Tracking** → Update MongoDB with delivery status
8. **Webhook** → Receive delivery confirmation from provider

## Retry Logic

### Retry Strategy by Channel

| Channel | Attempts | Backoff | Delay |
|---------|----------|---------|-------|
| PUSH    | 3        | Exponential | 5s, 15s, 45s |
| SMS     | 2        | Fixed   | 10s, 10s |
| EMAIL   | 3        | Exponential | 10s, 20s, 40s |

### Fallback Chain
1. Push notification fails → Immediate SMS fallback
2. SMS fails → Email fallback
3. All channels fail → Log critical error

## Escalation

If primary contacts don't acknowledge within 2 minutes:
1. Emergency escalated to secondary contacts
2. Follow-up notifications sent every 30 seconds
3. Maximum 10 follow-ups (5 minutes total)
4. Escalation cancelled when contact acknowledges

## Monitoring

### Queue Metrics
- Waiting jobs
- Active jobs
- Completed jobs
- Failed jobs
- Delayed jobs

### Notification Metrics
- Delivery rate by channel
- Average delivery time
- Failed notifications
- Retry statistics

## Error Handling

### Provider-Specific Errors

#### FCM
- Invalid/expired token → Remove token, don't retry
- Rate limit → Exponential backoff
- Server unavailable → Retry

#### APNs
- Invalid token → Remove token, don't retry
- Bad certificate → Critical error, alert ops
- Service unavailable → Retry

#### Twilio
- Invalid phone number → Don't retry, log error
- Carrier violation → Don't retry
- Service unavailable → Retry

#### SendGrid
- Invalid email → Don't retry
- Rate limit → Exponential backoff
- Service unavailable → Retry

## Performance

- **Concurrency**: 10 concurrent workers
- **Priority Queue**: Separate queue for emergency notifications
- **Batch Processing**: Bulk job enqueueing
- **Connection Pooling**: Redis and MongoDB connection pools
- **Target Delivery Time**: < 3 seconds for push/SMS

## Security

- API keys stored in environment variables
- Webhook endpoints validate signatures
- APNs uses token-based authentication
- All external requests over HTTPS/TLS

## Dependencies

### Core
- `express`: HTTP server
- `bull`: Job queue
- `ioredis`: Redis client
- `mongoose`: MongoDB ODM
- `kafkajs`: Kafka client

### Providers
- `firebase-admin`: FCM
- `node-apn`: APNs
- `twilio`: SMS
- `@sendgrid/mail`: Email

### Utilities
- `winston`: Logging
- `dotenv`: Environment configuration
- `joi`: Validation

## License

MIT
