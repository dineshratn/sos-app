"use strict";
/**
 * WebSocket Proxy for Communication Service
 *
 * Proxies WebSocket connections to Communication Service for real-time messaging
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupCommunicationWebSocketProxy = setupCommunicationWebSocketProxy;
const socket_io_1 = require("socket.io");
const socket_io_client_1 = require("socket.io-client");
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("../utils/logger"));
const authMiddleware_1 = require("../middleware/authMiddleware");
/**
 * Setup WebSocket proxy for Communication Service
 */
function setupCommunicationWebSocketProxy(httpServer) {
    const io = new socket_io_1.Server(httpServer, {
        path: '/ws/communication',
        cors: {
            origin: config_1.default.cors.origins,
            credentials: config_1.default.cors.credentials,
        },
        transports: ['websocket', 'polling'],
    });
    // Authentication middleware for Socket.IO
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
            if (!token) {
                logger_1.default.warn('Communication WebSocket rejected: No token provided');
                return next(new Error('Authentication required'));
            }
            // Verify JWT token
            const decoded = await (0, authMiddleware_1.verifyToken)(token);
            if (!decoded || !decoded.userId) {
                logger_1.default.warn('Communication WebSocket rejected: Invalid token');
                return next(new Error('Invalid token'));
            }
            socket.userId = decoded.userId;
            logger_1.default.info(`Communication WebSocket authenticated for user: ${socket.userId}`);
            next();
        }
        catch (error) {
            logger_1.default.error('Communication WebSocket authentication error:', error);
            next(new Error('Authentication failed'));
        }
    });
    // Connection handler
    io.on('connection', (socket) => {
        logger_1.default.info(`Communication WebSocket connected: ${socket.id} for user: ${socket.userId}`);
        // Create proxy connection to Communication Service
        const communicationServiceUrl = config_1.default.services.communication.url.replace(/^http/, 'ws');
        const proxySocket = (0, socket_io_client_1.io)(communicationServiceUrl, {
            path: '/ws',
            auth: {
                userId: socket.userId,
            },
            transports: ['websocket'],
        });
        // Forward client events to Communication Service
        socket.on('join-room', (data) => {
            logger_1.default.info(`User ${socket.userId} joining room ${data.roomId}`);
            socket.emergencyId = data.roomId;
            proxySocket.emit('join-room', {
                ...data,
                userId: socket.userId,
            });
        });
        socket.on('leave-room', (data) => {
            logger_1.default.info(`User ${socket.userId} leaving room ${data.roomId}`);
            proxySocket.emit('leave-room', {
                ...data,
                userId: socket.userId,
            });
            socket.emergencyId = undefined;
        });
        socket.on('send-message', (data) => {
            logger_1.default.debug(`Message from user ${socket.userId} in room ${socket.emergencyId}`);
            proxySocket.emit('send-message', {
                ...data,
                userId: socket.userId,
                roomId: socket.emergencyId,
            });
        });
        socket.on('typing-start', (data) => {
            logger_1.default.debug(`User ${socket.userId} started typing in room ${data.roomId}`);
            proxySocket.emit('typing-start', {
                ...data,
                userId: socket.userId,
            });
        });
        socket.on('typing-stop', (data) => {
            logger_1.default.debug(`User ${socket.userId} stopped typing in room ${data.roomId}`);
            proxySocket.emit('typing-stop', {
                ...data,
                userId: socket.userId,
            });
        });
        socket.on('mark-read', (data) => {
            logger_1.default.debug(`User ${socket.userId} marked message ${data.messageId} as read`);
            proxySocket.emit('mark-read', {
                ...data,
                userId: socket.userId,
            });
        });
        // Forward Communication Service events to client
        proxySocket.on('message-received', (data) => {
            logger_1.default.debug(`New message in room ${data.roomId}`);
            socket.emit('message-received', data);
        });
        proxySocket.on('message-sent', (data) => {
            logger_1.default.debug(`Message sent confirmation for ${data.messageId}`);
            socket.emit('message-sent', data);
        });
        proxySocket.on('message-delivered', (data) => {
            logger_1.default.debug(`Message delivered: ${data.messageId}`);
            socket.emit('message-delivered', data);
        });
        proxySocket.on('message-read', (data) => {
            logger_1.default.debug(`Message read: ${data.messageId}`);
            socket.emit('message-read', data);
        });
        proxySocket.on('user-typing', (data) => {
            logger_1.default.debug(`User ${data.userId} typing in room ${data.roomId}`);
            socket.emit('user-typing', data);
        });
        proxySocket.on('user-stopped-typing', (data) => {
            logger_1.default.debug(`User ${data.userId} stopped typing in room ${data.roomId}`);
            socket.emit('user-stopped-typing', data);
        });
        proxySocket.on('room-joined', (data) => {
            logger_1.default.info(`Successfully joined room ${data.roomId}`);
            socket.emit('room-joined', data);
        });
        proxySocket.on('room-left', (data) => {
            logger_1.default.info(`Successfully left room ${data.roomId}`);
            socket.emit('room-left', data);
        });
        proxySocket.on('error', (error) => {
            logger_1.default.error('Communication Service WebSocket error:', error);
            socket.emit('error', { message: 'Communication service error' });
        });
        // Handle disconnection
        socket.on('disconnect', (reason) => {
            logger_1.default.info(`Communication WebSocket disconnected: ${socket.id}, reason: ${reason}`);
            proxySocket.disconnect();
        });
        proxySocket.on('disconnect', (reason) => {
            logger_1.default.warn(`Communication Service disconnected: ${reason}`);
            socket.emit('error', { message: 'Lost connection to communication service' });
        });
        // Handle proxy connection errors
        proxySocket.on('connect_error', (error) => {
            logger_1.default.error('Failed to connect to Communication Service:', error);
            socket.emit('error', { message: 'Failed to connect to communication service' });
        });
    });
    logger_1.default.info('Communication WebSocket proxy initialized on /ws/communication');
}
//# sourceMappingURL=communication.proxy.js.map