# SOS App - Testing Guide

This guide will help you set up and test the implemented services locally.

## 🚀 Quick Start

### Prerequisites

Make sure you have installed:
- Docker Desktop (or Docker + Docker Compose)
- Node.js 20+ (for local development)
- PostgreSQL 15+ (if running without Docker)
- curl or Postman (for API testing)

### Option 1: Run with Docker Compose (Recommended)

This is the easiest way to test all services together:

```bash
# Navigate to the project directory
cd sos-app

# Start all services
docker-compose up --build

# Services will be available at:
# - Auth Service: http://localhost:3001
# - User Service: http://localhost:3002
# - Medical Service: http://localhost:3003
# - PostgreSQL: localhost:5432
# - Redis: localhost:6379
```

**Wait for all services to be healthy** (check logs for "listening on port" messages).

### Option 2: Run Services Individually

If you prefer to run services without Docker:

#### 1. Start PostgreSQL

```bash
# Using Docker
docker run -d \
  --name sos-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:15-alpine

# Create databases
docker exec -it sos-postgres psql -U postgres -c "CREATE DATABASE sos_auth;"
docker exec -it sos-postgres psql -U postgres -c "CREATE DATABASE sos_user;"
docker exec -it sos-postgres psql -U postgres -c "CREATE DATABASE sos_medical;"
docker exec -it sos-postgres psql -U postgres -d sos_medical -c "CREATE EXTENSION pgcrypto;"
```

#### 2. Start Redis

```bash
docker run -d \
  --name sos-redis \
  -p 6379:6379 \
  redis:7-alpine
```

#### 3. Start Auth Service

```bash
cd services/auth-service

# Install dependencies
npm install

# Set environment variables
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sos_auth"
export REDIS_URL="redis://localhost:6379"
export JWT_SECRET="dev-jwt-secret-change-in-production"
export PORT=3001

# Run migrations (if using migration scripts)
# npm run migrate

# Start service
npm run dev

# Service will be at http://localhost:3001
```

#### 4. Start User Service

```bash
cd services/user-service

# Install dependencies
npm install

# Set environment variables
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sos_user"
export JWT_SECRET="dev-jwt-secret-change-in-production"
export PORT=3002

# Start service
npm run dev

# Service will be at http://localhost:3002
```

#### 5. Start Medical Service

```bash
cd services/medical-service

# Install dependencies
npm install

# Set environment variables
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sos_medical"
export JWT_SECRET="dev-jwt-secret-change-in-production"
export ENCRYPTION_SECRET_KEY="dev-encryption-key-32-chars-long!"
export PORT=3003

# Start service
npm run dev

# Service will be at http://localhost:3003
```

---

## 🧪 Running Tests

### Automated Integration Tests

We've provided a comprehensive test script that tests all services:

```bash
# Make the script executable
chmod +x test-services.sh

# Run all tests
./test-services.sh
```

This will test:
- ✅ Health checks for all services
- ✅ User registration and login
- ✅ Token refresh
- ✅ Session management
- ✅ User profile CRUD
- ✅ Emergency contact management
- ✅ Medical profile management
- ✅ Allergy/medication/condition tracking
- ✅ HIPAA audit logging

### Unit Tests

Run unit tests for each service:

```bash
# Auth Service
cd services/auth-service
npm test

# User Service
cd services/user-service
npm test

# Medical Service
cd services/medical-service
npm test
```

### Coverage Reports

Generate test coverage reports:

```bash
# Auth Service
cd services/auth-service
npm run test:coverage

# User Service
cd services/user-service
npm run test:coverage

# Medical Service
cd services/medical-service
npm run test:coverage
```

---

## 📡 Manual API Testing

### Health Checks

Check if services are running:

```bash
# Auth Service
curl http://localhost:3001/health

# User Service
curl http://localhost:3002/health

# Medical Service
curl http://localhost:3003/health
```

### Auth Service

#### 1. Register a new user

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

#### 2. Login

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

**Save the JWT token** from the response for subsequent requests.

#### 3. Refresh Token

```bash
curl -X POST http://localhost:3001/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

#### 4. List Sessions

```bash
curl -X GET http://localhost:3001/api/v1/auth/sessions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 5. Request Password Reset

```bash
curl -X POST http://localhost:3001/api/v1/auth/password/request \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

#### 6. MFA Enrollment

```bash
curl -X POST http://localhost:3001/api/v1/auth/mfa/enroll \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### User Service

#### 1. Get User Profile

```bash
curl -X GET http://localhost:3002/api/v1/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 2. Update Profile

```bash
curl -X PUT http://localhost:3002/api/v1/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+12025551234",
    "dateOfBirth": "1990-01-15",
    "timezone": "America/New_York"
  }'
```

#### 3. Add Emergency Contact

```bash
curl -X POST http://localhost:3002/api/v1/contacts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "phoneNumber": "+12025555678",
    "email": "jane@example.com",
    "relationship": "spouse",
    "priority": "primary",
    "address": "123 Main St, City, State 12345"
  }'
```

#### 4. List Emergency Contacts

```bash
curl -X GET http://localhost:3002/api/v1/contacts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 5. Update Contact

```bash
curl -X PUT http://localhost:3002/api/v1/contacts/CONTACT_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+12025559999",
    "priority": "secondary"
  }'
```

#### 6. Get Contact Statistics

