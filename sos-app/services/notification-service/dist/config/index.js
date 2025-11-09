"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
exports.config = {
    server: {
        port: parseInt(process.env.PORT || '3005', 10),
        env: process.env.NODE_ENV || 'development',
    },
    mongodb: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/sos_notifications',
        maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '10', 10),
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0', 10),
    },
    kafka: {
        brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
        clientId: process.env.KAFKA_CLIENT_ID || 'notification-service',
        groupId: process.env.KAFKA_GROUP_ID || 'notification-service-group',
        topics: {
            emergencyCreated: process.env.KAFKA_TOPICS_EMERGENCY_CREATED || 'emergency-created',
            escalation: process.env.KAFKA_TOPICS_ESCALATION || 'emergency-escalation',
        },
    },
    fcm: {
        projectId: process.env.FCM_PROJECT_ID || '',
        privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
        clientEmail: process.env.FCM_CLIENT_EMAIL || '',
    },
    apns: {
        keyId: process.env.APNS_KEY_ID || '',
        teamId: process.env.APNS_TEAM_ID || '',
        keyPath: process.env.APNS_KEY_PATH || path_1.default.join(__dirname, '../../certs/AuthKey.p8'),
        production: process.env.APNS_PRODUCTION === 'true',
    },
    twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID || '',
        authToken: process.env.TWILIO_AUTH_TOKEN || '',
        phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
    },
    sendgrid: {
        apiKey: process.env.SENDGRID_API_KEY || '',
        fromEmail: process.env.SENDGRID_FROM_EMAIL || 'alerts@sos-app.com',
        fromName: process.env.SENDGRID_FROM_NAME || 'SOS App Emergency Alerts',
    },
    notification: {
        retryAttempts: parseInt(process.env.NOTIFICATION_RETRY_ATTEMPTS || '3', 10),
        retryBackoffMultiplier: parseInt(process.env.NOTIFICATION_RETRY_BACKOFF_MULTIPLIER || '2', 10),
        initialRetryDelay: parseInt(process.env.NOTIFICATION_INITIAL_RETRY_DELAY || '5000', 10),
        maxRetryDelay: parseInt(process.env.NOTIFICATION_MAX_RETRY_DELAY || '45000', 10),
        escalationTimeout: parseInt(process.env.NOTIFICATION_ESCALATION_TIMEOUT || '120000', 10),
        followupInterval: parseInt(process.env.NOTIFICATION_FOLLOWUP_INTERVAL || '30000', 10),
    },
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
    },
};
//# sourceMappingURL=index.js.map