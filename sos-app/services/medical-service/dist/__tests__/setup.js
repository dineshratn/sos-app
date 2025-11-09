"use strict";
/**
 * Jest Setup File for Medical Service
 *
 * HIPAA-compliant test environment setup
 */
// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.ENCRYPTION_SECRET_KEY = 'test-encryption-key-32-chars!';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/sos_medical_test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
// Mock console methods to reduce noise (except errors for debugging)
global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    // Keep error for debugging
    error: console.error,
};
// Global test timeout
jest.setTimeout(10000);
// Clean up after each test
afterEach(() => {
    jest.clearAllMocks();
});
//# sourceMappingURL=setup.js.map