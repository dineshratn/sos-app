// Jest setup file for global test configuration

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3005';
process.env.MONGODB_URI = 'mongodb://localhost:27017/sos_notifications_test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.KAFKA_BROKERS = 'localhost:9092';
process.env.LOG_LEVEL = 'error';

// Mock external providers by default
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn(),
  },
  messaging: () => ({
    send: jest.fn().mockResolvedValue('mock-message-id'),
    sendMulticast: jest.fn().mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [],
    }),
  }),
}));

jest.mock('node-apn', () => {
  return {
    Provider: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockResolvedValue({
        sent: [{ device: 'mock-device-token' }],
        failed: [],
      }),
      shutdown: jest.fn().mockResolvedValue(undefined),
    })),
    Notification: jest.fn().mockImplementation(() => ({})),
  };
});

jest.mock('twilio', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        sid: 'mock-sms-sid',
        status: 'sent',
      }),
    },
    lookups: {
      v2: {
        phoneNumbers: jest.fn().mockReturnValue({
          fetch: jest.fn().mockResolvedValue({ valid: true }),
        }),
      },
    },
  }));
});

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([
    {
      statusCode: 202,
      body: '',
      headers: {
        'x-message-id': 'mock-email-id',
      },
    },
  ]),
}));

// Increase timeout for integration tests
jest.setTimeout(10000);
