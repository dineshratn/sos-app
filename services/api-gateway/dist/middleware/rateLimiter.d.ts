/**
 * Global rate limiter
 * Applies to all API requests
 */
export declare const globalRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Authentication endpoints rate limiter
 * More strict for login, register, etc.
 */
export declare const authRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Emergency endpoints rate limiter
 * More lenient for critical operations
 */
export declare const emergencyRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * User-specific rate limiter
 * Based on user ID from JWT token
 */
export declare const userRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * File upload rate limiter
 * Very strict for uploads
 */
export declare const uploadRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
//# sourceMappingURL=rateLimiter.d.ts.map