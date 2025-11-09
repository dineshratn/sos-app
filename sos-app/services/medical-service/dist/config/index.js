"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const config = {
    port: parseInt(process.env.PORT || '3003', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    database: {
        url: process.env.DATABASE_URL || 'postgresql://localhost:5432/sos_medical',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        name: process.env.DB_NAME || 'sos_medical',
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        ssl: process.env.DB_SSL === 'true',
        poolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
        poolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),
    },
    auth: {
        jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        jwtExpiration: process.env.JWT_EXPIRATION || '24h',
    },
    cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
        credentials: true,
    },
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    },
    encryption: {
        algorithm: 'aes-256-gcm',
        keyId: process.env.ENCRYPTION_KEY_ID || 'default-key-id',
        secretKey: process.env.ENCRYPTION_SECRET_KEY || 'change-this-32-char-secret-key!!',
        ivLength: 16,
    },
    kafka: {
        brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
        clientId: 'medical-service',
        groupId: 'medical-service-group',
    },
    audit: {
        enabled: process.env.AUDIT_ENABLED !== 'false',
        logLevel: process.env.AUDIT_LOG_LEVEL || 'info',
    },
    hipaa: {
        dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS || '2190', 10), // 6 years
        accessLogRetentionDays: parseInt(process.env.ACCESS_LOG_RETENTION_DAYS || '2190', 10),
        encryptionAtRest: true,
        encryptionInTransit: true,
    },
};
// Validate critical configuration
if (config.nodeEnv === 'production') {
    if (config.auth.jwtSecret === 'your-secret-key-change-in-production') {
        throw new Error('JWT_SECRET must be set in production');
    }
    if (config.encryption.secretKey === 'change-this-32-char-secret-key!!') {
        throw new Error('ENCRYPTION_SECRET_KEY must be set in production');
    }
    if (!config.database.ssl) {
        console.warn('WARNING: Database SSL is disabled in production');
    }
}
exports.default = config;
//# sourceMappingURL=index.js.map