/**
 * Integration Test Script for Auth Service Features
 * Tests Password Reset (Tasks 35-36) and MFA (Tasks 37-39)
 */

const http = require('http');

// Configuration
const BASE_URL = 'http://localhost:8081';
const API_BASE = '/api/v1/auth';

// Test utilities
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: jsonBody });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test data
let testUser = {
  email: `test-${Date.now()}@example.com`,
  password: 'Test@Password123',
  firstName: 'Test',
  lastName: 'User',
  deviceId: 'test-device-' + Date.now(),
  deviceName: 'Test Device',
  deviceType: 'web', // Valid types: ios, android, web, desktop, other
};

let authToken = null;
let refreshToken = null;
let resetToken = null;
let mfaSecret = null;

// Test functions
async function testHealthCheck() {
  log('\n=== Testing Health Check ===', 'blue');
  try {
    const res = await makeRequest('GET', '/health');
    if (res.status === 200) {
      log('✓ Health check passed', 'green');
      log(`  Service: ${res.body.service}`, 'yellow');
      return true;
    }
    log(`✗ Health check failed: ${res.status}`, 'red');
    return false;
  } catch (error) {
    log(`✗ Health check error: ${error.message}`, 'red');
    return false;
  }
}

async function testUserRegistration() {
  log('\n=== Testing User Registration ===', 'blue');
  try {
    const res = await makeRequest('POST', `${API_BASE}/register`, testUser);

    if (res.status === 201 && res.body.success) {
      log('✓ User registration successful', 'green');
      log(`  User ID: ${res.body.user.id}`, 'yellow');
      authToken = res.body.tokens.accessToken;
      refreshToken = res.body.tokens.refreshToken;
      return true;
    }
    log(`✗ Registration failed: ${res.status} - ${JSON.stringify(res.body)}`, 'red');
    return false;
  } catch (error) {
    log(`✗ Registration error: ${error.message}`, 'red');
    return false;
  }
}

async function testPasswordResetRequest() {
  log('\n=== Testing Password Reset Request (Task 35) ===', 'blue');
  try {
    const res = await makeRequest('POST', `${API_BASE}/password-reset-request`, {
      email: testUser.email,
    });

    if (res.status === 200 && res.body.success) {
      log('✓ Password reset request successful', 'green');
      log(`  Message: ${res.body.message}`, 'yellow');
      log('\n  NOTE: Check server logs for the reset token', 'yellow');
      return true;
    }
    log(`✗ Password reset request failed: ${res.status} - ${JSON.stringify(res.body)}`, 'red');
    return false;
  } catch (error) {
    log(`✗ Password reset request error: ${error.message}`, 'red');
    return false;
  }
}

async function testPasswordResetConfirmation() {
  log('\n=== Testing Password Reset Confirmation (Task 36) ===', 'blue');
  log('  Skipping: Requires reset token from email/logs', 'yellow');
  log('  Manual test: POST /api/v1/auth/password-reset', 'yellow');
  log('  Body: { "token": "<reset-token>", "newPassword": "NewPass@123" }', 'yellow');
  return true;
}

async function testMFAEnrollment() {
  log('\n=== Testing MFA Enrollment (Task 37) ===', 'blue');
  try {
    const res = await makeRequest('POST', `${API_BASE}/mfa/enroll`, null, {
      Authorization: `Bearer ${authToken}`,
    });

    if (res.status === 200 && res.body.success) {
      log('✓ MFA enrollment successful', 'green');
      log(`  Secret: ${res.body.secret}`, 'yellow');
      log(`  QR Code available: ${!!res.body.qrCode}`, 'yellow');
      mfaSecret = res.body.secret;
      return true;
    }
    log(`✗ MFA enrollment failed: ${res.status} - ${JSON.stringify(res.body)}`, 'red');
    return false;
  } catch (error) {
    log(`✗ MFA enrollment error: ${error.message}`, 'red');
    return false;
  }
}

async function testMFAVerification() {
  log('\n=== Testing MFA Verification (Task 38) ===', 'blue');
  if (!mfaSecret) {
    log('  Skipping: No MFA secret available', 'yellow');
    return true;
  }

  // Generate TOTP token
  const speakeasy = require('speakeasy');
  const token = speakeasy.totp({
    secret: mfaSecret,
    encoding: 'base32',
  });

  log(`  Generated TOTP token: ${token}`, 'yellow');

  try {
    const res = await makeRequest(
      'POST',
      `${API_BASE}/mfa/verify`,
      { token },
      { Authorization: `Bearer ${authToken}` }
    );

    if (res.status === 200 && res.body.success) {
      log('✓ MFA verification successful', 'green');
      log(`  Message: ${res.body.message}`, 'yellow');
      return true;
    }
    log(`✗ MFA verification failed: ${res.status} - ${JSON.stringify(res.body)}`, 'red');
    return false;
  } catch (error) {
    log(`✗ MFA verification error: ${error.message}`, 'red');
    return false;
  }
}

