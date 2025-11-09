"use strict";
/**
 * HTTP Authentication Middleware
 * JWT token validation for REST API endpoints
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuthentication = exports.authenticateHTTP = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = __importDefault(require("../utils/logger"));
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
/**
 * Middleware to authenticate HTTP requests
 */
const authenticateHTTP = (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            logger_1.default.warn(`Authentication failed: No token provided for ${req.path}`);
            res.status(401).json({
                success: false,
                error: 'Authentication required: No token provided'
            });
            return;
        }
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        // Verify token
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Attach user info to request
        req.userId = decoded.userId;
        req.userName = decoded.name;
        req.userRole = decoded.role || 'USER';
        logger_1.default.debug(`Request authenticated for user ${decoded.userId}`);
        next();
    }
    catch (error) {
        logger_1.default.error('HTTP authentication error:', error);
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({
                success: false,
                error: 'Authentication failed: Invalid token'
            });
            return;
        }
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json({
                success: false,
                error: 'Authentication failed: Token expired'
            });
            return;
        }
        res.status(401).json({
            success: false,
            error: 'Authentication failed'
        });
    }
};
exports.authenticateHTTP = authenticateHTTP;
/**
 * Optional authentication - adds user info if token is present but doesn't fail if missing
 */
const optionalAuthentication = (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            req.userId = decoded.userId;
            req.userName = decoded.name;
            req.userRole = decoded.role || 'USER';
        }
        next();
    }
    catch (error) {
        // Continue without authentication
        next();
    }
};
exports.optionalAuthentication = optionalAuthentication;
//# sourceMappingURL=auth.http.middleware.js.map