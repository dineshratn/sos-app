"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = require("express-rate-limit");
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const webhook_routes_1 = require("./routes/webhook.routes");
const consumer_1 = require("./kafka/consumer");
const notification_worker_1 = require("./workers/notification.worker");
class NotificationService {
    app;
    constructor() {
        this.app = (0, express_1.default)();
        this.initializeMiddleware();
        this.initializeRoutes();
        this.initializeErrorHandling();
    }
    initializeMiddleware() {
        // Security middleware
        this.app.use((0, helmet_1.default)());
        // CORS configuration
        this.app.use((0, cors_1.default)({
            origin: config_1.config.server.env === 'production'
                ? ['https://sos-app.com', 'https://admin.sos-app.com']
                : '*',
            credentials: true,
        }));
        // Compression
        this.app.use((0, compression_1.default)());
        // Body parsing
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
        // Rate limiting
        const limiter = (0, express_rate_limit_1.rateLimit)({
            windowMs: config_1.config.rateLimit.windowMs,
            max: config_1.config.rateLimit.maxRequests,
            message: 'Too many requests from this IP, please try again later.',
            standardHeaders: true,
            legacyHeaders: false,
        });
        this.app.use('/api/', limiter);
        // Request logging
        this.app.use((req, _res, next) => {
            logger_1.logger.info(`${req.method} ${req.path}`, {
                ip: req.ip,
                userAgent: req.get('user-agent'),
            });
            next();
        });
    }
    initializeRoutes() {
        // Health check endpoint
        this.app.get('/health', (_req, res) => {
            res.status(200).json({
                status: 'healthy',
                service: 'notification-service',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
            });
        });
        // API routes
        this.app.use('/api/v1/webhooks', webhook_routes_1.webhookRoutes);
        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({
                error: {
                    code: 'NOT_FOUND',
                    message: 'The requested resource was not found',
                    path: req.path,
                },
            });
        });
    }
    initializeErrorHandling() {
        this.app.use((err, req, res, _next) => {
            logger_1.logger.error('Unhandled error', {
                error: err.message,
                stack: err.stack,
                path: req.path,
                method: req.method,
            });
            res.status(500).json({
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: config_1.config.server.env === 'production'
                        ? 'An unexpected error occurred'
                        : err.message,
                    timestamp: new Date().toISOString(),
                },
            });
        });
    }
    async connectDatabase() {
        try {
            await mongoose_1.default.connect(config_1.config.mongodb.uri, {
                maxPoolSize: config_1.config.mongodb.maxPoolSize,
            });
            logger_1.logger.info('Connected to MongoDB', { uri: config_1.config.mongodb.uri });
        }
        catch (error) {
            logger_1.logger.error('MongoDB connection failed', { error });
            throw error;
        }
    }
    async start() {
        try {
            // Connect to MongoDB
            await this.connectDatabase();
            // Initialize notification worker
            await (0, notification_worker_1.initializeNotificationWorker)();
            logger_1.logger.info('Notification worker initialized');
            // Start Kafka consumer
            await (0, consumer_1.startKafkaConsumer)();
            logger_1.logger.info('Kafka consumer started');
            // Start HTTP server
            const port = config_1.config.server.port;
            this.app.listen(port, () => {
                logger_1.logger.info(`Notification Service listening on port ${port}`, {
                    env: config_1.config.server.env,
                });
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to start Notification Service', { error });
            process.exit(1);
        }
    }
    async stop() {
        try {
            await mongoose_1.default.connection.close();
            logger_1.logger.info('MongoDB connection closed');
            process.exit(0);
        }
        catch (error) {
            logger_1.logger.error('Error during graceful shutdown', { error });
            process.exit(1);
        }
    }
}
// Create and start service
const notificationService = new NotificationService();
exports.notificationService = notificationService;
// Handle shutdown signals
process.on('SIGTERM', () => {
    logger_1.logger.info('SIGTERM received, starting graceful shutdown');
    notificationService.stop();
});
process.on('SIGINT', () => {
    logger_1.logger.info('SIGINT received, starting graceful shutdown');
    notificationService.stop();
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    notificationService.stop();
});
process.on('unhandledRejection', (reason) => {
    logger_1.logger.error('Unhandled rejection', { reason });
    notificationService.stop();
});
// Start the service
notificationService.start();
//# sourceMappingURL=index.js.map