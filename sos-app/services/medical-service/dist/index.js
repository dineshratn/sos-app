"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = __importDefault(require("./config"));
const database_1 = require("./config/database");
const logger_1 = __importDefault(require("./utils/logger"));
const errorHandler_1 = require("./middleware/errorHandler");
const app = (0, express_1.default)();
// Security middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
}));
// CORS configuration
app.use((0, cors_1.default)({
    origin: config_1.default.cors.origin,
    credentials: config_1.default.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Rate limiting for HIPAA compliance (prevent brute force)
const limiter = (0, express_rate_limit_1.default)({
    windowMs: config_1.default.rateLimit.windowMs,
    max: config_1.default.rateLimit.maxRequests,
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);
// Body parser middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Request logging middleware (HIPAA compliant - no PHI in logs)
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger_1.default.info('HTTP Request', {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            userId: req.userId || 'anonymous',
        });
    });
    next();
});
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'medical-service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        hipaaCompliant: true,
        encryption: {
            atRest: config_1.default.hipaa.encryptionAtRest,
            inTransit: config_1.default.hipaa.encryptionInTransit,
        },
    });
});
// Readiness check endpoint
app.get('/ready', async (req, res) => {
    try {
        // Check database connection
        const { default: sequelize } = await Promise.resolve().then(() => __importStar(require('./config/database')));
        await sequelize.authenticate();
        res.json({
            status: 'ready',
            service: 'medical-service',
            database: 'connected',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        res.status(503).json({
            status: 'not ready',
            service: 'medical-service',
            database: 'disconnected',
            error: error.message,
        });
    }
});
// API documentation endpoint
app.get('/api/v1', (req, res) => {
    res.json({
        service: 'Medical Service',
        version: '1.0.0',
        description: 'HIPAA-compliant medical information management',
        features: [
            'Encrypted medical profile storage',
            'Allergy tracking',
            'Medication management',
            'Medical condition tracking',
            'Emergency access for first responders',
            'Comprehensive audit logging',
        ],
        endpoints: {
            profile: '/api/v1/medical/profile',
            allergies: '/api/v1/medical/allergies',
            medications: '/api/v1/medical/medications',
            conditions: '/api/v1/medical/conditions',
            emergency: '/api/v1/medical/emergency/:userId',
            secureAccess: '/api/v1/medical/secure/:token',
            audit: '/api/v1/medical/audit',
        },
        compliance: {
            hipaa: true,
            encryption: 'AES-256-GCM',
            auditLogging: true,
            dataRetention: `${config_1.default.hipaa.dataRetentionDays} days`,
        },
        documentation: '/api/v1/docs',
    });
});
// API Routes
const medical_routes_1 = __importDefault(require("./routes/medical.routes"));
app.use('/api/v1/medical', medical_routes_1.default);
// 404 handler
app.use(errorHandler_1.notFoundHandler);
// Global error handler
app.use(errorHandler_1.errorHandler);
// Start server
const startServer = async () => {
    try {
        // Connect to database
        await (0, database_1.connectDatabase)();
        // Start HTTP server
        const server = app.listen(config_1.default.port, () => {
            logger_1.default.info(`🏥 Medical Service listening on port ${config_1.default.port}`);
            logger_1.default.info(`Environment: ${config_1.default.nodeEnv}`);
            logger_1.default.info(`HIPAA Compliance: ✅ Enabled`);
            logger_1.default.info(`Encryption at Rest: ${config_1.default.hipaa.encryptionAtRest ? '✅' : '❌'}`);
            logger_1.default.info(`Encryption in Transit: ${config_1.default.hipaa.encryptionInTransit ? '✅' : '❌'}`);
            logger_1.default.info(`Audit Logging: ${config_1.default.audit.enabled ? '✅' : '❌'}`);
        });
        // Graceful shutdown
        const shutdown = async (signal) => {
            logger_1.default.info(`${signal} received, starting graceful shutdown`);
            server.close(async () => {
                logger_1.default.info('HTTP server closed');
                try {
                    await (0, database_1.closeDatabaseConnection)();
                    logger_1.default.info('Database connection closed');
                    process.exit(0);
                }
                catch (error) {
                    logger_1.default.error('Error during shutdown:', error);
                    process.exit(1);
                }
            });
            // Force shutdown after 30 seconds
            setTimeout(() => {
                logger_1.default.error('Forced shutdown after timeout');
                process.exit(1);
            }, 30000);
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
    catch (error) {
        logger_1.default.error('Failed to start server:', error);
        process.exit(1);
    }
};
// Start the server
if (require.main === module) {
    startServer();
}
exports.default = app;
//# sourceMappingURL=index.js.map