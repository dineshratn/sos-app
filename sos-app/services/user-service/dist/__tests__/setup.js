"use strict";
/**
 * Jest Setup File
 *
 * This file runs before all tests and sets up the testing environment.
 */
// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/sos_test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
// Mock console methods to reduce noise
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