"use strict";
/**
 * WebSocket Proxy for Location Service
 *
 * Proxies WebSocket connections to Location Service for real-time location updates
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupLocationWebSocketProxy = setupLocationWebSocketProxy;
const socket_io_1 = require("socket.io");
const socket_io_client_1 = require("socket.io-client");
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("../utils/logger"));
const authMiddleware_1 = require("../middleware/authMiddleware");
/**
 * Setup WebSocket proxy for Location Service
 */
function setupLocationWebSocketProxy(httpServer) {
    const io = new socket_io_1.Server(httpServer, {
        path: '/ws/location',
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
                logger_1.default.warn('WebSocket connection rejected: No token provided');
                return next(new Error('Authentication required'));
            }
            // Verify JWT token
            const decoded = await (0, authMiddleware_1.verifyToken)(token);
            if (!decoded || !decoded.userId) {
                logger_1.default.warn('WebSocket connection rejected: Invalid token');
                return next(new Error('Invalid token'));
            }
            socket.userId = decoded.userId;
            logger_1.default.info(`WebSocket authenticated for user: ${socket.userId}`);
            next();
        }
        catch (error) {
            logger_1.default.error('WebSocket authentication error:', error);
            next(new Error('Authentication failed'));
        }
    });
    // Connection handler
    io.on('connection', (socket) => {
        logger_1.default.info(`Location WebSocket connected: ${socket.id} for user: ${socket.userId}`);
        // Create proxy connection to Location Service
        const locationServiceUrl = config_1.default.services.location.url.replace(/^http/, 'ws');
        const proxySocket = (0, socket_io_client_1.io)(locationServiceUrl, {
            path: '/ws/location',
            auth: {
                userId: socket.userId,
            },
            transports: ['websocket'],
        });
        // Forward client messages to Location Service
        socket.on('join-emergency', (data) => {
            logger_1.default.info(`User ${socket.userId} joining emergency ${data.emergencyId}`);
            socket.emergencyId = data.emergencyId;
            proxySocket.emit('join-emergency', {
                ...data,
                userId: socket.userId,
            });
        });
        socket.on('leave-emergency', (data) => {
            logger_1.default.info(`User ${socket.userId} leaving emergency ${data.emergencyId}`);
            proxySocket.emit('leave-emergency', {
                ...data,
                userId: socket.userId,
            });
            socket.emergencyId = undefined;
        });
        socket.on('location-update', (data) => {
            logger_1.default.debug(`Location update from user ${socket.userId}`);
            proxySocket.emit('location-update', {
                ...data,
                userId: socket.userId,
                emergencyId: socket.emergencyId,
            });
        });
        // Forward Location Service messages to client
        proxySocket.on('location-updated', (data) => {
            logger_1.default.debug(`Location updated event for emergency ${data.emergencyId}`);
            socket.emit('location-updated', data);
        });
        proxySocket.on('contact-location-updated', (data) => {
            logger_1.default.debug(`Contact location updated for emergency ${data.emergencyId}`);
            socket.emit('contact-location-updated', data);
        });
        proxySocket.on('geofence-alert', (data) => {
            logger_1.default.info(`Geofence alert for emergency ${data.emergencyId}`);
            socket.emit('geofence-alert', data);
        });
        proxySocket.on('error', (error) => {
            logger_1.default.error('Location Service WebSocket error:', error);
            socket.emit('error', { message: 'Location service error' });
        });
        // Handle disconnection
        socket.on('disconnect', (reason) => {
            logger_1.default.info(`Location WebSocket disconnected: ${socket.id}, reason: ${reason}`);
            proxySocket.disconnect();
        });
        proxySocket.on('disconnect', (reason) => {
            logger_1.default.warn(`Location Service disconnected: ${reason}`);
            socket.emit('error', { message: 'Lost connection to location service' });
        });
        // Handle proxy connection errors
        proxySocket.on('connect_error', (error) => {
            logger_1.default.error('Failed to connect to Location Service:', error);
            socket.emit('error', { message: 'Failed to connect to location service' });
        });
    });
    logger_1.default.info('Location WebSocket proxy initialized on /ws/location');
}
//# sourceMappingURL=location.proxy.js.map