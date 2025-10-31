/**
 * Jest setup file
 * Runs before all tests to configure the test environment
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';
process.env.DB_HOST = 'localhost';
process.env.DB_NAME = 'sos_app_auth_test';
process.env.REDIS_HOST = 'localhost';
process.env.LOG_LEVEL = 'error'; // Suppress logs during tests

// Mock Redis to avoid actual connections during tests
jest.mock('../src/services/redis.service', () => {
  return {
    __esModule: true,
    default: {
      isReady: jest.fn().mockReturnValue(true),
      blacklistToken: jest.fn().mockResolvedValue(undefined),
      isTokenBlacklisted: jest.fn().mockResolvedValue(false),
      cacheSession: jest.fn().mockResolvedValue(undefined),
      getSession: jest.fn().mockResolvedValue(null),
      deleteSession: jest.fn().mockResolvedValue(undefined),
      incrementFailedLogin: jest.fn().mockResolvedValue(1),
      getFailedLoginAttempts: jest.fn().mockResolvedValue(0),
      resetFailedLogin: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    },
  };
});

// Increase test timeout for database operations
jest.setTimeout(10000);
