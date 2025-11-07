// Test environment setup

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DB_NAME = 'sos_user_db_test';
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';
process.env.LOG_LEVEL = 'error'; // Suppress logs during tests

// Extend Jest timeout for database operations
jest.setTimeout(10000);

// Mock database to avoid actual connections during tests
jest.mock('../src/db', () => ({
  connectDatabase: jest.fn().mockResolvedValue(undefined),
  syncDatabase: jest.fn().mockResolvedValue(undefined),
  closeDatabase: jest.fn().mockResolvedValue(undefined),
}));

// Global teardown
afterAll(async () => {
  // Close any open handles
  await new Promise((resolve) => setTimeout(resolve, 500));
});
