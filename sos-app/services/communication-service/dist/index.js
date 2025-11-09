"use strict";
/**
 * Communication Service Entry Point
 * Real-time messaging and communication service for SOS App
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpServer = exports.io = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const redis_service_1 = __importDefault(require("./services/redis.service"));
const connection_1 = __importDefault(require("./db/connection"));
const kafka_service_1 = __importDefault(require("./services/kafka.service"));
const socket_server_1 = require("./websocket/socket.server");
const room_handler_1 = require("./handlers/room.handler");
const message_handler_1 = require("./websocket/handlers/message.handler");
const typing_handler_1 = require("./websocket/handlers/typing.handler");
const receipt_handler_1 = require("./websocket/handlers/receipt.handler");
const auth_middleware_1 = require("./middleware/auth.middleware");
const message_routes_1 = __importDefault(require("./routes/message.routes"));
const media_routes_1 = __importDefault(require("./routes/media.routes"));
const logger_1 = __importDefault(require("./utils/logger"));
// Load environment variables
dotenv_1.default.config();
const PORT = process.env.PORT || 3003;
const CORS_ORIGIN = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : ['http://localhost:3000'];
// Initialize Express app
const app = (0, express_1.default)();
exports.app = app;
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: CORS_ORIGIN,
    credentials: true
}));
app.use(express_1.default.json());
// API Routes
app.use('/api/v1/messages', message_routes_1.default);
app.use('/api/v1/media', media_routes_1.default);
// Health check endpoint
app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'communication-service',
        timestamp: new Date().toISOString(),
        mongodb: connection_1.default.isConnectedStatus(),
        redis: redis_service_1.default.isConnected,
        kafka: kafka_service_1.default.isConnectedStatus()
    });
});
// Create HTTP server
const httpServer = (0, http_1.createServer)(app);
exports.httpServer = httpServer;
// Initialize Socket.IO server with Redis adapter (will be setup in startServer)
let io;
async function setupSocketIO() {
    exports.io = io = await (0, socket_server_1.setupSocketIOWithRedis)(httpServer, CORS_ORIGIN);
    (0, socket_server_1.setupSocketIOMiddleware)(io);
    // Apply authentication middleware to all Socket.IO connections
    io.use(auth_middleware_1.authenticateSocket);
    return io;
}
// Initialize services and start server
async function startServer() {
    try {
        // Connect to MongoDB
        await connection_1.default.connect();
        logger_1.default.info('MongoDB connection established');
        // Connect to Redis
        await redis_service_1.default.connect();
        logger_1.default.info('Redis connection established');
        // Connect to Kafka
        try {
            await kafka_service_1.default.connect();
            logger_1.default.info('Kafka connection established');
        }
        catch (error) {
            logger_1.default.warn('Kafka connection failed, continuing without event publishing:', error);
        }
        // Setup Socket.IO with Redis adapter
        exports.io = io = await setupSocketIO();
        logger_1.default.info('Socket.IO configured with Redis adapter');
        // Initialize handlers
        const roomHandler = new room_handler_1.RoomHandler(io);
        const messageHandler = new message_handler_1.MessageHandler(io);
        const typingHandler = new typing_handler_1.TypingHandler(io);
        const receiptHandler = new receipt_handler_1.ReceiptHandler(io);
        // Handle Socket.IO connections
        io.on('connection', (socket) => {
            logger_1.default.info(`Client connected: ${socket.id}`);
            // Register all handlers
            roomHandler.registerHandlers(socket);
            messageHandler.registerHandlers(socket);
            typingHandler.registerHandlers(socket);
            receiptHandler.registerHandlers(socket);
            // Handle disconnection
            socket.on('disconnect', (reason) => {
                logger_1.default.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
            });
            // Handle connection errors
            socket.on('error', (error) => {
                logger_1.default.error(`Socket error for ${socket.id}:`, error);
            });
        });
        // Start HTTP server
        httpServer.listen(PORT, () => {
            logger_1.default.info(`Communication service listening on port ${PORT}`);
            logger_1.default.info(`WebSocket server ready for connections`);
        });
    }
    catch (error) {
        logger_1.default.error('Failed to start server:', error);
        process.exit(1);
    }
}
// Graceful shutdown
async function gracefulShutdown(signal) {
    logger_1.default.info(`Received ${signal}, starting graceful shutdown`);
    try {
        // Close Socket.IO connections
        if (io) {
            io.close(() => {
                logger_1.default.info('Socket.IO server closed');
            });
        }
        // Close HTTP server
        httpServer.close(() => {
            logger_1.default.info('HTTP server closed');
        });
        // Disconnect from MongoDB
        await connection_1.default.disconnect();
        logger_1.default.info('MongoDB disconnected');
        // Disconnect from Redis
        await redis_service_1.default.disconnect();
        logger_1.default.info('Redis disconnected');
        // Disconnect from Kafka
        await kafka_service_1.default.disconnect();
        logger_1.default.info('Kafka disconnected');
        process.exit(0);
    }
    catch (error) {
        logger_1.default.error('Error during shutdown:', error);
        process.exit(1);
    }
}
// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger_1.default.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason, promise) => {
    logger_1.default.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
});
// Start the server
startServer();
//# sourceMappingURL=index.js.map