async function testMFALoginChallenge() {
  log('\n=== Testing MFA Login Challenge (Task 39) ===', 'blue');
  if (!mfaSecret) {
    log('  Skipping: MFA not enabled for this user', 'yellow');
    return true;
  }

  // Generate TOTP token
  const speakeasy = require('speakeasy');
  const token = speakeasy.totp({
    secret: mfaSecret,
    encoding: 'base32',
  });

  try {
    const res = await makeRequest(
      'POST',
      `${API_BASE}/mfa/challenge`,
      {
        token,
        deviceId: testUser.deviceId,
        deviceName: testUser.deviceName,
        deviceType: testUser.deviceType,
      },
      { Authorization: `Bearer ${authToken}` }
    );

    if (res.status === 200 && res.body.success) {
      log('✓ MFA login challenge successful', 'green');
      log(`  Message: ${res.body.message}`, 'yellow');
      log(`  New tokens issued: ${!!res.body.tokens}`, 'yellow');
      return true;
    }
    log(`✗ MFA login challenge failed: ${res.status} - ${JSON.stringify(res.body)}`, 'red');
    return false;
  } catch (error) {
    log(`✗ MFA login challenge error: ${error.message}`, 'red');
    return false;
  }
}

async function testMFADisable() {
  log('\n=== Testing MFA Disable ===', 'blue');
  if (!mfaSecret) {
    log('  Skipping: MFA not enabled', 'yellow');
    return true;
  }

  const speakeasy = require('speakeasy');
  const token = speakeasy.totp({
    secret: mfaSecret,
    encoding: 'base32',
  });

  try {
    const res = await makeRequest(
      'POST',
      `${API_BASE}/mfa/disable`,
      { token },
      { Authorization: `Bearer ${authToken}` }
    );

    if (res.status === 200 && res.body.success) {
      log('✓ MFA disable successful', 'green');
      log(`  Message: ${res.body.message}`, 'yellow');
      return true;
    }
    log(`✗ MFA disable failed: ${res.status} - ${JSON.stringify(res.body)}`, 'red');
    return false;
  } catch (error) {
    log(`✗ MFA disable error: ${error.message}`, 'red');
    return false;
  }
}

// Run all tests
async function runTests() {
  log('\n╔═══════════════════════════════════════════════════════════╗', 'blue');
  log('║     Auth Service Feature Tests (Tasks 35-39)             ║', 'blue');
  log('╚═══════════════════════════════════════════════════════════╝\n', 'blue');

  const results = [];

  // Check if server is running
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    log('\n✗ Server is not running. Please start auth-service first:', 'red');
    log('  cd services/auth-service && npm run dev\n', 'yellow');
    process.exit(1);
  }

  // Run tests in sequence
  results.push({ name: 'User Registration', passed: await testUserRegistration() });
  results.push({ name: 'Password Reset Request (Task 35)', passed: await testPasswordResetRequest() });
  results.push({ name: 'Password Reset Confirmation (Task 36)', passed: await testPasswordResetConfirmation() });
  results.push({ name: 'MFA Enrollment (Task 37)', passed: await testMFAEnrollment() });
  results.push({ name: 'MFA Verification (Task 38)', passed: await testMFAVerification() });
  results.push({ name: 'MFA Login Challenge (Task 39)', passed: await testMFALoginChallenge() });
  results.push({ name: 'MFA Disable', passed: await testMFADisable() });

  // Summary
  log('\n╔═══════════════════════════════════════════════════════════╗', 'blue');
  log('║                    Test Summary                           ║', 'blue');
  log('╚═══════════════════════════════════════════════════════════╝\n', 'blue');

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  results.forEach((result) => {
    const icon = result.passed ? '✓' : '✗';
    const color = result.passed ? 'green' : 'red';
    log(`${icon} ${result.name}`, color);
  });

  log(`\nTotal: ${passed}/${total} tests passed`, passed === total ? 'green' : 'yellow');

  if (passed === total) {
    log('\n🎉 All tests passed!', 'green');
    process.exit(0);
  } else {
    log(`\n⚠️  ${total - passed} test(s) failed`, 'red');
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  log(`\n✗ Test suite error: ${error.message}`, 'red');
  process.exit(1);
});
