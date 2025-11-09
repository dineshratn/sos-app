import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import config from '../config';
import logger from '../utils/logger';
import { verifySocketToken } from '../middleware/auth.middleware';

// Import handlers
import { handleJoinRoom, handleLeaveRoom } from './handlers/room.handler';
import { handleSendMessage } from './handlers/message.handler';
import { handleTypingStart, handleTypingStop } from './handlers/typing.handler';
import { handleMessageDelivered, handleMessageRead } from './handlers/receipt.handler';

let io: Server;

/**
 * Initialize Socket.IO server with Redis adapter for horizontal scaling
 */
export const initializeSocketServer = async (httpServer: HTTPServer): Promise<Server> => {
  // Create Socket.IO server
  io = new Server(httpServer, {
    cors: {
      origin: config.server.corsOrigin,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  try {
    // Set up Redis adapter for multi-server support
    const pubClient = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      password: config.redis.password,
    });

    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    io.adapter(createAdapter(pubClient, subClient));

    logger.info('Socket.IO Redis adapter initialized', {
      host: config.redis.host,
      port: config.redis.port,
    });

    // Redis error handlers
    pubClient.on('error', (err) => {
      logger.error('Redis pub client error', { error: err });
    });

    subClient.on('error', (err) => {
      logger.error('Redis sub client error', { error: err });
    });

  } catch (error) {
    logger.error('Failed to initialize Redis adapter', { error });
    logger.warn('Socket.IO running without Redis adapter - not suitable for production');
  }

  // Authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const user = await verifySocketToken(token);
      socket.data.user = user;

      logger.info('Socket authenticated', {
        socketId: socket.id,
        userId: user.userId,
        username: user.username,
      });

      next();
    } catch (error: any) {
      logger.error('Socket authentication failed', {
        socketId: socket.id,
        error: error.message,
      });
      next(new Error('Authentication failed'));
    }
  });

  // Connection event handler
  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;

    logger.info('Client connected', {
      socketId: socket.id,
      userId: user.userId,
      username: user.username,
    });

    // Room management
    socket.on('room:join', (data) => handleJoinRoom(io, socket, data));
    socket.on('room:leave', (data) => handleLeaveRoom(io, socket, data));

    // Message events
    socket.on('message:send', (data) => handleSendMessage(io, socket, data));

    // Typing indicators
    socket.on('typing:start', (data) => handleTypingStart(io, socket, data));
    socket.on('typing:stop', (data) => handleTypingStop(io, socket, data));

    // Message receipts
    socket.on('message:delivered', (data) => handleMessageDelivered(io, socket, data));
    socket.on('message:read', (data) => handleMessageRead(io, socket, data));

    // Disconnection
    socket.on('disconnect', (reason) => {
      logger.info('Client disconnected', {
        socketId: socket.id,
        userId: user.userId,
        reason,
      });
    });

    // Error handling
    socket.on('error', (error) => {
      logger.error('Socket error', {
        socketId: socket.id,
        userId: user.userId,
        error,
      });
    });
  });

  logger.info('Socket.IO server initialized successfully');

  return io;
};

/**
 * Get Socket.IO instance
 */
export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocketServer first.');
  }
  return io;
};

/**
 * Broadcast event to all clients in a room
 */
export const broadcastToRoom = (room: string, event: string, data: any): void => {
  if (io) {
    io.to(room).emit(event, data);
    logger.debug('Broadcasting to room', { room, event });
  }
};

/**
 * Broadcast event to specific socket
 */
export const emitToSocket = (socketId: string, event: string, data: any): void => {
  if (io) {
    io.to(socketId).emit(event, data);
    logger.debug('Emitting to socket', { socketId, event });
  }
};

/**
 * Get connected clients count in a room
 */
export const getRoomSize = async (room: string): Promise<number> => {
  if (!io) return 0;
  const sockets = await io.in(room).fetchSockets();
  return sockets.length;
};

/**
 * Get all connected sockets in a room
 */
export const getRoomSockets = async (room: string): Promise<Socket[]> => {
  if (!io) return [];
  return await io.in(room).fetchSockets();
};

export default io;
