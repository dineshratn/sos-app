import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3003', 10),
    env: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/sos_app_communication',
    maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '50', 10),
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  kafka: {
    brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
    clientId: process.env.KAFKA_CLIENT_ID || 'communication-service',
    groupId: process.env.KAFKA_GROUP_ID || 'communication-service-group',
  },
  jwt: {
    publicKeyPath: process.env.JWT_PUBLIC_KEY_PATH || path.join(__dirname, '../../keys/jwt-public.pem'),
    algorithm: process.env.JWT_ALGORITHM || 'RS256',
  },
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    s3: {
      bucket: process.env.AWS_S3_BUCKET || 'sos-app-media',
      signedUrlExpiry: parseInt(process.env.AWS_S3_SIGNED_URL_EXPIRY || '3600', 10),
    },
  },
  googleCloud: {
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
    credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, '../../keys/google-cloud-service-account.json'),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  messages: {
    maxLength: parseInt(process.env.MAX_MESSAGE_LENGTH || '5000', 10),
    maxMediaFileSize: parseInt(process.env.MAX_MEDIA_FILE_SIZE || '52428800', 10), // 50MB
    retentionDays: parseInt(process.env.MESSAGE_RETENTION_DAYS || '90', 10),
  },
};

export default config;
