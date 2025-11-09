import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';
import mongoose from 'mongoose';
import { config } from './config';
import { logger } from './utils/logger';
import { webhookRoutes } from './routes/webhook.routes';
import { startKafkaConsumer } from './kafka/consumer';
import { initializeNotificationWorker } from './workers/notification.worker';

class NotificationService {
  private app: Application;

  constructor() {
    this.app = express();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet());

    // CORS configuration
    this.app.use(cors({
      origin: config.server.env === 'production'
        ? ['https://sos-app.com', 'https://admin.sos-app.com']
        : '*',
      credentials: true,
    }));

    // Compression
    this.app.use(compression() as any);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Request logging
    this.app.use((req: Request, _res: Response, next: NextFunction) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      next();
    });
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (_req: Request, res: Response) => {
      res.status(200).json({
        status: 'healthy',
        service: 'notification-service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // API routes
    this.app.use('/api/v1/webhooks', webhookRoutes);

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'The requested resource was not found',
          path: req.path,
        },
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
      logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
      });

      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: config.server.env === 'production'
            ? 'An unexpected error occurred'
            : err.message,
          timestamp: new Date().toISOString(),
        },
      });
    });
  }

  private async connectDatabase(): Promise<void> {
    try {
      await mongoose.connect(config.mongodb.uri, {
        maxPoolSize: config.mongodb.maxPoolSize,
      });
      logger.info('Connected to MongoDB', { uri: config.mongodb.uri });
    } catch (error) {
      logger.error('MongoDB connection failed', { error });
      throw error;
    }
  }

  public async start(): Promise<void> {
    try {
      // Connect to MongoDB
      await this.connectDatabase();

      // Initialize notification worker
      await initializeNotificationWorker();
      logger.info('Notification worker initialized');

      // Start Kafka consumer
      await startKafkaConsumer();
      logger.info('Kafka consumer started');

      // Start HTTP server
      const port = config.server.port;
      this.app.listen(port, () => {
        logger.info(`Notification Service listening on port ${port}`, {
          env: config.server.env,
        });
      });
    } catch (error) {
      logger.error('Failed to start Notification Service', { error });
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    try {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', { error });
      process.exit(1);
    }
  }
}

// Create and start service
const notificationService = new NotificationService();

// Handle shutdown signals
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, starting graceful shutdown');
  notificationService.stop();
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, starting graceful shutdown');
  notificationService.stop();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  notificationService.stop();
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled rejection', { reason });
  notificationService.stop();
});

// Start the service
notificationService.start();

export { notificationService };
