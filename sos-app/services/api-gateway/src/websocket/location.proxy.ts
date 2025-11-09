/**
 * WebSocket Proxy for Location Service
 *
 * Proxies WebSocket connections to Location Service for real-time location updates
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { io as SocketIOClient, Socket as ClientSocket } from 'socket.io-client';
import config from '../config';
import logger from '../utils/logger';
import { verifyToken } from '../middleware/authMiddleware';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  emergencyId?: string;
}

/**
 * Setup WebSocket proxy for Location Service
 */
export function setupLocationWebSocketProxy(httpServer: HTTPServer): void {
  const io = new SocketIOServer(httpServer, {
    path: '/ws/location',
    cors: {
      origin: config.cors.origins,
      credentials: config.cors.credentials,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware for Socket.IO
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        logger.warn('WebSocket connection rejected: No token provided');
        return next(new Error('Authentication required'));
      }

      // Verify JWT token
      const decoded = await verifyToken(token);

      if (!decoded || !decoded.userId) {
        logger.warn('WebSocket connection rejected: Invalid token');
        return next(new Error('Invalid token'));
      }

      socket.userId = decoded.userId;
      logger.info(`WebSocket authenticated for user: ${socket.userId}`);
      next();
    } catch (error) {
      logger.error('WebSocket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`Location WebSocket connected: ${socket.id} for user: ${socket.userId}`);

    // Create proxy connection to Location Service
    const locationServiceUrl = config.services.location.url.replace(/^http/, 'ws');
    const proxySocket: ClientSocket = SocketIOClient(locationServiceUrl, {
      path: '/ws/location',
      auth: {
        userId: socket.userId,
      },
      transports: ['websocket'],
    });

    // Forward client messages to Location Service
    socket.on('join-emergency', (data: { emergencyId: string }) => {
      logger.info(`User ${socket.userId} joining emergency ${data.emergencyId}`);
      socket.emergencyId = data.emergencyId;
      proxySocket.emit('join-emergency', {
        ...data,
        userId: socket.userId,
      });
    });

    socket.on('leave-emergency', (data: { emergencyId: string }) => {
      logger.info(`User ${socket.userId} leaving emergency ${data.emergencyId}`);
      proxySocket.emit('leave-emergency', {
        ...data,
        userId: socket.userId,
      });
      socket.emergencyId = undefined;
    });

    socket.on('location-update', (data: any) => {
      logger.debug(`Location update from user ${socket.userId}`);
      proxySocket.emit('location-update', {
        ...data,
        userId: socket.userId,
        emergencyId: socket.emergencyId,
      });
    });

    // Forward Location Service messages to client
    proxySocket.on('location-updated', (data: any) => {
      logger.debug(`Location updated event for emergency ${data.emergencyId}`);
      socket.emit('location-updated', data);
    });

    proxySocket.on('contact-location-updated', (data: any) => {
      logger.debug(`Contact location updated for emergency ${data.emergencyId}`);
      socket.emit('contact-location-updated', data);
    });

    proxySocket.on('geofence-alert', (data: any) => {
      logger.info(`Geofence alert for emergency ${data.emergencyId}`);
      socket.emit('geofence-alert', data);
    });

    proxySocket.on('error', (error: Error) => {
      logger.error('Location Service WebSocket error:', error);
      socket.emit('error', { message: 'Location service error' });
    });

    // Handle disconnection
    socket.on('disconnect', (reason: string) => {
      logger.info(`Location WebSocket disconnected: ${socket.id}, reason: ${reason}`);
      proxySocket.disconnect();
    });

    proxySocket.on('disconnect', (reason: string) => {
      logger.warn(`Location Service disconnected: ${reason}`);
      socket.emit('error', { message: 'Lost connection to location service' });
    });

    // Handle proxy connection errors
    proxySocket.on('connect_error', (error: Error) => {
      logger.error('Failed to connect to Location Service:', error);
      socket.emit('error', { message: 'Failed to connect to location service' });
    });
  });

  logger.info('Location WebSocket proxy initialized on /ws/location');
}
