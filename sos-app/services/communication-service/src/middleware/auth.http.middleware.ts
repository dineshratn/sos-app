/**
 * HTTP Authentication Middleware
 * JWT token validation for REST API endpoints
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWTPayload } from './auth.middleware';
import logger from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userName?: string;
  userRole?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Middleware to authenticate HTTP requests
 */
export const authenticateHTTP = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn(`Authentication failed: No token provided for ${req.path}`);
      res.status(401).json({
        success: false,
        error: 'Authentication required: No token provided'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    // Attach user info to request
    req.userId = decoded.userId;
    req.userName = decoded.name;
    req.userRole = decoded.role || 'USER';

    logger.debug(`Request authenticated for user ${decoded.userId}`);
    next();
  } catch (error) {
    logger.error('HTTP authentication error:', error);

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Authentication failed: Invalid token'
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
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

/**
 * Optional authentication - adds user info if token is present but doesn't fail if missing
 */
export const optionalAuthentication = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

      req.userId = decoded.userId;
      req.userName = decoded.name;
      req.userRole = decoded.role || 'USER';
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};
