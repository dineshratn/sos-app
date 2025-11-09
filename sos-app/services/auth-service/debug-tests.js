/**
 * Debug Test Script - Shows detailed error information
 */

const http = require('http');

const BASE_URL = 'http://localhost:8081';
const API_BASE = '/api/v1/auth';

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
          resolve({ status: res.statusCode, headers: res.headers, body, error: e.message });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testRegistration() {
  console.log('\n=== DEBUGGING USER REGISTRATION ===\n');

  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'Test@Password123',
    firstName: 'Test',
    lastName: 'User',
    deviceId: 'test-device-123',
    deviceName: 'Test Device',
    deviceType: 'web', // Valid types: ios, android, web, desktop, other
  };

  console.log('Request payload:');
  console.log(JSON.stringify(testUser, null, 2));
  console.log();

  try {
    const res = await makeRequest('POST', `${API_BASE}/register`, testUser);

    console.log('Response status:', res.status);
    console.log('Response body:');
    console.log(JSON.stringify(res.body, null, 2));

    if (res.status === 201) {
      console.log('\n✓ Registration PASSED');
      return { success: true, token: res.body.tokens?.accessToken };
    } else {
      console.log('\n✗ Registration FAILED');
      console.log('Error details:', res.body.error || res.body.message || 'Unknown error');
      return { success: false };
    }
  } catch (error) {
    console.log('\n✗ Registration ERROR');
    console.log('Error:', error.message);
    console.log('Stack:', error.stack);
    return { success: false };
  }
}

async function testMFAEnrollment(token) {
  console.log('\n=== DEBUGGING MFA ENROLLMENT ===\n');

  if (!token) {
    console.log('⚠️  No auth token provided - skipping');
    return { success: false };
  }

  console.log('Using token:', token.substring(0, 20) + '...');
  console.log();

  try {
    const res = await makeRequest('POST', `${API_BASE}/mfa/enroll`, null, {
      Authorization: `Bearer ${token}`,
    });

    console.log('Response status:', res.status);
    console.log('Response body:');
    console.log(JSON.stringify(res.body, null, 2));

    if (res.status === 200) {
      console.log('\n✓ MFA Enrollment PASSED');
      return { success: true, secret: res.body.secret };
    } else {
      console.log('\n✗ MFA Enrollment FAILED');
      console.log('Error details:', res.body.error || res.body.message || 'Unknown error');
      return { success: false };
    }
  } catch (error) {
    console.log('\n✗ MFA Enrollment ERROR');
    console.log('Error:', error.message);
    console.log('Stack:', error.stack);
    return { success: false };
  }
}

async function checkServerHealth() {
  console.log('=== CHECKING SERVER HEALTH ===\n');

  try {
    const res = await makeRequest('GET', '/health');
    console.log('Health check status:', res.status);
    console.log('Response:', JSON.stringify(res.body, null, 2));

    if (res.status === 200) {
      console.log('✓ Server is healthy\n');
      return true;
    } else {
      console.log('✗ Server health check failed\n');
      return false;
    }
  } catch (error) {
    console.log('✗ Cannot connect to server:', error.message);
    console.log('\nMake sure the auth service is running:');
    console.log('  npm run dev\n');
    return false;
  }
}

async function checkDatabase() {
  console.log('=== CHECKING DATABASE CONNECTION ===\n');
  console.log('Note: Check server logs for database connection status');
  console.log('Expected in server logs: "Database connected successfully"\n');
}

async function run() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║           Debug Test Script - Tasks 35-39                 ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Health check
  const isHealthy = await checkServerHealth();
  if (!isHealthy) {
    process.exit(1);
  }

  // Database check reminder
  await checkDatabase();

  // Test registration
  const regResult = await testRegistration();

  // Test MFA enrollment
  await testMFAEnrollment(regResult.token);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('Debug session complete. Check output above for issues.');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Common issues:');
  console.log('1. Database not connected - Check server logs');
  console.log('2. Tables not created - Restart server to auto-create');
  console.log('3. Validation errors - Check request payload format');
  console.log('4. Token issues - Verify JWT secret in .env\n');
}

run().catch(console.error);
