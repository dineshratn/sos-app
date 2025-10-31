import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import config from '../config';
import logger from '../utils/logger';

// Create Redis client for rate limiting
const redisClient = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 3) {
      logger.error('Redis connection failed after 3 retries');
      return null;
    }
    return Math.min(times * 100, 3000);
  },
});

redisClient.on('error', (err) => {
  logger.error('Redis rate limiter error:', err);
});

redisClient.on('connect', () => {
  logger.info('Redis rate limiter connected');
});

/**
 * Global rate limiter
 * Applies to all API requests
 */
export const globalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    // @ts-expect-error - RedisStore typing issue
    client: redisClient,
    prefix: 'rl:global:',
  }),
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
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    // @ts-expect-error - RedisStore typing issue
    client: redisClient,
    prefix: 'rl:auth:',
  }),
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
export const emergencyRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    // @ts-expect-error - RedisStore typing issue
    client: redisClient,
    prefix: 'rl:emergency:',
  }),
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
export const userRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per user per window
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    // @ts-expect-error - RedisStore typing issue
    client: redisClient,
    prefix: 'rl:user:',
  }),
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
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    // @ts-expect-error - RedisStore typing issue
    client: redisClient,
    prefix: 'rl:upload:',
  }),
  keyGenerator: (req) => {
    return req.user?.userId || req.ip || 'unknown';
  },
  message: {
    success: false,
    error: 'Too many upload requests, please try again later',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
  },
});

export { redisClient };
