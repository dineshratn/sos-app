"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logMedicalAccess = exports.validateEmergencyToken = exports.validateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../config"));
const errorHandler_1 = require("./errorHandler");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Validate JWT token from Authorization header
 */
const validateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new errorHandler_1.AppError('No token provided', 401, 'NO_TOKEN');
        }
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        try {
            const decoded = jsonwebtoken_1.default.verify(token, config_1.default.auth.jwtSecret);
            // Attach user information to request
            req.userId = decoded.userId;
            req.userEmail = decoded.email;
            next();
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw new errorHandler_1.AppError('Token expired', 401, 'TOKEN_EXPIRED');
            }
            else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw new errorHandler_1.AppError('Invalid token', 401, 'INVALID_TOKEN');
            }
            throw error;
        }
    }
    catch (error) {
        next(error);
    }
};
exports.validateToken = validateToken;
/**
 * Validate emergency access token
 * Used for first responders and emergency contacts
 */
const validateEmergencyToken = async (req, res, next) => {
    try {
        const token = req.params.token || req.query.token;
        if (!token) {
            throw new errorHandler_1.AppError('No emergency access token provided', 401, 'NO_EMERGENCY_TOKEN');
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, config_1.default.auth.jwtSecret);
            // Emergency tokens have specific claims
            if (!decoded.emergencyId || !decoded.profileId) {
                throw new errorHandler_1.AppError('Invalid emergency token', 401, 'INVALID_EMERGENCY_TOKEN');
            }
            // Check if token is expired (emergency tokens are short-lived: 1 hour)
            const now = Math.floor(Date.now() / 1000);
            if (decoded.exp && decoded.exp < now) {
                throw new errorHandler_1.AppError('Emergency access token expired', 401, 'EMERGENCY_TOKEN_EXPIRED');
            }
            // Attach emergency information to request
            req.emergencyId = decoded.emergencyId;
            req.profileId = decoded.profileId;
            req.requesterId = decoded.requesterId;
            req.requesterRole = decoded.requesterRole;
            next();
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw new errorHandler_1.AppError('Emergency access token expired', 401, 'EMERGENCY_TOKEN_EXPIRED');
            }
            else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw new errorHandler_1.AppError('Invalid emergency token', 401, 'INVALID_EMERGENCY_TOKEN');
            }
            throw error;
        }
    }
    catch (error) {
        next(error);
    }
};
exports.validateEmergencyToken = validateEmergencyToken;
/**
 * Log medical data access for HIPAA compliance
 */
const logMedicalAccess = (action) => {
    return (req, res, next) => {
        const userId = req.userId || req.profileId;
        const accessedBy = req.userId || req.requesterId;
        const role = req.requesterRole || 'user';
        logger_1.default.info('Medical data access', {
            action,
            userId,
            accessedBy,
            role,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            timestamp: new Date().toISOString(),
            hipaa: true,
        });
        // Continue to next middleware
        res.on('finish', () => {
            logger_1.default.info('Medical data access completed', {
                action,
                userId,
                statusCode: res.statusCode,
                hipaa: true,
            });
        });
        next();
    };
};
exports.logMedicalAccess = logMedicalAccess;
//# sourceMappingURL=auth.js.map