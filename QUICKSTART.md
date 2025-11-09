# SOS App - Quick Start Guide

## 🚀 Start Testing in 3 Steps

### Step 1: Start All Services

```bash
cd sos-app
docker-compose up --build
```

Wait ~30 seconds for all services to start. You should see:
```
✅ Auth Service listening on port 3001
✅ User Service listening on port 3002
✅ Medical Service listening on port 3003
```

### Step 2: Run Automated Tests

```bash
./test-services.sh
```

This will:
- Register a test user
- Test all API endpoints
- Create sample data
- Verify HIPAA compliance

### Step 3: View Results

If all tests pass, you'll see:
```
✓ Auth Service is healthy
✓ User registration successful
✓ Update medical profile successful
...
All tests passed successfully!
```

---

## 🎯 What's Working

### ✅ Auth Service (Port 3001)
- User registration & login
- JWT token authentication
- MFA with TOTP
- Password reset flow
- Session management
- OAuth 2.0 (Google, Apple)

### ✅ User Service (Port 3002)
- User profile CRUD
- Emergency contact management
- International phone validation
- Contact priority system
- Profile soft delete

### ✅ Medical Service (Port 3003)
- HIPAA-compliant medical profiles
- AES-256-GCM encryption
- Allergy tracking
- Medication management
- Condition tracking
- Immutable audit logging
- Emergency access links

---

## 📊 Service URLs

| Service | URL | Health Check |
|---------|-----|--------------|
| Auth | http://localhost:3001 | http://localhost:3001/health |
| User | http://localhost:3002 | http://localhost:3002/health |
| Medical | http://localhost:3003 | http://localhost:3003/health |

---

## 🔑 Test Credentials

After running `./test-services.sh`, use:

```
Email: test@example.com
Password: SecurePass123!
```

The script will output your JWT token for manual API testing.

---

## 🧪 Manual Testing

### Quick Test Commands

```bash
# Health check
curl http://localhost:3001/health

# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}'

# Get profile (use JWT token from login)
curl -X GET http://localhost:3002/api/v1/users/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 📚 Full Documentation

- **Detailed Testing Guide:** [TESTING_GUIDE.md](./TESTING_GUIDE.md)
- **Implementation Review:** [IMPLEMENTATION_REVIEW.md](./IMPLEMENTATION_REVIEW.md)
- **Architecture & Design:** [.claude/specs/sos-app/design.md](../.claude/specs/sos-app/design.md)

---

## 🛑 Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove all data
docker-compose down -v
```

---

## 🆘 Troubleshooting

### Services won't start
```bash
docker-compose down -v
docker-compose up --build --force-recreate
```

### Tests fail
```bash
# Check service logs
docker-compose logs auth-service
docker-compose logs user-service
docker-compose logs medical-service

# Check if services are healthy
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
```

### Port already in use
```bash
# Find and kill process on port 3001/3002/3003
lsof -ti:3001 | xargs kill -9
lsof -ti:3002 | xargs kill -9
lsof -ti:3003 | xargs kill -9
```

---

## 🎯 What's Next

1. ✅ Services are running
2. ✅ Tests are passing
3. 🔜 Continue with Phase 3: Emergency Service
4. 🔜 Add Location Service
5. 🔜 Add Notification Service

---

**Need help?** Check [TESTING_GUIDE.md](./TESTING_GUIDE.md) for detailed instructions.

**Ready to code more?** We've completed 110/262 tasks (42%). Let's continue! 🚀
