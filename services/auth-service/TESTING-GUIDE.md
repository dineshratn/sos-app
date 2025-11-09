# Testing Guide: Password Reset & MFA Features (Tasks 35-39)

## Prerequisites

1. **Start PostgreSQL and Redis:**
   ```bash
   # Using Docker Compose (from root)
   docker-compose up -d postgres redis
   ```

2. **Configure Environment Variables:**
   ```bash
   cd services/auth-service
   cp .env.example .env
   # Edit .env with your database and Redis credentials
   ```

3. **Start Auth Service:**
   ```bash
   npm run dev
   # Service should start on http://localhost:8081
   ```

---

## Automated Testing

Run the automated test script:

```bash
cd services/auth-service
node test-features.js
```

This will test all implemented features automatically.

---

## Manual Testing with cURL

### 1. Health Check

```bash
curl -X GET http://localhost:8081/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "auth-service",
  "version": "1.0.0"
}
```

---

### 2. Register a Test User

```bash
curl -X POST http://localhost:8081/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "SecurePass@123",
    "firstName": "Test",
    "lastName": "User",
    "deviceId": "device-001",
    "deviceName": "My Laptop",
    "deviceType": "web"
  }'

# Valid deviceType values: "ios", "android", "web", "desktop", "other"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": { ... },
  "tokens": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 900,
    "tokenType": "Bearer"
  }
}
```

**Save the `accessToken` for subsequent requests!**

---

## Task 35: Password Reset Request

Request a password reset:

```bash
curl -X POST http://localhost:8081/api/v1/auth/password-reset-request \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "If an account exists with this email, a password reset link has been sent."
}
```

**Check Server Logs:**
The reset token will be logged to the console (in production, this would be sent via email):

```
Password reset token generated for testuser@example.com: a1b2c3d4e5f6...
Reset link: http://localhost:3000/reset-password?token=a1b2c3d4e5f6...
```

**Copy the token from the logs!**

---

## Task 36: Password Reset Confirmation

Reset the password using the token from logs:

```bash
curl -X POST http://localhost:8081/api/v1/auth/password-reset \
  -H "Content-Type: application/json" \
  -d '{
    "token": "a1b2c3d4e5f6...",
    "newPassword": "NewSecurePass@456"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Password has been reset successfully. Please log in with your new password."
}
```

**Note:** All existing sessions are invalidated for security.

---

## Task 37: MFA Enrollment

Enroll in MFA (requires authentication):

```bash
curl -X POST http://localhost:8081/api/v1/auth/mfa/enroll \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Scan the QR code with your authenticator app",
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "manualEntryKey": "JBSWY3DPEHPK3PXP"
}
```

**Actions:**
1. Save the `secret` value
2. Either:
   - Scan the QR code with Google Authenticator / Authy
   - Or manually enter the `manualEntryKey` in your authenticator app
3. Your authenticator will now generate 6-digit codes

---

## Task 38: MFA Verification

Verify MFA enrollment with a TOTP code:

```bash
# Get a 6-digit code from your authenticator app
curl -X POST http://localhost:8081/api/v1/auth/mfa/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "token": "123456"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "MFA has been successfully enabled for your account"
}
```

---

## Task 39: MFA Login Challenge

After MFA is enabled, use the challenge endpoint during login:

```bash
# Get a fresh 6-digit code from your authenticator app
curl -X POST http://localhost:8081/api/v1/auth/mfa/challenge \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "token": "789012",
    "deviceId": "device-001",
    "deviceName": "My Laptop",
    "deviceType": "web"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "MFA verification successful",
  "user": { ... },
  "tokens": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 900,
    "tokenType": "Bearer"
  }
}
```

---

## Additional: MFA Disable

Disable MFA (requires TOTP code):

```bash
curl -X POST http://localhost:8081/api/v1/auth/mfa/disable \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "token": "456789"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "MFA has been disabled for your account"
}
```

---

## Testing with Postman

1. Import the following environment variables:
   - `BASE_URL`: `http://localhost:8081`
   - `ACCESS_TOKEN`: (from registration/login response)

2. Create requests for each endpoint above
3. Use `{{BASE_URL}}` and `{{ACCESS_TOKEN}}` variables

---

## Generating TOTP Codes Programmatically

If you need to generate TOTP codes for testing:

```javascript
const speakeasy = require('speakeasy');

const token = speakeasy.totp({
  secret: 'YOUR_MFA_SECRET',
  encoding: 'base32',
});

console.log('Current TOTP token:', token);
```

---

## Expected Test Results

✓ **Task 35:** Password reset request returns success
✓ **Task 36:** Password reset confirmation works with valid token
✓ **Task 37:** MFA enrollment returns secret and QR code
✓ **Task 38:** MFA verification enables MFA on user account
✓ **Task 39:** MFA challenge validates TOTP and issues tokens

---

## Troubleshooting

### "User not found" Error
- Ensure you've registered a user first
- Check the email address matches exactly

### "Invalid MFA code" Error
- Ensure your system clock is synchronized (TOTP is time-based)
- Try the previous or next code (window = 2 steps)
- Check that you're using the correct secret

### "Token expired" Error
- Password reset tokens expire after 1 hour
- Request a new reset token

### Server Connection Issues
- Verify PostgreSQL is running: `docker ps | grep postgres`
- Verify Redis is running: `docker ps | grep redis`
- Check auth-service logs for database connection errors

---

## Database Verification

Check if password reset fields were added:

```sql
-- Connect to PostgreSQL
psql -U postgres -d sos_app_auth

-- Describe users table
\d users;

-- Should show:
-- - password_reset_token (varchar)
-- - password_reset_expires (timestamp)
-- - mfa_enabled (boolean)
-- - mfa_secret (varchar)
```

---

## Success Criteria

All 5 tasks (35-39) are considered complete when:

1. ✅ Password reset request generates and stores token
2. ✅ Password reset confirmation validates token and updates password
3. ✅ MFA enrollment generates TOTP secret and QR code
4. ✅ MFA verification enables MFA after validating code
5. ✅ MFA login challenge validates TOTP and issues tokens