```bash
curl -X GET http://localhost:3002/api/v1/contacts/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Medical Service

#### 1. Get Medical Profile

```bash
curl -X GET http://localhost:3003/api/v1/medical/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 2. Update Medical Profile

```bash
curl -X PUT http://localhost:3003/api/v1/medical/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bloodType": "A+",
    "organDonor": true,
    "doNotResuscitate": false,
    "emergencyNotes": "No known drug allergies. Diabetic.",
    "primaryPhysician": "Dr. Smith",
    "primaryPhysicianPhone": "+12025551111"
  }'
```

#### 3. Add Allergy

```bash
curl -X POST http://localhost:3003/api/v1/medical/allergies \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "allergen": "Penicillin",
    "severity": "severe",
    "reaction": "Anaphylaxis",
    "notes": "Carry EpiPen at all times"
  }'
```

#### 4. Add Medication

```bash
curl -X POST http://localhost:3003/api/v1/medical/medications \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "medicationName": "Metformin",
    "dosage": "500mg",
    "frequency": "Twice daily",
    "route": "oral",
    "prescribedBy": "Dr. Smith"
  }'
```

#### 5. Add Medical Condition

```bash
curl -X POST http://localhost:3003/api/v1/medical/conditions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conditionName": "Type 2 Diabetes",
    "severity": "moderate",
    "isChronic": true,
    "notes": "Controlled with medication and diet"
  }'
```

#### 6. View Audit Log

```bash
curl -X GET "http://localhost:3003/api/v1/medical/audit?limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 7. Generate Emergency Access Link

```bash
curl -X POST http://localhost:3003/api/v1/medical/access-link \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "emergencyId": "emergency-123"
  }'
```

---

## 🔍 Troubleshooting

### Services won't start

```bash
# Check if ports are already in use
lsof -i :3001
lsof -i :3002
lsof -i :3003

# Stop conflicting services
docker-compose down

# Rebuild and restart
docker-compose up --build --force-recreate
```

### Database connection errors

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check database logs
docker logs sos-postgres

# Recreate databases
docker-compose down -v
docker-compose up --build
```

### JWT token expired

Tokens expire after 24 hours. Use the refresh endpoint or login again:

```bash
curl -X POST http://localhost:3001/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}'
```

### Clear all data and start fresh

```bash
# Stop all services and remove volumes
docker-compose down -v

# Remove containers
docker rm -f sos-postgres sos-redis sos-auth-service sos-user-service sos-medical-service

# Start again
docker-compose up --build
```

---

## 📊 Monitoring

### View Service Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f auth-service
docker-compose logs -f user-service
docker-compose logs -f medical-service
```

### Database Access

```bash
# Connect to PostgreSQL
docker exec -it sos-postgres psql -U postgres

# List databases
\l

# Connect to a database
\c sos_auth

# List tables
\dt

# View users table
SELECT * FROM users;
```

### Redis Access

```bash
# Connect to Redis
docker exec -it sos-redis redis-cli

# Check keys
KEYS *

# Get a key
GET session:abc123
```

---

## 🎯 What to Test

### Critical Flows

1. **User Registration Flow**
   - Register → Verify email → Login → Access protected resources

2. **Authentication Flow**
   - Login → Get JWT → Use JWT → Refresh token → Logout

3. **Profile Management Flow**
   - Login → Get profile → Update profile → Add contacts → View contacts

4. **Medical Information Flow**
   - Login → Get medical profile → Add allergies/medications → View audit log

5. **Emergency Access Flow**
   - Login → Generate access link → Use link to view medical info → Check audit log

### Security Testing

1. **Test without authentication**
   ```bash
   curl http://localhost:3002/api/v1/users/me
   # Should return 401 Unauthorized
   ```

2. **Test with invalid token**
   ```bash
   curl http://localhost:3002/api/v1/users/me \
     -H "Authorization: Bearer invalid-token"
   # Should return 401 Invalid token
   ```

3. **Test access to another user's data**
   - Create two users
   - Try to access user B's data with user A's token
   - Should be denied

### HIPAA Compliance Verification

1. **Encryption**: Check that medical data is encrypted in database
2. **Audit Logging**: Verify all medical data access is logged
3. **Access Controls**: Verify only authorized users can access PHI
4. **Emergency Access**: Test secure link generation and expiration

---

## 📝 Next Steps

After verifying all services work:

1. **Run full test suite** with `./test-services.sh`
2. **Check code coverage** with `npm run test:coverage`
3. **Review audit logs** in medical service
4. **Test error scenarios** (invalid input, expired tokens, etc.)
5. **Load testing** (optional) using tools like Apache Bench or k6

---

## 🐛 Known Limitations

- **No email service**: Password reset emails are logged but not sent
- **No OAuth providers**: Google/Apple OAuth endpoints exist but need provider setup
- **Development secrets**: Using hardcoded secrets (change in production!)
- **No rate limiting** in development mode
- **Migrations**: May need to run manually on first start

---

## 📚 Additional Resources

- [Implementation Review](./IMPLEMENTATION_REVIEW.md)
- [API Documentation](./docs/API.md) *(if exists)*
- [Architecture Overview](../.claude/specs/sos-app/design.md)
- [Requirements](../.claude/specs/sos-app/requirements.md)

---

**Ready to test? Run `./test-services.sh` to get started!** 🚀
