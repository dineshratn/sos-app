"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.extractUserId = exports.optionalAuth = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../config"));
const errorHandler_1 = require("./errorHandler");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Middleware to validate JWT access token
 * Adds user info to req.user
 */
const authenticateToken = (req, _res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            throw new errorHandler_1.AppError('Authentication required', 401, 'NO_TOKEN_PROVIDED');
        }
        // Check Bearer format
        if (!authHeader.startsWith('Bearer ')) {
            throw new errorHandler_1.AppError('Invalid token format', 401, 'INVALID_TOKEN_FORMAT');
        }
        // Extract token
        const token = authHeader.substring(7);
        if (!token) {
            throw new errorHandler_1.AppError('Authentication required', 401, 'NO_TOKEN_PROVIDED');
        }
        // Verify token
        const decoded = jsonwebtoken_1.default.verify(token, config_1.default.jwt.secret);
        // Check token type
        if (decoded.type !== 'access') {
            throw new errorHandler_1.AppError('Invalid token type', 401, 'INVALID_TOKEN_TYPE');
        }
        // Add user info to request
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            sessionId: decoded.sessionId,
        };
        logger_1.default.debug('Token validated successfully', {
            userId: decoded.userId,
            email: decoded.email,
        });
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return next(new errorHandler_1.AppError('Invalid token', 401, 'INVALID_TOKEN'));
        }
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return next(new errorHandler_1.AppError('Token expired', 401, 'TOKEN_EXPIRED'));
        }
        next(error);
    }
};
exports.authenticateToken = authenticateToken;
/**
 * Optional authentication - doesn't fail if no token
 * Used for endpoints that work both authenticated and unauthenticated
 */
const optionalAuth = (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }
        const token = authHeader.substring(7);
        if (!token) {
            return next();
        }
        const decoded = jsonwebtoken_1.default.verify(token, config_1.default.jwt.secret);
        if (decoded.type === 'access') {
            req.user = {
                userId: decoded.userId,
                email: decoded.email,
                sessionId: decoded.sessionId,
            };
        }
        next();
    }
    catch (error) {
        // Silently fail for optional auth
        next();
    }
};
exports.optionalAuth = optionalAuth;
/**
 * Extract user ID from token without full validation
 * Used for logging and metrics
 */
const extractUserId = (req) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        const token = authHeader.substring(7);
        const decoded = jsonwebtoken_1.default.decode(token);
        return decoded?.userId || null;
    }
    catch (error) {
        return null;
    }
};
exports.extractUserId = extractUserId;
/**
 * Verify JWT token directly (for non-middleware use like WebSocket)
 * Returns the decoded token payload or throws an error
 */
const verifyToken = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.default.jwt.secret);
        return decoded;
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            throw new errorHandler_1.AppError('Invalid token', 401, 'INVALID_TOKEN');
        }
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            throw new errorHandler_1.AppError('Token expired', 401, 'TOKEN_EXPIRED');
        }
        throw error;
    }
};
exports.verifyToken = verifyToken;
//# sourceMappingURL=authMiddleware.js.map