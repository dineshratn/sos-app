import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import { AppError } from './errorHandler';
import logger from '../utils/logger';

export interface TokenPayload {
  userId: string;
  email: string;
  sessionId: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        sessionId: string;
      };
    }
  }
}

/**
 * Middleware to validate JWT access token
 * Adds user info to req.user
 */
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError('Authentication required', 401, 'NO_TOKEN_PROVIDED');
    }

    // Check Bearer format
    if (!authHeader.startsWith('Bearer ')) {
      throw new AppError('Invalid token format', 401, 'INVALID_TOKEN_FORMAT');
    }

    // Extract token
    const token = authHeader.substring(7);

    if (!token) {
      throw new AppError('Authentication required', 401, 'NO_TOKEN_PROVIDED');
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;

    // Check token type
    if (decoded.type !== 'access') {
      throw new AppError('Invalid token type', 401, 'INVALID_TOKEN_TYPE');
    }

    // Add user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      sessionId: decoded.sessionId,
    };

    logger.debug('Token validated successfully', {
      userId: decoded.userId,
      email: decoded.email,
    });

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid token', 401, 'INVALID_TOKEN'));
    }

    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError('Token expired', 401, 'TOKEN_EXPIRED'));
    }

    next(error);
  }
};

/**
 * Optional authentication - doesn't fail if no token
 * Used for endpoints that work both authenticated and unauthenticated
 */
export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;

    if (decoded.type === 'access') {
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        sessionId: decoded.sessionId,
      };
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};

/**
 * Extract user ID from token without full validation
 * Used for logging and metrics
 */
export const extractUserId = (req: Request): string | null => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.decode(token) as TokenPayload | null;

    return decoded?.userId || null;
  } catch (error) {
    return null;
  }
};
