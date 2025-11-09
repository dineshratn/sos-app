import dotenv from 'dotenv';

dotenv.config();

interface Config {
  nodeEnv: string;
  serviceName: string;
  port: number;

  // Database
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    dialect: 'postgres';
    pool: {
      max: number;
      min: number;
      acquire: number;
      idle: number;
    };
    logging: boolean;
  };

  // JWT
  jwt: {
    secret: string;
    expiresIn: string;
  };

  // Auth
  auth: {
    jwtSecret: string;
  };

  // Auth Service
  authService: {
    url: string;
    timeout: number;
  };

  // CORS
  cors: {
    origins: string[];
    credentials: boolean;
  };

  // Rate Limiting
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };

  // Logging
  logging: {
    level: string;
    format: string;
  };

  // Emergency Contacts
  emergencyContacts: {
    maxContacts: number;
  };
}

const config: Config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  serviceName: process.env.SERVICE_NAME || 'user-service',
  port: parseInt(process.env.PORT || '3002', 10),

  // Database Configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'sos_user_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    dialect: 'postgres',
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '5', 10),
      min: parseInt(process.env.DB_POOL_MIN || '0', 10),
      acquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000', 10),
      idle: parseInt(process.env.DB_POOL_IDLE || '10000', 10),
    },
    logging: process.env.DB_LOGGING === 'true',
  },

  // JWT Configuration (for validation)
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  },

  // Auth Configuration
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  },

  // Auth Service Configuration
  authService: {
    url: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
    timeout: parseInt(process.env.AUTH_SERVICE_TIMEOUT || '10000', 10),
  },

  // CORS Configuration
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },

  // Emergency Contacts
  emergencyContacts: {
    maxContacts: parseInt(process.env.MAX_EMERGENCY_CONTACTS || '10', 10),
  },
};

// Validation in production
if (config.nodeEnv === 'production') {
  const requiredEnvVars = [
    'DB_HOST',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_SECRET',
  ];

  const missingVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }
}

export default config;
