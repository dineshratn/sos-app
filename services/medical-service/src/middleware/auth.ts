import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import { AppError } from './errorHandler';
import logger from '../utils/logger';

export interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

/**
 * Validate JWT token from Authorization header
 */
export const validateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401, 'NO_TOKEN');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decoded = jwt.verify(token, config.auth.jwtSecret) as JWTPayload;

      // Attach user information to request
      req.userId = decoded.userId;
      req.userEmail = decoded.email;

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError('Token expired', 401, 'TOKEN_EXPIRED');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError('Invalid token', 401, 'INVALID_TOKEN');
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Validate emergency access token
 * Used for first responders and emergency contacts
 */
export const validateEmergencyToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.params.token || req.query.token;

    if (!token) {
      throw new AppError('No emergency access token provided', 401, 'NO_EMERGENCY_TOKEN');
    }

    try {
      const decoded = jwt.verify(token as string, config.auth.jwtSecret) as any;

      // Emergency tokens have specific claims
      if (!decoded.emergencyId || !decoded.profileId) {
        throw new AppError('Invalid emergency token', 401, 'INVALID_EMERGENCY_TOKEN');
      }

      // Check if token is expired (emergency tokens are short-lived: 1 hour)
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        throw new AppError('Emergency access token expired', 401, 'EMERGENCY_TOKEN_EXPIRED');
      }

      // Attach emergency information to request
      (req as any).emergencyId = decoded.emergencyId;
      (req as any).profileId = decoded.profileId;
      (req as any).requesterId = decoded.requesterId;
      (req as any).requesterRole = decoded.requesterRole;

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError('Emergency access token expired', 401, 'EMERGENCY_TOKEN_EXPIRED');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError('Invalid emergency token', 401, 'INVALID_EMERGENCY_TOKEN');
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Log medical data access for HIPAA compliance
 */
export const logMedicalAccess = (action: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userId = req.userId || (req as any).profileId;
    const accessedBy = req.userId || (req as any).requesterId;
    const role = (req as any).requesterRole || 'user';

    logger.info('Medical data access', {
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
      logger.info('Medical data access completed', {
        action,
        userId,
        statusCode: res.statusCode,
        hipaa: true,
      });
    });

    next();
  };
};
