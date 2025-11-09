"use strict";
/**
 * Authentication Middleware
 * JWT token validation for Socket.IO connections
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = exports.authorizeEmergencyAccess = exports.authenticateSocket = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = __importDefault(require("../utils/logger"));
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
/**
 * Middleware to authenticate Socket.IO connections
 */
const authenticateSocket = async (socket, next) => {
    try {
        // Get token from handshake auth or query
        const token = socket.handshake.auth?.token ||
            socket.handshake.query?.token;
        if (!token) {
            logger_1.default.warn(`Authentication failed: No token provided for socket ${socket.id}`);
            return next(new Error('Authentication error: No token provided'));
        }
        // Verify token
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Attach user info to socket
        socket.userId = decoded.userId;
        socket.userName = decoded.name;
        socket.userRole = decoded.role || 'USER';
        logger_1.default.info(`Socket ${socket.id} authenticated as user ${decoded.userId}`);
        next();
    }
    catch (error) {
        logger_1.default.error('Socket authentication error:', error);
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return next(new Error('Authentication error: Invalid token'));
        }
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return next(new Error('Authentication error: Token expired'));
        }
        return next(new Error('Authentication error'));
    }
};
exports.authenticateSocket = authenticateSocket;
/**
 * Verify user has permission to join emergency room
 */
const authorizeEmergencyAccess = async (userId, emergencyId, role) => {
    try {
        // In production, this would validate against the emergency service
        // Check if user is:
        // 1. The user who triggered the emergency
        // 2. An emergency contact
        // 3. A first responder with access
        // 4. An admin
        // For now, allow all authenticated users (placeholder)
        // TODO: Implement proper authorization check with emergency service
        logger_1.default.info(`Authorizing user ${userId} for emergency ${emergencyId} with role ${role}`);
        // Simulated authorization logic
        if (role === 'ADMIN') {
            return true;
        }
        // In real implementation, call emergency service to verify access
        // const hasAccess = await emergencyService.checkUserAccess(userId, emergencyId);
        // return hasAccess;
        return true; // Placeholder - allow all for now
    }
    catch (error) {
        logger_1.default.error('Authorization check failed:', error);
        return false;
    }
};
exports.authorizeEmergencyAccess = authorizeEmergencyAccess;
/**
 * Generate JWT token (utility for testing)
 */
const generateToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};
exports.generateToken = generateToken;
//# sourceMappingURL=auth.middleware.js.map