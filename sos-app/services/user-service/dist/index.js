"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = __importDefault(require("./config"));
const logger_1 = __importDefault(require("./utils/logger"));
const db_1 = require("./db");
const errorHandler_1 = require("./middleware/errorHandler");
const profile_routes_1 = __importDefault(require("./routes/profile.routes"));
const emergencyContact_routes_1 = __importDefault(require("./routes/emergencyContact.routes"));
const app = (0, express_1.default)();
// Security middleware
app.use((0, helmet_1.default)());
// CORS configuration
app.use((0, cors_1.default)({
    origin: config_1.default.cors.origins,
    credentials: config_1.default.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: config_1.default.rateLimit.windowMs,
    max: config_1.default.rateLimit.maxRequests,
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Request logging middleware
app.use((req, _res, next) => {
    logger_1.default.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
    });
    next();
});
// Health check endpoints
app.get('/health', (_req, res) => {
    res.json({
        status: 'healthy',
        service: config_1.default.serviceName,
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
app.get('/health/startup', (_req, res) => {
    res.json({
        status: 'started',
        service: config_1.default.serviceName,
        version: '1.0.0',
    });
});
app.get('/health/ready', async (_req, res) => {
    try {
        // Check database connection
        await (0, db_1.connectDatabase)();
        res.json({
            status: 'ready',
            service: config_1.default.serviceName,
            version: '1.0.0',
            database: 'connected',
        });
    }
    catch (error) {
        res.status(503).json({
            status: 'not ready',
            service: config_1.default.serviceName,
            error: 'Database connection failed',
        });
    }
});
app.get('/health/live', (_req, res) => {
    res.json({
        status: 'alive',
        service: config_1.default.serviceName,
        version: '1.0.0',
    });
});
// Root endpoint
app.get('/', (_req, res) => {
    res.json({
        service: config_1.default.serviceName,
        version: '1.0.0',
        description: 'SOS App User Service - User profiles and emergency contacts',
        endpoints: {
            health: '/health',
            startup: '/health/startup',
            ready: '/health/ready',
            live: '/health/live',
            api: '/api/v1',
        },
        documentation: '/api/v1/docs',
    });
});
// API Routes
app.use('/api/v1/users/profile', profile_routes_1.default);
app.use('/api/v1/users/emergency-contacts', emergencyContact_routes_1.default);
// 404 handler
app.use(errorHandler_1.notFoundHandler);
// Error handling middleware (must be last)
app.use(errorHandler_1.errorHandler);
// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
    logger_1.default.info(`${signal} received, starting graceful shutdown...`);
    try {
        // Close database connection
        await (0, db_1.closeDatabase)();
        logger_1.default.info('All connections closed. Exiting process.');
        process.exit(0);
    }
    catch (error) {
        logger_1.default.error('Error during graceful shutdown:', error);
        process.exit(1);
    }
};
// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger_1.default.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
});
// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    logger_1.default.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
});
// Start server
const startServer = async () => {
    try {
        // Connect to database
        await (0, db_1.connectDatabase)();
        // Sync database models (in development)
        if (config_1.default.nodeEnv === 'development') {
            await (0, db_1.syncDatabase)(false);
        }
        // Start listening
        app.listen(config_1.default.port, '0.0.0.0', () => {
            logger_1.default.info(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   👤  SOS App User Service                               ║
║                                                           ║
║   Environment: ${config_1.default.nodeEnv.padEnd(42)}║
║   Port: ${config_1.default.port.toString().padEnd(50)}║
║   Database: ${config_1.default.database.name.padEnd(45)}║
║                                                           ║
║   Health: http://localhost:${config_1.default.port}/health         ║
║   API: http://localhost:${config_1.default.port}/api/v1            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
        });
    }
    catch (error) {
        logger_1.default.error('Failed to start server:', error);
        process.exit(1);
    }
};
// Start the server
startServer();
exports.default = app;
//# sourceMappingURL=index.js.map