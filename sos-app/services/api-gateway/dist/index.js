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
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const config_1 = __importDefault(require("./config"));
const logger_1 = __importDefault(require("./utils/logger"));
const httpClient_1 = __importDefault(require("./utils/httpClient"));
const errorHandler_1 = require("./middleware/errorHandler");
const rateLimiter_1 = require("./middleware/rateLimiter");
// Import routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const emergency_routes_1 = __importDefault(require("./routes/emergency.routes"));
const location_routes_1 = __importDefault(require("./routes/location.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const communication_routes_1 = __importDefault(require("./routes/communication.routes"));
const llm_routes_1 = __importDefault(require("./routes/llm.routes"));
const app = (0, express_1.default)();
// ==================== Security Middleware ====================
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false, // Disable for API gateway
    crossOriginEmbedderPolicy: false,
}));
// ==================== CORS Configuration ====================
app.use((0, cors_1.default)({
    origin: config_1.default.cors.origins,
    credentials: config_1.default.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-ID', 'X-Device-Name', 'X-Device-Type'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: 86400, // 24 hours
}));
// ==================== Request Processing Middleware ====================
// Compression
app.use((0, compression_1.default)());
// Body parsing
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// HTTP request logging
if (config_1.default.nodeEnv === 'development') {
    app.use((0, morgan_1.default)('dev'));
}
else {
    app.use((0, morgan_1.default)('combined', {
        stream: {
            write: (message) => logger_1.default.info(message.trim()),
        },
    }));
}
// Request ID and logging middleware
app.use((_req, _res, next) => {
    const requestId = _req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    _req.headers['x-request-id'] = requestId;
    logger_1.default.info(`${_req.method} ${_req.path}`, {
        requestId,
        ip: _req.ip,
        userAgent: _req.get('user-agent'),
        userId: _req.user?.userId,
    });
    next();
});
// ==================== Rate Limiting ====================
app.use('/api/', rateLimiter_1.globalRateLimiter);
// ==================== Health Check Endpoints ====================
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
        // Check if all services are reachable (simple ping)
        const serviceChecks = await Promise.allSettled([
            httpClient_1.default.get('auth', '/health').catch(() => ({ status: 'down' })),
            httpClient_1.default.get('user', '/health').catch(() => ({ status: 'down' })),
            httpClient_1.default.get('emergency', '/health').catch(() => ({ status: 'down' })),
            httpClient_1.default.get('location', '/health').catch(() => ({ status: 'down' })),
            httpClient_1.default.get('notification', '/health').catch(() => ({ status: 'down' })),
            httpClient_1.default.get('communication', '/health').catch(() => ({ status: 'down' })),
            httpClient_1.default.get('llm', '/health').catch(() => ({ status: 'down' })),
        ]);
        const services = {
            auth: serviceChecks[0].status === 'fulfilled' ? 'up' : 'down',
            user: serviceChecks[1].status === 'fulfilled' ? 'up' : 'down',
            emergency: serviceChecks[2].status === 'fulfilled' ? 'up' : 'down',
            location: serviceChecks[3].status === 'fulfilled' ? 'up' : 'down',
            notification: serviceChecks[4].status === 'fulfilled' ? 'up' : 'down',
            communication: serviceChecks[5].status === 'fulfilled' ? 'up' : 'down',
            llm: serviceChecks[6].status === 'fulfilled' ? 'up' : 'down',
        };
        const allServicesUp = Object.values(services).every((status) => status === 'up');
        res.status(allServicesUp ? 200 : 503).json({
            status: allServicesUp ? 'ready' : 'degraded',
            service: config_1.default.serviceName,
            version: '1.0.0',
            services,
        });
    }
    catch (error) {
        res.status(503).json({
            status: 'not ready',
            service: config_1.default.serviceName,
            error: 'Failed to check service health',
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
// Circuit breaker status endpoint
app.get('/health/circuit-breakers', (_req, res) => {
    const states = httpClient_1.default.getAllCircuitBreakerStates();
    res.json({
        circuitBreakers: states,
        timestamp: new Date().toISOString(),
    });
});
// ==================== Root Endpoint ====================
app.get('/', (_req, res) => {
    res.json({
        service: config_1.default.serviceName,
        version: '1.0.0',
        description: 'SOS App API Gateway - Central entry point for all microservices',
        endpoints: {
            health: '/health',
            startup: '/health/startup',
            ready: '/health/ready',
            live: '/health/live',
            circuitBreakers: '/health/circuit-breakers',
            api: '/api/v1',
        },
        services: {
            auth: '/api/v1/auth',
            users: '/api/v1/users',
            emergencies: '/api/v1/emergencies',
            locations: '/api/v1/locations',
            notifications: '/api/v1/notifications',
            communications: '/api/v1/communications',
            llm: '/api/v1/llm',
        },
        websockets: {
            location: '/ws/location',
            communication: '/ws/communication',
        },
        documentation: '/api/v1/docs',
    });
});
// ==================== API Routes ====================
app.use('/api/v1/auth', auth_routes_1.default);
app.use('/api/v1/users', user_routes_1.default);
app.use('/api/v1/emergencies', emergency_routes_1.default);
app.use('/api/v1/locations', location_routes_1.default);
app.use('/api/v1/notifications', notification_routes_1.default);
app.use('/api/v1/communications', communication_routes_1.default);
app.use('/api/v1/llm', llm_routes_1.default);
// ==================== Error Handling ====================
// 404 handler
app.use(errorHandler_1.notFoundHandler);
// Global error handler (must be last)
app.use(errorHandler_1.errorHandler);
// ==================== Graceful Shutdown ====================
const gracefulShutdown = async (signal) => {
    logger_1.default.info(`${signal} received, starting graceful shutdown...`);
    try {
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
// ==================== Start Server ====================
const startServer = async () => {
    try {
        // Create HTTP server for WebSocket support
        const http = await Promise.resolve().then(() => __importStar(require('http')));
        const httpServer = http.createServer(app);
        // Setup WebSocket proxies
        const { setupLocationWebSocketProxy } = await Promise.resolve().then(() => __importStar(require('./websocket/location.proxy')));
        const { setupCommunicationWebSocketProxy } = await Promise.resolve().then(() => __importStar(require('./websocket/communication.proxy')));
        setupLocationWebSocketProxy(httpServer);
        setupCommunicationWebSocketProxy(httpServer);
        httpServer.listen(config_1.default.port, '0.0.0.0', () => {
            logger_1.default.info(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🌐  SOS App API Gateway                                ║
║                                                           ║
║   Environment: ${config_1.default.nodeEnv.padEnd(42)}║
║   Port: ${config_1.default.port.toString().padEnd(50)}║
║                                                           ║
║   Health: http://localhost:${config_1.default.port}/health         ║
║   API: http://localhost:${config_1.default.port}/api/v1            ║
║                                                           ║
║   Services:                                               ║
║   - Auth: ${config_1.default.services.auth.url.padEnd(46)}║
║   - User: ${config_1.default.services.user.url.padEnd(46)}║
║   - Emergency: ${config_1.default.services.emergency.url.padEnd(43)}║
║   - Location: ${config_1.default.services.location.url.padEnd(44)}║
║   - Notification: ${config_1.default.services.notification.url.padEnd(40)}║
║   - Communication: ${config_1.default.services.communication.url.padEnd(39)}║
║   - LLM: ${config_1.default.services.llm.url.padEnd(49)}║
║                                                           ║
║   WebSockets:                                             ║
║   - Location: ws://localhost:${config_1.default.port}/ws/location  ║
║   - Communication: ws://localhost:${config_1.default.port}/ws/communication ║
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