"use strict";
/**
 * Socket.IO Server Configuration with Redis Adapter
 * Task 126: Setup Socket.IO with Redis adapter for horizontal scaling
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocketIOWithRedis = setupSocketIOWithRedis;
exports.setupSocketIOMiddleware = setupSocketIOMiddleware;
const socket_io_1 = require("socket.io");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const redis_1 = require("redis");
const logger_1 = __importDefault(require("../utils/logger"));
async function setupSocketIOWithRedis(httpServer, corsOrigin) {
    // Socket.IO configuration
    const socketOptions = {
        cors: {
            origin: corsOrigin,
            methods: ['GET', 'POST'],
            credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        // Enable compression for better performance
        perMessageDeflate: {
            threshold: 1024
        },
        // Connection state recovery
        connectionStateRecovery: {
            maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
            skipMiddlewares: true
        }
    };
    const io = new socket_io_1.Server(httpServer, socketOptions);
    try {
        // Setup Redis adapter for horizontal scaling
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        // Create Redis clients for pub/sub
        const pubClient = (0, redis_1.createClient)({ url: redisUrl });
        const subClient = pubClient.duplicate();
        // Handle Redis errors
        pubClient.on('error', (err) => {
            logger_1.default.error('Redis Pub Client Error:', err);
        });
        subClient.on('error', (err) => {
            logger_1.default.error('Redis Sub Client Error:', err);
        });
        // Connect Redis clients
        await Promise.all([pubClient.connect(), subClient.connect()]);
        logger_1.default.info('Redis pub/sub clients connected for Socket.IO adapter');
        // Attach Redis adapter to Socket.IO
        io.adapter((0, redis_adapter_1.createAdapter)(pubClient, subClient));
        logger_1.default.info('Socket.IO configured with Redis adapter for horizontal scaling');
        // Monitor adapter events
        io.of('/').adapter.on('create-room', (room) => {
            logger_1.default.debug(`Room created: ${room}`);
        });
        io.of('/').adapter.on('delete-room', (room) => {
            logger_1.default.debug(`Room deleted: ${room}`);
        });
        io.of('/').adapter.on('join-room', (room, id) => {
            logger_1.default.debug(`Socket ${id} joined room: ${room}`);
        });
        io.of('/').adapter.on('leave-room', (room, id) => {
            logger_1.default.debug(`Socket ${id} left room: ${room}`);
        });
    }
    catch (error) {
        logger_1.default.error('Failed to setup Redis adapter for Socket.IO:', error);
        logger_1.default.warn('Socket.IO will run without Redis adapter (no horizontal scaling)');
        // Continue without Redis adapter - single instance mode
    }
    return io;
}
function setupSocketIOMiddleware(io) {
    // Add middleware for tracking socket connections
    io.use((socket, next) => {
        const sessionStart = Date.now();
        socket.on('disconnect', () => {
            const sessionDuration = Date.now() - sessionStart;
            logger_1.default.info(`Socket ${socket.id} session duration: ${sessionDuration}ms`);
        });
        next();
    });
    // Add error handler
    io.engine.on('connection_error', (err) => {
        logger_1.default.error('Socket.IO connection error:', {
            code: err.code,
            message: err.message,
            context: err.context
        });
    });
}
//# sourceMappingURL=socket.server.js.map