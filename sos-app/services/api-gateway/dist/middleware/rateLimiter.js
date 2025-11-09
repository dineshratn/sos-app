"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadRateLimiter = exports.userRateLimiter = exports.emergencyRateLimiter = exports.authRateLimiter = exports.globalRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = __importDefault(require("../config"));
/**
 * Global rate limiter
 * Applies to all API requests
 */
exports.globalRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: config_1.default.rateLimit.windowMs,
    max: config_1.default.rateLimit.maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
    },
    skip: (req) => {
        // Skip rate limiting for health checks
        return req.path.startsWith('/health');
    },
});
/**
 * Authentication endpoints rate limiter
 * More strict for login, register, etc.
 */
exports.authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many authentication attempts, please try again later',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
    },
    skipSuccessfulRequests: true, // Don't count successful requests
});
/**
 * Emergency endpoints rate limiter
 * More lenient for critical operations
 */
exports.emergencyRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many emergency requests, please try again shortly',
        code: 'EMERGENCY_RATE_LIMIT_EXCEEDED',
    },
});
/**
 * User-specific rate limiter
 * Based on user ID from JWT token
 */
exports.userRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 requests per user per window
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Use user ID from token if available, otherwise fall back to IP
        return req.user?.userId || req.ip || 'unknown';
    },
    message: {
        success: false,
        error: 'Too many requests, please try again later',
        code: 'USER_RATE_LIMIT_EXCEEDED',
    },
});
/**
 * File upload rate limiter
 * Very strict for uploads
 */
exports.uploadRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 uploads per hour
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.user?.userId || req.ip || 'unknown';
    },
    message: {
        success: false,
        error: 'Too many upload requests, please try again later',
        code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
    },
});
//# sourceMappingURL=rateLimiter.js.map