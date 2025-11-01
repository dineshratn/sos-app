import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import config from '../config';
import logger from '../utils/logger';

export interface JWTPayload {
  userId: string;
  email?: string;
  username?: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

// Load JWT public key for token verification
let publicKey: string;

try {
  publicKey = fs.readFileSync(config.jwt.publicKeyPath, 'utf8');
} catch (error) {
  logger.warn('JWT public key not found, using fallback for development', { error });
  // Fallback for development - in production, this should fail
  publicKey = process.env.JWT_PUBLIC_KEY || '';
}

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): Promise<JWTPayload> => {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      publicKey,
      {
        algorithms: [config.jwt.algorithm as jwt.Algorithm],
      },
      (err, decoded) => {
        if (err) {
          return reject(err);
        }
        resolve(decoded as JWTPayload);
      }
    );
  });
};

/**
 * Authentication middleware for Express routes
 */
export const authenticateRequest = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header',
        },
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    const payload = await verifyToken(token);
    req.user = payload;

    next();
  } catch (error: any) {
    logger.error('Authentication failed', {
      error: error.message,
      path: req.path,
    });

    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      },
    });
  }
};

/**
 * Verify socket token (used by Socket.IO)
 */
export const verifySocketToken = async (token: string): Promise<JWTPayload> => {
  try {
    return await verifyToken(token);
  } catch (error: any) {
    logger.error('Socket token verification failed', { error: error.message });
    throw new Error('Invalid or expired token');
  }
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = await verifyToken(token);
      req.user = payload;
    }

    next();
  } catch (error) {
    // Ignore authentication errors in optional auth
    next();
  }
};

export default {
  authenticateRequest,
  verifySocketToken,
  optionalAuth,
  verifyToken,
};
