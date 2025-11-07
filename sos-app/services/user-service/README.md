# SOS App - User Service

## Overview

The User Service manages user profiles and emergency contacts for the SOS App. It provides comprehensive profile management, medical information storage, and emergency contact management with priority-based ordering.

## Features

- **User Profile Management**
  - Personal information (name, DOB, gender)
  - Contact details (phone, address)
  - Medical information (blood type, conditions, allergies, medications)
  - Emergency notes for first responders
  - Profile completeness checking
  - Age calculation from date of birth

- **Emergency Contacts Management**
  - Multiple contacts per user (max 10, configurable)
  - 12 relationship types
  - Primary contact designation
  - Priority ordering
  - Complete contact information storage
  - Phone number validation (E.164 format)

- **Security**
  - JWT token authentication
  - User ownership verification
  - Soft delete support (paranoid mode)
  - Comprehensive error handling

## Technology Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js 4.18+
- **Language**: TypeScript 5.3+
- **ORM**: Sequelize 6.35+ with sequelize-typescript
- **Database**: PostgreSQL 13+
- **Validation**: libphonenumber-js 1.10+
- **Logging**: Winston 3.11+
- **Testing**: Jest 29.7+ with ts-jest

## Project Structure

```
user-service/
├── src/
│   ├── config/
│   │   └── index.ts                # Configuration management
│   ├── db/
│   │   ├── index.ts                # Database connection
│   │   └── migrations/
│   │       ├── 001_create_user_profiles_table.sql
│   │       └── 002_create_emergency_contacts_table.sql
│   ├── middleware/
│   │   ├── authMiddleware.ts       # JWT authentication
│   │   └── errorHandler.ts         # Error handling
│   ├── models/
│   │   ├── UserProfile.ts          # User profile model
│   │   └── EmergencyContact.ts     # Emergency contact model
│   ├── routes/
│   │   ├── profile.routes.ts       # Profile endpoints
│   │   └── emergencyContact.routes.ts  # Contact endpoints
│   ├── services/
│   │   ├── profile.service.ts      # Profile business logic
│   │   └── emergencyContact.service.ts  # Contact business logic
│   ├── utils/
│   │   ├── logger.ts               # Winston logger
│   │   └── phoneValidator.ts       # Phone validation
│   └── index.ts                    # Application entry point
├── tests/
│   ├── setup.ts                    # Test configuration
│   ├── unit/                       # Unit tests
│   └── integration/                # Integration tests
├── package.json
├── tsconfig.json
├── jest.config.js
├── Dockerfile
├── .env.example
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 13+
- Running Auth Service (for JWT secret)

### Installation

1. Navigate to user service directory
```bash
cd services/user-service
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run database migrations
```bash
npm run migrate:up
```

5. Start development server
```bash
npm run dev
```

6. Build for production
```bash
npm run build
npm start
```

## Configuration

### Environment Variables

See `.env.example` for all available configuration options.

#### Required Variables

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sos_user_db
DB_USER=postgres
DB_PASSWORD=postgres

# JWT (must match auth service)
JWT_SECRET=your-secret-key
```

#### Optional Variables

```bash
# Server
NODE_ENV=development
PORT=3002

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Emergency Contacts
MAX_EMERGENCY_CONTACTS=10

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Database Schema

### user_profiles Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | References user in auth service (unique) |
| first_name | VARCHAR(100) | User's first name |
| last_name | VARCHAR(100) | User's last name |
| date_of_birth | DATE | Date of birth |
| gender | ENUM | male, female, other, prefer_not_to_say |
| phone_number | VARCHAR(20) | Primary phone number |
| address | TEXT | Street address |
| city | VARCHAR(100) | City |
| state | VARCHAR(100) | State/Province |
| country | VARCHAR(100) | Country |
| postal_code | VARCHAR(20) | Postal/ZIP code |
| blood_type | ENUM | A+, A-, B+, B-, AB+, AB-, O+, O- |
| medical_conditions | TEXT | Known medical conditions |
| allergies | TEXT | Known allergies |
| medications | TEXT | Current medications |
| emergency_notes | TEXT | Important notes for emergency responders |
| profile_picture_url | VARCHAR(500) | Profile picture URL |
| is_active | BOOLEAN | Account active status |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |
| deleted_at | TIMESTAMP | Soft delete timestamp |

