import express, { Express, Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { connectMongoDB } from './db/mongodb';
import { initializeSocketServer } from './websocket/socket.server';
import config from './config';
import logger from './utils/logger';

// Routes (will be added in subsequent tasks)
import messageRoutes from './routes/message.routes';
import mediaRoutes from './routes/media.routes';

const app: Express = express();
const server = http.createServer(app);

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.server.corsOrigin,
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'communication-service',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/media', mediaRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Resource not found',
      path: req.path,
    },
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: config.server.env === 'production' ? 'An unexpected error occurred' : err.message,
    },
  });
});

// Initialize server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectMongoDB();

    // Initialize Socket.IO server
    initializeSocketServer(server);

    // Start HTTP server
    server.listen(config.server.port, () => {
      logger.info('Communication Service started', {
        port: config.server.port,
        env: config.server.env,
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down Communication Service...');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the server
startServer();

export { app, server };
