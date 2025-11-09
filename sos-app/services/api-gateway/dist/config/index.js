"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const config = {
    nodeEnv: process.env.NODE_ENV || 'development',
    serviceName: process.env.SERVICE_NAME || 'api-gateway',
    port: parseInt(process.env.PORT || '3000', 10),
    // Microservice Configuration
    services: {
        auth: {
            url: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
            timeout: parseInt(process.env.AUTH_SERVICE_TIMEOUT || '10000', 10),
            retries: parseInt(process.env.AUTH_SERVICE_RETRIES || '3', 10),
        },
        user: {
            url: process.env.USER_SERVICE_URL || 'http://user-service:3002',
            timeout: parseInt(process.env.USER_SERVICE_TIMEOUT || '10000', 10),
            retries: parseInt(process.env.USER_SERVICE_RETRIES || '3', 10),
        },
        emergency: {
            url: process.env.EMERGENCY_SERVICE_URL || 'http://emergency-service:3003',
            timeout: parseInt(process.env.EMERGENCY_SERVICE_TIMEOUT || '10000', 10),
            retries: parseInt(process.env.EMERGENCY_SERVICE_RETRIES || '3', 10),
        },
        location: {
            url: process.env.LOCATION_SERVICE_URL || 'http://location-service:3004',
            timeout: parseInt(process.env.LOCATION_SERVICE_TIMEOUT || '10000', 10),
            retries: parseInt(process.env.LOCATION_SERVICE_RETRIES || '3', 10),
        },
        notification: {
            url: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3005',
            timeout: parseInt(process.env.NOTIFICATION_SERVICE_TIMEOUT || '10000', 10),
            retries: parseInt(process.env.NOTIFICATION_SERVICE_RETRIES || '3', 10),
        },
        communication: {
            url: process.env.COMMUNICATION_SERVICE_URL || 'http://communication-service:3006',
            timeout: parseInt(process.env.COMMUNICATION_SERVICE_TIMEOUT || '10000', 10),
            retries: parseInt(process.env.COMMUNICATION_SERVICE_RETRIES || '3', 10),
        },
        llm: {
            url: process.env.LLM_SERVICE_URL || 'http://llm-service:3007',
            timeout: parseInt(process.env.LLM_SERVICE_TIMEOUT || '30000', 10), // LLM calls take longer
            retries: parseInt(process.env.LLM_SERVICE_RETRIES || '2', 10),
        },
    },
    // CORS Configuration
    cors: {
        origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true,
    },
    // JWT Configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    },
    // Rate Limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    },
    // Redis Configuration
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0', 10),
    },
    // Logging
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'json',
    },
    // Timeout Configuration
    timeout: {
        default: parseInt(process.env.DEFAULT_TIMEOUT || '30000', 10), // 30 seconds
        upload: parseInt(process.env.UPLOAD_TIMEOUT || '300000', 10), // 5 minutes
    },
    // Circuit Breaker Configuration
    circuitBreaker: {
        enabled: process.env.CIRCUIT_BREAKER_ENABLED === 'true',
        threshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5', 10),
        timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '60000', 10),
        resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '30000', 10),
    },
};
// Validation in production
if (config.nodeEnv === 'production') {
    const requiredEnvVars = [
        'JWT_SECRET',
        'AUTH_SERVICE_URL',
        'USER_SERVICE_URL',
        'EMERGENCY_SERVICE_URL',
        'LOCATION_SERVICE_URL',
        'NOTIFICATION_SERVICE_URL',
        'COMMUNICATION_SERVICE_URL',
        'LLM_SERVICE_URL',
    ];
    const missingVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);
    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
}
exports.default = config;
//# sourceMappingURL=index.js.map