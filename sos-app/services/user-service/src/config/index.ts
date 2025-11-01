import dotenv from 'dotenv';

dotenv.config();

interface Config {
  serviceName: string;
  nodeEnv: string;
  port: number;
  database: {
    host: string;
    port: number;
    name: string;
    username: string;
    password: string;
    dialect: 'postgres';
    logging: boolean;
  };
  auth: {
    jwtSecret: string;
    authServiceUrl: string;
  };
  cors: {
    origins: string[];
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  kafka: {
    brokers: string[];
    clientId: string;
  };
  uploads: {
    maxFileSize: number; // in bytes
    allowedMimeTypes: string[];
  };
}

const config: Config = {
  serviceName: process.env.SERVICE_NAME || 'user-service',
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3002', 10),

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'sosapp_users',
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    dialect: 'postgres',
    logging: process.env.DB_LOGGING === 'true',
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  },

  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  kafka: {
    brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
    clientId: process.env.KAFKA_CLIENT_ID || 'user-service',
  },

  uploads: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB default
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
    ],
  },
};

export default config;
