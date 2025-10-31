/**
 * Communication Service Entry Point
 * Real-time messaging and communication service for SOS App
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import redisService from './services/redis.service';
import { RoomHandler } from './handlers/room.handler';
import { authenticateSocket } from './middleware/auth.middleware';
import logger from './utils/logger';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3003;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'communication-service',
    timestamp: new Date().toISOString()
  });
});

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Apply authentication middleware to all Socket.IO connections
io.use(authenticateSocket);

// Initialize room handler
const roomHandler = new RoomHandler(io);

// Handle Socket.IO connections
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  // Register room handlers
  roomHandler.registerHandlers(socket as any);

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
  });

  // Handle connection errors
  socket.on('error', (error) => {
    logger.error(`Socket error for ${socket.id}:`, error);
  });
});

// Initialize services and start server
async function startServer() {
  try {
    // Connect to Redis
    await redisService.connect();
    logger.info('Redis connection established');

    // Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`Communication service listening on port ${PORT}`);
      logger.info(`WebSocket server ready for connections`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}, starting graceful shutdown`);

  try {
    // Close Socket.IO connections
    io.close(() => {
      logger.info('Socket.IO server closed');
    });

    // Close HTTP server
    httpServer.close(() => {
      logger.info('HTTP server closed');
    });

    // Disconnect from Redis
    await redisService.disconnect();
    logger.info('Redis disconnected');

    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start the server
startServer();

export { app, io, httpServer };
