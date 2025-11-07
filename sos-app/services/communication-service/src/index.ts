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
import mongoDBConnection from './db/connection';
import kafkaService from './services/kafka.service';
import { setupSocketIOWithRedis, setupSocketIOMiddleware } from './websocket/socket.server';
import { RoomHandler } from './handlers/room.handler';
import { MessageHandler } from './websocket/handlers/message.handler';
import { TypingHandler } from './websocket/handlers/typing.handler';
import { ReceiptHandler } from './websocket/handlers/receipt.handler';
import { authenticateSocket } from './middleware/auth.middleware';
import messageRoutes from './routes/message.routes';
import mediaRoutes from './routes/media.routes';
import logger from './utils/logger';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3003;
const CORS_ORIGIN = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:3000'];

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true
}));
app.use(express.json());

// API Routes
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/media', mediaRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'communication-service',
    timestamp: new Date().toISOString(),
    mongodb: mongoDBConnection.isConnectedStatus(),
    redis: redisService.isConnected,
    kafka: kafkaService.isConnectedStatus()
  });
});

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO server with Redis adapter (will be setup in startServer)
let io: Server;

async function setupSocketIO() {
  io = await setupSocketIOWithRedis(httpServer, CORS_ORIGIN);
  setupSocketIOMiddleware(io);

  // Apply authentication middleware to all Socket.IO connections
  io.use(authenticateSocket);

  return io;
}

// Initialize services and start server
async function startServer() {
  try {
    // Connect to MongoDB
    await mongoDBConnection.connect();
    logger.info('MongoDB connection established');

    // Connect to Redis
    await redisService.connect();
    logger.info('Redis connection established');

    // Connect to Kafka
    try {
      await kafkaService.connect();
      logger.info('Kafka connection established');
    } catch (error) {
      logger.warn('Kafka connection failed, continuing without event publishing:', error);
    }

    // Setup Socket.IO with Redis adapter
    io = await setupSocketIO();
    logger.info('Socket.IO configured with Redis adapter');

    // Initialize handlers
    const roomHandler = new RoomHandler(io);
    const messageHandler = new MessageHandler(io);
    const typingHandler = new TypingHandler(io);
    const receiptHandler = new ReceiptHandler(io);

    // Handle Socket.IO connections
    io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Register all handlers
      roomHandler.registerHandlers(socket as any);
      messageHandler.registerHandlers(socket as any);
      typingHandler.registerHandlers(socket as any);
      receiptHandler.registerHandlers(socket as any);

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
      });

      // Handle connection errors
      socket.on('error', (error) => {
        logger.error(`Socket error for ${socket.id}:`, error);
      });
    });

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
    if (io) {
      io.close(() => {
        logger.info('Socket.IO server closed');
      });
    }

    // Close HTTP server
    httpServer.close(() => {
      logger.info('HTTP server closed');
    });

    // Disconnect from MongoDB
    await mongoDBConnection.disconnect();
    logger.info('MongoDB disconnected');

    // Disconnect from Redis
    await redisService.disconnect();
    logger.info('Redis disconnected');

    // Disconnect from Kafka
    await kafkaService.disconnect();
    logger.info('Kafka disconnected');

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
