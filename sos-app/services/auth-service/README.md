# SOS App - Authentication Service

Production-ready authentication microservice for the SOS App platform. Provides JWT-based authentication, OAuth 2.0 social login (Google, Apple), multi-factor authentication (MFA), and session management.

## Features

### ✅ Implemented (Sprint 1 - Tasks 21-28)

- **User Management**
  - User model with email/phone authentication
  - Password hashing with bcrypt (10 rounds)
  - Account locking after 5 failed login attempts
  - Soft delete support (paranoid mode)
  - Last login tracking

- **Session Management**
  - Session model with device tracking
  - Refresh token management
  - Multi-device support (up to 5 concurrent sessions)
  - Session expiration handling
  - Automatic cleanup of expired sessions

- **Password Security**
  - Bcrypt password hashing
  - Password strength validation (uppercase, lowercase, numbers, special chars)
  - Configurable minimum length (default: 8 characters)
  - Random password generation utility

- **JWT Token Management**
  - Access tokens (15 minute expiry)
  - Refresh tokens (7 day expiry)
  - RS256 algorithm support
  - Token verification and validation
  - Token expiry checking utilities

- **Authentication Middleware**
  - JWT token validation middleware
  - Optional authentication support
  - User ownership validation
  - Permission checking framework

- **Infrastructure**
  - PostgreSQL database with Sequelize ORM
  - Redis for session caching (planned)
  - Rate limiting (100 requests/minute)
  - CORS configuration
  - Helmet security headers
  - Winston logging
  - Graceful shutdown handling

### 🚧 Coming in Sprint 2 (Tasks 29-40)

- Registration endpoint
- Login endpoint
- Token refresh endpoint
- Logout endpoint
- OAuth 2.0 (Google, Apple)
- Password reset flow
- MFA (TOTP) implementation
- Comprehensive unit tests

## Technology Stack

- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Sequelize
- **Caching**: Redis with ioredis
- **Authentication**: JWT (jsonwebtoken), Passport.js
- **Security**: bcrypt, helmet, cors
- **Testing**: Jest with ts-jest
- **Logging**: Winston

## Prerequisites

- Node.js >= 20.0.0
- PostgreSQL >= 14
- Redis >= 6
- npm or yarn

## Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
nano .env
```

## Configuration

All configuration is done via environment variables. See `.env.example` for all available options.

### Required Configuration

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sos_app_auth
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Secrets (CHANGE IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Optional Configuration

- OAuth 2.0 credentials (Google, Apple)
- SMTP settings for password reset emails
- Rate limiting parameters
- Session timeout settings
- Logging levels

## Database Setup

### Using Sequelize Sync (Development)

```bash
# Automatically sync models to database
npm run dev
```

### Using SQL Migrations (Production)

```bash
# Run migrations manually
psql -U postgres -d sos_app_auth -f src/db/migrations/001_create_users_table.sql
psql -U postgres -d sos_app_auth -f src/db/migrations/002_create_sessions_table.sql
```

## Running the Service

### Development Mode

```bash
# Run with hot reload
npm run dev
```

### Production Mode

```bash
# Build TypeScript
npm run build

# Start service
npm start
```

### Docker

```bash
# Build image
docker build -t sos-app/auth-service .

# Run container
docker run -p 8081:8081 \
  -e DB_HOST=postgres \
  -e REDIS_HOST=redis \
  -e JWT_SECRET=your-secret \
  sos-app/auth-service
