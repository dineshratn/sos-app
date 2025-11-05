/**
 * Socket.IO Server Configuration with Redis Adapter
 * Task 126: Setup Socket.IO with Redis adapter for horizontal scaling
 */

import { Server, ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { Server as HTTPServer } from 'http';
import logger from '../utils/logger';

export async function setupSocketIOWithRedis(
  httpServer: HTTPServer,
  corsOrigin: string
): Promise<Server> {
  // Socket.IO configuration
  const socketOptions: Partial<ServerOptions> = {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    // Enable compression for better performance
    perMessageDeflate: {
      threshold: 1024
    },
    // Connection state recovery
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
      skipMiddlewares: true
    }
  };

  const io = new Server(httpServer, socketOptions);

  try {
    // Setup Redis adapter for horizontal scaling
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    // Create Redis clients for pub/sub
    const pubClient = createClient({ url: redisUrl });
    const subClient = pubClient.duplicate();

    // Handle Redis errors
    pubClient.on('error', (err) => {
      logger.error('Redis Pub Client Error:', err);
    });

    subClient.on('error', (err) => {
      logger.error('Redis Sub Client Error:', err);
    });

    // Connect Redis clients
    await Promise.all([pubClient.connect(), subClient.connect()]);

    logger.info('Redis pub/sub clients connected for Socket.IO adapter');

    // Attach Redis adapter to Socket.IO
    io.adapter(createAdapter(pubClient, subClient));

    logger.info('Socket.IO configured with Redis adapter for horizontal scaling');

    // Monitor adapter events
    io.of('/').adapter.on('create-room', (room) => {
      logger.debug(`Room created: ${room}`);
    });

    io.of('/').adapter.on('delete-room', (room) => {
      logger.debug(`Room deleted: ${room}`);
    });

    io.of('/').adapter.on('join-room', (room, id) => {
      logger.debug(`Socket ${id} joined room: ${room}`);
    });

    io.of('/').adapter.on('leave-room', (room, id) => {
      logger.debug(`Socket ${id} left room: ${room}`);
    });

  } catch (error) {
    logger.error('Failed to setup Redis adapter for Socket.IO:', error);
    logger.warn('Socket.IO will run without Redis adapter (no horizontal scaling)');
    // Continue without Redis adapter - single instance mode
  }

  return io;
}

export function setupSocketIOMiddleware(io: Server): void {
  // Add middleware for tracking socket connections
  io.use((socket, next) => {
    const sessionStart = Date.now();

    socket.on('disconnect', () => {
      const sessionDuration = Date.now() - sessionStart;
      logger.info(`Socket ${socket.id} session duration: ${sessionDuration}ms`);
    });

    next();
  });

  // Add error handler
  io.engine.on('connection_error', (err: any) => {
    logger.error('Socket.IO connection error:', {
      code: err.code,
      message: err.message,
      context: err.context
    });
  });
}