### emergency_contacts Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_profile_id | UUID | Foreign key to user_profiles |
| name | VARCHAR(200) | Contact name |
| relationship | ENUM | 12 relationship types |
| phone_number | VARCHAR(20) | Primary phone number |
| alternate_phone_number | VARCHAR(20) | Alternate phone number |
| email | VARCHAR(255) | Email address |
| address | TEXT | Street address |
| city | VARCHAR(100) | City |
| state | VARCHAR(100) | State/Province |
| country | VARCHAR(100) | Country |
| postal_code | VARCHAR(20) | Postal/ZIP code |
| is_primary | BOOLEAN | Primary contact flag |
| priority | INTEGER | Priority order (1 = highest) |
| notes | TEXT | Additional notes |
| is_active | BOOLEAN | Active status |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |
| deleted_at | TIMESTAMP | Soft delete timestamp |

**Constraints**:
- Foreign key: user_profile_id → user_profiles(id) with CASCADE delete
- Unique: Only one primary contact per user

## API Endpoints

### Authentication

All endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <access-token>
```

### Profile Endpoints

#### GET /api/v1/users/profile
Get current user's profile (creates if doesn't exist).

**Response**: `200 OK`
```json
{
  "success": true,
  "profile": {
    "id": "uuid",
    "userId": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1990-01-15",
    "gender": "male",
    "phoneNumber": "+1234567890",
    "bloodType": "O+",
    "medicalConditions": "Diabetes",
    "allergies": "Peanuts",
    "medications": "Insulin",
    "emergencyNotes": "Diabetic - carries insulin",
    "isActive": true,
    "createdAt": "2025-10-31T10:00:00Z",
    "updatedAt": "2025-10-31T10:00:00Z"
  }
}
```

#### PUT /api/v1/users/profile
Update user profile.

**Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-15",
  "gender": "male",
  "phoneNumber": "+1234567890",
  "address": "123 Main St",
  "city": "New York",
  "state": "NY",
  "country": "USA",
  "postalCode": "10001",
  "bloodType": "O+",
  "medicalConditions": "Diabetes",
  "allergies": "Peanuts",
  "medications": "Insulin",
  "emergencyNotes": "Diabetic - carries insulin"
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "profile": { /* updated profile */ }
}
```

#### DELETE /api/v1/users/profile
Delete user profile (soft delete).

**Response**: `200 OK`
```json
{
  "success": true,
  "message": "Profile deleted successfully"
}
```

### Emergency Contact Endpoints

#### GET /api/v1/users/emergency-contacts
Get all emergency contacts (ordered by priority).

**Response**: `200 OK`
```json
{
  "success": true,
  "count": 3,
  "contacts": [
    {
      "id": "uuid",
      "name": "Jane Doe",
      "relationship": "spouse",
      "phoneNumber": "+1234567890",
      "email": "jane@example.com",
      "isPrimary": true,
      "priority": 1,
      "isActive": true
    }
  ]
}
```

#### POST /api/v1/users/emergency-contacts
Create new emergency contact.

**Request Body**:
```json
{
  "name": "Jane Doe",
  "relationship": "spouse",
  "phoneNumber": "+1234567890",
  "alternatePhoneNumber": "+0987654321",
  "email": "jane@example.com",
  "address": "123 Main St",
  "city": "New York",
  "state": "NY",
  "country": "USA",
  "postalCode": "10001",
  "isPrimary": true,
  "priority": 1,
  "notes": "Best time to call: 9am-5pm"
}
```

**Response**: `201 Created`
```json
{
  "success": true,
  "message": "Emergency contact created successfully",
  "contact": { /* created contact */ }
}
```

#### GET /api/v1/users/emergency-contacts/:contactId
Get specific emergency contact.

**Response**: `200 OK`
```json
{
  "success": true,
  "contact": { /* contact details */ }
}
```

#### PUT /api/v1/users/emergency-contacts/:contactId
Update emergency contact.

**Request Body**: Same as POST (all fields optional)

**Response**: `200 OK`
```json
{
  "success": true,
  "message": "Emergency contact updated successfully",
  "contact": { /* updated contact */ }
}
```

#### DELETE /api/v1/users/emergency-contacts/:contactId
Delete emergency contact (soft delete).

**Response**: `200 OK`
```json
{
  "success": true,
  "message": "Emergency contact deleted successfully"
}
```

#### PUT /api/v1/users/emergency-contacts/:contactId/primary
Set contact as primary (unsets current primary).

**Response**: `200 OK`
```json
{
  "success": true,
  "message": "Primary contact updated successfully",
  "contact": { /* updated contact */ }
}
```

## Relationship Types

The following relationship types are supported for emergency contacts:

- `spouse` - Spouse/Husband/Wife
- `parent` - Mother/Father
- `child` - Son/Daughter
- `sibling` - Brother/Sister
- `friend` - Friend
- `partner` - Partner
- `relative` - Other relative
- `guardian` - Legal guardian
- `caregiver` - Caregiver
- `neighbor` - Neighbor
- `colleague` - Work colleague
- `other` - Other relationship

