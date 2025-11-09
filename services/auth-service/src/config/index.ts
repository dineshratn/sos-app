import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface Config {
  // Server
  nodeEnv: string;
  port: number;
  serviceName: string;
  frontendUrl: string;

  // Database
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    sslMode: string;
    pool: {
      max: number;
      min: number;
    };
  };

  // Redis
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };

  // JWT
  jwt: {
    secret: string;
    refreshSecret: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
  };

  // Password
  password: {
    bcryptRounds: number;
    minLength: number;
  };

  // Rate Limiting
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    loginMaxAttempts: number;
    loginWindowMs: number;
  };

  // Session
  session: {
    timeoutHours: number;
    maxSessionsPerUser: number;
  };

  // OAuth - Google
  google: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
  };

  // OAuth - Apple
  apple: {
    clientId: string;
    teamId: string;
    keyId: string;
    privateKeyPath: string;
    callbackUrl: string;
  };

  // Email
  email: {
    smtp: {
      host: string;
      port: number;
      user: string;
      password: string;
    };
    from: string;
  };

  // CORS
  cors: {
    origins: string[];
  };

  // Logging
  logging: {
    level: string;
    filePath: string;
  };
}

const config: Config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8081', 10),
  serviceName: process.env.SERVICE_NAME || 'auth-service',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'sos_app_auth',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    sslMode: process.env.DB_SSL_MODE || 'disable',
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '25', 10),
      min: parseInt(process.env.DB_POOL_MIN || '5', 10),
    },
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production',
    accessTokenExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d',
  },

  password: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
    minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    loginMaxAttempts: parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '5', 10),
    loginWindowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || '900000', 10),
  },

  session: {
    timeoutHours: parseInt(process.env.SESSION_TIMEOUT_HOURS || '24', 10),
    maxSessionsPerUser: parseInt(process.env.MAX_SESSIONS_PER_USER || '5', 10),
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:8081/api/v1/auth/google/callback',
  },

  apple: {
    clientId: process.env.APPLE_CLIENT_ID || '',
    teamId: process.env.APPLE_TEAM_ID || '',
    keyId: process.env.APPLE_KEY_ID || '',
    privateKeyPath: process.env.APPLE_PRIVATE_KEY_PATH || '',
    callbackUrl: process.env.APPLE_CALLBACK_URL || 'http://localhost:8081/api/v1/auth/apple/callback',
  },

  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      user: process.env.SMTP_USER || '',
      password: process.env.SMTP_PASSWORD || '',
    },
    from: process.env.EMAIL_FROM || 'noreply@sos-app.com',
  },

  cors: {
    origins: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || '/var/log/auth-service.log',
  },
};

// Validate required configuration
const validateConfig = (): void => {
  const required = [
    'jwt.secret',
    'jwt.refreshSecret',
    'database.host',
    'database.name',
    'database.user',
  ];

  for (const key of required) {
    const keys = key.split('.');
    let value: any = config;
    for (const k of keys) {
      value = value[k];
    }
    if (!value) {
      throw new Error(`Missing required configuration: ${key}`);
    }
  }
};

// Validate on import
if (config.nodeEnv === 'production') {
  validateConfig();
}

export default config;
