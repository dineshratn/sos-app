import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import logger from '../utils/logger';

// Extend Express Request to include user information
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      userId?: string;
      sessionId?: string;
    }
  }
}

/**
 * Middleware to validate JWT access token from Authorization header
 * Expects: Authorization: Bearer <token>
 */
export const validateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: 'No authorization header provided',
        code: 'NO_AUTH_HEADER',
      });
      return;
    }

    // Check if header has Bearer format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        success: false,
        error: 'Invalid authorization header format. Expected: Bearer <token>',
        code: 'INVALID_AUTH_FORMAT',
      });
      return;
    }

    const token = parts[1];

    // Verify token
    try {
      const decoded = verifyAccessToken(token);

      // Attach user information to request
      req.user = decoded;
      req.userId = decoded.userId;
      req.sessionId = decoded.sessionId;

      logger.debug(`Token validated for user: ${decoded.userId}`);
      next();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('expired')) {
        res.status(401).json({
          success: false,
          error: 'Access token has expired',
          code: 'TOKEN_EXPIRED',
        });
        return;
      }

      res.status(401).json({
        success: false,
        error: 'Invalid access token',
        code: 'INVALID_TOKEN',
      });
      return;
    }
  } catch (error) {
    logger.error('Error in token validation middleware:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during authentication',
      code: 'AUTH_ERROR',
    });
  }
};

/**
 * Optional authentication middleware
 * Validates token if present, but doesn't require it
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    next();
    return;
  }

  try {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1];
      const decoded = verifyAccessToken(token);

      req.user = decoded;
      req.userId = decoded.userId;
      req.sessionId = decoded.sessionId;
    }
  } catch (error) {
    // Token is invalid, but we don't fail the request
    logger.debug('Optional auth failed, continuing without user');
  }

  next();
};

/**
 * Middleware to check if user has specific permissions
 * Note: This is a placeholder for future role-based access control
 */
export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    // TODO: Implement actual permission checking from database
    // For now, just allow all authenticated users
    next();
  };
};

/**
 * Middleware to validate that the authenticated user matches the requested userId
 * Useful for protecting user-specific resources
 */
export const validateUserOwnership = (userIdParam: string = 'userId') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const requestedUserId = req.params[userIdParam] || req.body.userId;

    if (req.user.userId !== requestedUserId) {
      res.status(403).json({
        success: false,
        error: 'You do not have permission to access this resource',
        code: 'FORBIDDEN',
      });
      return;
    }

    next();
  };
};
