/**
 * WebSocket Proxy for Communication Service
 *
 * Proxies WebSocket connections to Communication Service for real-time messaging
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
 * Setup WebSocket proxy for Communication Service
 */
export function setupCommunicationWebSocketProxy(httpServer: HTTPServer): void {
  const io = new SocketIOServer(httpServer, {
    path: '/ws/communication',
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
        logger.warn('Communication WebSocket rejected: No token provided');
        return next(new Error('Authentication required'));
      }

      // Verify JWT token
      const decoded = await verifyToken(token);

      if (!decoded || !decoded.userId) {
        logger.warn('Communication WebSocket rejected: Invalid token');
        return next(new Error('Invalid token'));
      }

      socket.userId = decoded.userId;
      logger.info(`Communication WebSocket authenticated for user: ${socket.userId}`);
      next();
    } catch (error) {
      logger.error('Communication WebSocket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`Communication WebSocket connected: ${socket.id} for user: ${socket.userId}`);

    // Create proxy connection to Communication Service
    const communicationServiceUrl = config.services.communication.url.replace(/^http/, 'ws');
    const proxySocket: ClientSocket = SocketIOClient(communicationServiceUrl, {
      path: '/ws',
      auth: {
        userId: socket.userId,
      },
      transports: ['websocket'],
    });

    // Forward client events to Communication Service
    socket.on('join-room', (data: { roomId: string }) => {
      logger.info(`User ${socket.userId} joining room ${data.roomId}`);
      socket.emergencyId = data.roomId;
      proxySocket.emit('join-room', {
        ...data,
        userId: socket.userId,
      });
    });

    socket.on('leave-room', (data: { roomId: string }) => {
      logger.info(`User ${socket.userId} leaving room ${data.roomId}`);
      proxySocket.emit('leave-room', {
        ...data,
        userId: socket.userId,
      });
      socket.emergencyId = undefined;
    });

    socket.on('send-message', (data: any) => {
      logger.debug(`Message from user ${socket.userId} in room ${socket.emergencyId}`);
      proxySocket.emit('send-message', {
        ...data,
        userId: socket.userId,
        roomId: socket.emergencyId,
      });
    });

    socket.on('typing-start', (data: { roomId: string }) => {
      logger.debug(`User ${socket.userId} started typing in room ${data.roomId}`);
      proxySocket.emit('typing-start', {
        ...data,
        userId: socket.userId,
      });
    });

    socket.on('typing-stop', (data: { roomId: string }) => {
      logger.debug(`User ${socket.userId} stopped typing in room ${data.roomId}`);
      proxySocket.emit('typing-stop', {
        ...data,
        userId: socket.userId,
      });
    });

    socket.on('mark-read', (data: { messageId: string; roomId: string }) => {
      logger.debug(`User ${socket.userId} marked message ${data.messageId} as read`);
      proxySocket.emit('mark-read', {
        ...data,
        userId: socket.userId,
      });
    });

    // Forward Communication Service events to client
    proxySocket.on('message-received', (data: any) => {
      logger.debug(`New message in room ${data.roomId}`);
      socket.emit('message-received', data);
    });

    proxySocket.on('message-sent', (data: any) => {
      logger.debug(`Message sent confirmation for ${data.messageId}`);
      socket.emit('message-sent', data);
    });

    proxySocket.on('message-delivered', (data: any) => {
      logger.debug(`Message delivered: ${data.messageId}`);
      socket.emit('message-delivered', data);
    });

    proxySocket.on('message-read', (data: any) => {
      logger.debug(`Message read: ${data.messageId}`);
      socket.emit('message-read', data);
    });

    proxySocket.on('user-typing', (data: any) => {
      logger.debug(`User ${data.userId} typing in room ${data.roomId}`);
      socket.emit('user-typing', data);
    });

    proxySocket.on('user-stopped-typing', (data: any) => {
      logger.debug(`User ${data.userId} stopped typing in room ${data.roomId}`);
      socket.emit('user-stopped-typing', data);
    });

    proxySocket.on('room-joined', (data: any) => {
      logger.info(`Successfully joined room ${data.roomId}`);
      socket.emit('room-joined', data);
    });

    proxySocket.on('room-left', (data: any) => {
      logger.info(`Successfully left room ${data.roomId}`);
      socket.emit('room-left', data);
    });

    proxySocket.on('error', (error: Error) => {
      logger.error('Communication Service WebSocket error:', error);
      socket.emit('error', { message: 'Communication service error' });
    });

    // Handle disconnection
    socket.on('disconnect', (reason: string) => {
      logger.info(`Communication WebSocket disconnected: ${socket.id}, reason: ${reason}`);
      proxySocket.disconnect();
    });

    proxySocket.on('disconnect', (reason: string) => {
      logger.warn(`Communication Service disconnected: ${reason}`);
      socket.emit('error', { message: 'Lost connection to communication service' });
    });

    // Handle proxy connection errors
    proxySocket.on('connect_error', (error: Error) => {
      logger.error('Failed to connect to Communication Service:', error);
      socket.emit('error', { message: 'Failed to connect to communication service' });
    });
  });

  logger.info('Communication WebSocket proxy initialized on /ws/communication');
}
