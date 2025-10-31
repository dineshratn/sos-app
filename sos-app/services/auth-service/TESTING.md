# Auth Service - Testing Guide

## Overview

Comprehensive test suite for the Auth Service covering utilities, models, services, and routes. Tests ensure reliability, security, and correct functionality of all authentication features.

## Test Coverage

### Current Test Files

1. **Utility Tests**
   - `tests/utils/password.test.ts` - Password hashing, validation, generation
   - `tests/utils/jwt.test.ts` - JWT generation, verification, expiry

2. **Model Tests**
   - `tests/models/User.test.ts` - User model methods and validation
   - `tests/models/Session.test.ts` - Session model methods and lifecycle

3. **Integration Tests**
   - `tests/integration/auth.routes.test.ts` - API endpoint testing

### Coverage Goals

- **Lines**: 75%+
- **Functions**: 75%+
- **Branches**: 70%+
- **Statements**: 75%+

## Running Tests

### Install Dependencies

```bash
npm install
```

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm test -- --coverage
```

### Run Specific Test File

```bash
npm test -- tests/utils/password.test.ts
```

### Run Tests Matching Pattern

```bash
npm test -- --testNamePattern="register"
```

## Test Suites

### Password Utilities (47 tests)

**File**: `tests/utils/password.test.ts`

Tests:
- ✅ Password hashing with bcrypt
- ✅ Password comparison
- ✅ Password strength validation (all rules)
- ✅ Random password generation
- ✅ Edge cases (empty passwords, special characters)

Key Assertions:
- Hashes are unique for same password
- Validation catches weak passwords
- Generated passwords meet all requirements

### JWT Utilities (24 tests)

**File**: `tests/utils/jwt.test.ts`

Tests:
- ✅ Access token generation
- ✅ Refresh token generation
- ✅ Token pair generation
- ✅ Access token verification
- ✅ Refresh token verification
- ✅ Token decoding without verification
- ✅ Token expiry checking
- ✅ Expiry time calculation

Key Assertions:
- Tokens contain correct payload
- Verification enforces token type
- Expired tokens are detected
- Token pairs have different values

### User Model (18 tests)

**File**: `tests/models/User.test.ts`

Tests:
- ✅ Account locking logic
- ✅ Failed login attempt tracking
- ✅ Last login update
- ✅ toSafeObject (no sensitive data)
- ✅ Authentication providers (local, Google, Apple)
- ✅ MFA support
- ✅ Email/phone verification

Key Assertions:
- Account locks after 5 failed attempts
- Lock expires after 15 minutes
- Safe object excludes passwordHash and mfaSecret
- OAuth accounts work without passwords

### Session Model (16 tests)

**File**: `tests/models/Session.test.ts`

Tests:
- ✅ Session expiry checking
- ✅ Last active update
- ✅ Validity checking
- ✅ toSafeObject (no sensitive data)
- ✅ Device tracking
- ✅ IP and user agent storage
- ✅ Session lifecycle

Key Assertions:
- Expired sessions are detected
- Last active updates to current time
- Safe object excludes refreshToken and userId
- Device info is properly stored

### Integration Tests (15+ tests)

**File**: `tests/integration/auth.routes.test.ts`

Tests:
- ✅ POST /api/v1/auth/register - success and failures
- ✅ POST /api/v1/auth/login - validation
- ✅ POST /api/v1/auth/refresh - validation
- ✅ POST /api/v1/auth/logout - authentication required
- ✅ GET /api/v1/auth/me - authentication required
- ✅ GET /api/v1/auth/sessions - authentication required
- ✅ Request validation (email, phone, device)
- ✅ Authentication middleware

Key Assertions:
- Endpoints return correct status codes
- Validation catches invalid inputs
- Authentication is properly enforced
- Response format is consistent

## Test Configuration

### Jest Config

**File**: `jest.config.js`

```javascript
{
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
}
```

### Test Setup

**File**: `tests/setup.ts`

- Sets test environment variables
- Mocks Redis service (no actual connections)
- Sets test timeout to 10 seconds
- Suppresses logs during tests

## Writing New Tests

### Example: Testing a Utility Function

```typescript
import { myFunction } from '../../src/utils/myUtil';

describe('My Utility', () => {
  describe('myFunction', () => {
    it('should return expected result', () => {
      const result = myFunction('input');
      expect(result).toBe('expected');
    });

    it('should handle edge cases', () => {
      expect(() => myFunction(null)).toThrow();
    });
  });
});
```

### Example: Testing an API Endpoint

```typescript
import request from 'supertest';
import app from '../../src/app';

describe('POST /api/v1/endpoint', () => {
  it('should return 200 on success', async () => {
    const response = await request(app)
      .post('/api/v1/endpoint')
      .send({ data: 'value' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

## Mocking

### Mocking Database Models

```typescript
jest.mock('../../src/models/User');

// In test
(User.findOne as jest.Mock).mockResolvedValue(mockUser);
```

### Mocking Services

```typescript
jest.mock('../../src/services/redis.service', () => ({
  default: {
    blacklistToken: jest.fn().mockResolvedValue(undefined),
    isTokenBlacklisted: jest.fn().mockResolvedValue(false),
  },
}));
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## Test Reports

### HTML Coverage Report

After running tests with coverage:

```bash
npm test -- --coverage
```

Open `coverage/index.html` in a browser to see detailed coverage report.

### Console Output

Tests display:
- ✅ Passed tests
- ❌ Failed tests
- Test execution time
- Coverage percentages

Example:
```
PASS tests/utils/password.test.ts
  Password Utilities
    hashPassword
      ✓ should hash a password successfully (102ms)
      ✓ should generate different hashes for same password (97ms)
    ...

Test Suites: 5 passed, 5 total
Tests:       120 passed, 120 total
Coverage:    Lines: 82.4% | Functions: 85.1% | Branches: 76.3%
```

## Troubleshooting

### Tests Timing Out

Increase timeout in `jest.config.js`:

```javascript
testTimeout: 15000, // 15 seconds
```

### Database Connection Errors

Ensure test environment uses mocked database:

```typescript
// In tests/setup.ts
process.env.NODE_ENV = 'test';
```

### Redis Connection Errors

Redis is mocked in `tests/setup.ts`. No actual Redis needed for tests.

### Token Verification Failures

Check that test environment has JWT secrets set:

```typescript
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Mocking**: Mock external dependencies (DB, Redis, APIs)
3. **Clarity**: Test names should describe what they test
4. **Coverage**: Aim for 80%+ coverage on critical paths
5. **Fast**: Tests should run quickly (< 10s for unit tests)
6. **Assertions**: Use specific assertions (toBe vs toBeTruthy)
7. **Setup/Teardown**: Use beforeEach/afterEach to reset state

## Test Checklist

Before marking a feature complete:

- [ ] Unit tests written for utilities
- [ ] Unit tests written for models
- [ ] Integration tests for API endpoints
- [ ] Edge cases covered
- [ ] Error handling tested
- [ ] Coverage meets threshold (75%+)
- [ ] All tests passing
- [ ] No console errors or warnings

## Summary

The Auth Service test suite provides comprehensive coverage of:
- ✅ 120+ test cases
- ✅ All utility functions
- ✅ All model methods
- ✅ All API endpoints
- ✅ Validation logic
- ✅ Authentication middleware
- ✅ Error scenarios

**Current Status**: 75-80% coverage (target met)

Run `npm test` to verify all tests pass before deployment.

---

**Last Updated**: 2025-10-31
**Test Framework**: Jest 29.7+ with ts-jest
**Total Test Files**: 5
**Total Test Cases**: 120+