```

## API Endpoints

### Health Checks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Basic health check |
| GET | `/health/startup` | Kubernetes startup probe |
| GET | `/health/ready` | Kubernetes readiness probe |
| GET | `/health/live` | Kubernetes liveness probe |

### Authentication Endpoints (Coming in Sprint 2)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login with email/password |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Logout and revoke session |
| GET | `/api/v1/auth/google` | Google OAuth login |
| GET | `/api/v1/auth/apple` | Apple OAuth login |
| POST | `/api/v1/auth/password-reset-request` | Request password reset |
| POST | `/api/v1/auth/password-reset` | Confirm password reset |
| POST | `/api/v1/auth/mfa/enroll` | Enroll in MFA |
| POST | `/api/v1/auth/mfa/verify` | Verify MFA code |

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

## Project Structure

```
services/auth-service/
├── src/
│   ├── config/
│   │   └── index.ts              # Environment configuration
│   ├── db/
│   │   ├── index.ts              # Database connection
│   │   └── migrations/           # SQL migration files
│   │       ├── 001_create_users_table.sql
│   │       └── 002_create_sessions_table.sql
│   ├── models/
│   │   ├── User.ts               # User model
│   │   └── Session.ts            # Session model
│   ├── middleware/
│   │   ├── validateToken.ts      # JWT validation
│   │   └── errorHandler.ts       # Error handling
│   ├── utils/
│   │   ├── logger.ts             # Winston logger
│   │   ├── password.ts           # Password utilities
│   │   └── jwt.ts                # JWT utilities
│   ├── routes/                   # API routes (coming soon)
│   ├── services/                 # Business logic (coming soon)
│   └── index.ts                  # Application entry point
├── tests/                        # Test files
├── .env.example                  # Environment template
├── .gitignore                    # Git ignore rules
├── Dockerfile                    # Container definition
├── jest.config.js                # Jest configuration
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
└── README.md                     # This file
```

## Database Schema

### users table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | VARCHAR(255) | User email (unique) |
| phone_number | VARCHAR(20) | Phone number (unique, optional) |
| password_hash | VARCHAR(255) | Bcrypt hashed password |
| auth_provider | ENUM | Authentication provider (local, google, apple) |
| provider_id | VARCHAR(255) | External provider user ID |
| first_name | VARCHAR(100) | User first name |
| last_name | VARCHAR(100) | User last name |
| mfa_enabled | BOOLEAN | MFA enabled flag |
| mfa_secret | VARCHAR(255) | TOTP secret (encrypted) |
| email_verified | BOOLEAN | Email verification status |
| phone_verified | BOOLEAN | Phone verification status |
| last_login_at | TIMESTAMP | Last successful login |
| failed_login_attempts | INTEGER | Failed login counter |
| account_locked_until | TIMESTAMP | Account lock expiration |
| created_at | TIMESTAMP | Account creation time |
| updated_at | TIMESTAMP | Last update time |
| deleted_at | TIMESTAMP | Soft delete time |

### sessions table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| device_id | VARCHAR(255) | Device identifier |
| device_name | VARCHAR(255) | Device name |
| device_type | VARCHAR(50) | Device type (ios, android, web) |
| refresh_token | TEXT | JWT refresh token (unique) |
| ip_address | VARCHAR(45) | IP address |
| user_agent | TEXT | User agent string |
| expires_at | TIMESTAMP | Session expiration |
| last_active_at | TIMESTAMP | Last activity time |
| created_at | TIMESTAMP | Session creation time |
| updated_at | TIMESTAMP | Last update time |

## Security Features

- **Password Security**: Bcrypt hashing with 10 rounds
- **JWT Tokens**: Signed with RS256 algorithm
- **Account Locking**: Automatic lock after 5 failed attempts (15 min)
- **Rate Limiting**: 100 requests per minute per IP
- **Helmet**: Security headers (CSP, HSTS, etc.)
- **CORS**: Configurable cross-origin access
- **Input Validation**: Express validator for all endpoints
- **SQL Injection Prevention**: Parameterized queries via Sequelize
- **Session Management**: Refresh token rotation
- **MFA Support**: TOTP-based two-factor authentication

## Performance Considerations

- **Connection Pooling**: 25 max connections, 5 min connections
- **Redis Caching**: Session caching for fast validation
- **Token Validation**: Stateless JWT validation (no DB lookup)
- **Indexes**: Optimized database indexes on email, phone, tokens
- **Graceful Shutdown**: Proper cleanup of connections

## Monitoring & Logging

### Logging

All logs are structured JSON format with Winston:

```typescript
logger.info('User logged in', { userId, email });
logger.error('Login failed', { email, reason });
```

### Metrics

- Request count per endpoint
- Response times
- Error rates
- Token validation failures
- Active sessions count

### Health Checks

- `/health` - Basic service health
- `/health/ready` - Database connectivity
- `/health/live` - Process liveness

## Development

### Code Style

```bash
# Run ESLint
npm run lint

# Format code with Prettier
npm run format
```

### Running Migrations

```bash
# Create new migration
npm run migrate:create

# Run migrations
npm run migrate:up

# Rollback migrations
npm run migrate:down
```

## Deployment

### Kubernetes

```bash
# Apply deployment
kubectl apply -f ../../infrastructure/kubernetes/services/auth-service.yaml

# Check status
kubectl get pods -n sos-app | grep auth-service

# View logs
kubectl logs -f deployment/auth-service -n sos-app
```

### Docker Compose

```yaml
services:
  auth-service:
    image: sos-app/auth-service:latest
    ports:
      - "8081:8081"
    environment:
      - DB_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
```

## Troubleshooting

### Database Connection Failed

```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Test connection
psql -U postgres -h localhost -d sos_app_auth
```

### Redis Connection Failed

```bash
# Check Redis is running
redis-cli ping

# Test connection
redis-cli -h localhost -p 6379
```

### Token Validation Failing

- Ensure JWT_SECRET matches across all services
- Check token expiration time
- Verify Authorization header format: `Bearer <token>`

## Contributing

1. Follow TypeScript strict mode guidelines
2. Write unit tests for all new features (80% coverage minimum)
3. Update API documentation
4. Follow commit message conventions

## License

Private - SOS App Platform

## Support

For issues or questions, contact the SOS App development team.

---

**Status**: Sprint 1 Complete ✅
**Next**: Implement authentication endpoints (Sprint 2)
**Version**: 1.0.0
**Last Updated**: 2025-10-31