## Blood Types

Supported blood types:
- A+, A-, B+, B-, AB+, AB-, O+, O-

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "stack": "..." // Only in development
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `NO_TOKEN_PROVIDED` | 401 | Missing authentication token |
| `INVALID_TOKEN` | 401 | Invalid or malformed token |
| `TOKEN_EXPIRED` | 401 | Access token expired |
| `PROFILE_NOT_FOUND` | 404 | User profile not found |
| `CONTACT_NOT_FOUND` | 404 | Emergency contact not found |
| `INVALID_PHONE_NUMBER` | 400 | Invalid phone number format |
| `INVALID_DATE_OF_BIRTH` | 400 | Invalid date of birth |
| `MAX_CONTACTS_REACHED` | 400 | Maximum contacts limit reached |
| `PROFILE_GET_ERROR` | 500 | Failed to get profile |
| `PROFILE_UPDATE_ERROR` | 500 | Failed to update profile |
| `CONTACT_CREATE_ERROR` | 500 | Failed to create contact |

## Testing

### Run Tests

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm test -- --coverage
```

### Test Structure

```
tests/
├── setup.ts                        # Test configuration
├── unit/
│   ├── models/
│   │   ├── UserProfile.test.ts     # Model tests
│   │   └── EmergencyContact.test.ts
│   ├── services/
│   │   ├── profile.service.test.ts
│   │   └── emergencyContact.service.test.ts
│   └── utils/
│       └── phoneValidator.test.ts
└── integration/
    ├── profile.routes.test.ts      # API tests
    └── emergencyContacts.routes.test.ts
```

### Coverage Goals

- Lines: 75%+
- Functions: 75%+
- Branches: 70%+
- Statements: 75%+

## Docker

### Build Image

```bash
docker build -t sos-app/user-service:latest .
```

### Run Container

```bash
docker run -d \
  -p 3002:3002 \
  --name user-service \
  --env-file .env \
  sos-app/user-service:latest
```

### Docker Compose

```yaml
version: '3.8'

services:
  user-service:
    build: .
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=sos_user_db
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Kubernetes Deployment

### Deployment YAML

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
    spec:
      containers:
      - name: user-service
        image: sos-app/user-service:latest
        ports:
        - containerPort: 3002
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_HOST
          value: "postgres-service"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secret
              key: secret
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3002
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3002
          initialDelaySeconds: 10
          periodSeconds: 5
        startupProbe:
          httpGet:
            path: /health/startup
            port: 3002
          failureThreshold: 30
          periodSeconds: 10
```

## Security

### Best Practices

✅ **JWT Validation**: All routes validate access tokens
✅ **Ownership Verification**: Users can only access their own data
✅ **Phone Validation**: E.164 format enforcement
✅ **Soft Delete**: Paranoid mode for data recovery
✅ **Error Handling**: No sensitive data in error messages
✅ **Rate Limiting**: Protection against abuse
✅ **HTTPS**: Use TLS in production

## Monitoring

### Health Check Endpoints

```
GET /health          - Basic health check
GET /health/startup  - Kubernetes startup probe
GET /health/ready    - Kubernetes readiness probe (checks DB)
GET /health/live     - Kubernetes liveness probe
```

### Metrics to Track

- Request rate (req/s)
- Response time (ms)
- Error rate (%)
- Database connection pool usage
- Profile creation rate
- Emergency contact management

### Recommended Tools

- **Prometheus**: Metrics collection
- **Grafana**: Visualization
- **ELK Stack**: Log aggregation
- **Sentry**: Error tracking

## Troubleshooting

### Common Issues

**Issue**: Database connection failed
```bash
# Check PostgreSQL status
psql -h localhost -U postgres -d sos_user_db

# Run migrations
npm run migrate:up
```

**Issue**: Phone number validation fails
```bash
# Ensure E.164 format: +[country code][number]
# Example: +12345678900
```

**Issue**: JWT validation fails
```bash
# Verify JWT secret matches auth service
echo $JWT_SECRET

# Check token expiry
# Access tokens expire after 15 minutes by default
```

## Contributing

1. Follow TypeScript best practices
2. Add tests for new features
3. Update documentation
4. Follow existing code style

## License

Proprietary - SOS App

## Support

For issues and questions:
- GitHub Issues: [sos-app/issues](https://github.com/sos-app/issues)
- Email: support@sos-app.com

---

**Version**: 1.0.0
**Last Updated**: 2025-10-31
