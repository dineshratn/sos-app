/**
 * Authentication Middleware
 * JWT token validation for Socket.IO connections
 */

import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import logger from '../utils/logger';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  userName?: string;
  userRole?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  role?: string;
  iat?: number;
  exp?: number;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Middleware to authenticate Socket.IO connections
 */
export const authenticateSocket = async (
  socket: AuthenticatedSocket,
  next: (err?: Error) => void
): Promise<void> => {
  try {
    // Get token from handshake auth or query
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token as string;

    if (!token) {
      logger.warn(`Authentication failed: No token provided for socket ${socket.id}`);
      return next(new Error('Authentication error: No token provided'));
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    // Attach user info to socket
    socket.userId = decoded.userId;
    socket.userName = decoded.name;
    socket.userRole = decoded.role || 'USER';

    logger.info(`Socket ${socket.id} authenticated as user ${decoded.userId}`);
    next();
  } catch (error) {
    logger.error('Socket authentication error:', error);

    if (error instanceof jwt.JsonWebTokenError) {
      return next(new Error('Authentication error: Invalid token'));
    }

    if (error instanceof jwt.TokenExpiredError) {
      return next(new Error('Authentication error: Token expired'));
    }

    return next(new Error('Authentication error'));
  }
};

/**
 * Verify user has permission to join emergency room
 */
export const authorizeEmergencyAccess = async (
  userId: string,
  emergencyId: string,
  role: string
): Promise<boolean> => {
  try {
    // In production, this would validate against the emergency service
    // Check if user is:
    // 1. The user who triggered the emergency
    // 2. An emergency contact
    // 3. A first responder with access
    // 4. An admin

    // For now, allow all authenticated users (placeholder)
    // TODO: Implement proper authorization check with emergency service
    logger.info(`Authorizing user ${userId} for emergency ${emergencyId} with role ${role}`);

    // Simulated authorization logic
    if (role === 'ADMIN') {
      return true;
    }

    // In real implementation, call emergency service to verify access
    // const hasAccess = await emergencyService.checkUserAccess(userId, emergencyId);
    // return hasAccess;

    return true; // Placeholder - allow all for now
  } catch (error) {
    logger.error('Authorization check failed:', error);
    return false;
  }
};

/**
 * Generate JWT token (utility for testing)
 */
export const generateToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};
