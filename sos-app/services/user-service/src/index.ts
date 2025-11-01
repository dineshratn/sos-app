import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import config from './config';
import logger from './utils/logger';
import { connectDatabase, syncDatabase, closeDatabase } from './db';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app: Application = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: config.cors.origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: config.serviceName,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/health/startup', (req, res) => {
  res.json({
    status: 'started',
    service: config.serviceName,
    version: '1.0.0',
  });
});

app.get('/health/ready', async (req, res) => {
  try {
    res.json({
      status: 'ready',
      service: config.serviceName,
      version: '1.0.0',
      database: 'connected',
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      service: config.serviceName,
      error: 'Database connection failed',
    });
  }
});

app.get('/health/live', (req, res) => {
  res.json({
    status: 'alive',
    service: config.serviceName,
    version: '1.0.0',
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: config.serviceName,
    version: '1.0.0',
    description: 'SOS App User Service - Profile & Emergency Contact Management',
    endpoints: {
      health: '/health',
      startup: '/health/startup',
      ready: '/health/ready',
      live: '/health/live',
      api: '/api/v1',
    },
    documentation: '/api/v1/docs',
  });
});

// API Routes
import userRoutes from './routes/user.routes';
import contactRoutes from './routes/contacts.routes';

app.use('/api/v1/users', userRoutes);
app.use('/api/v1/contacts', contactRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, starting graceful shutdown...`);

  try {
    // Close database connection
    await closeDatabase();

    logger.info('All connections closed. Exiting process.');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Sync database models (in development)
    if (config.nodeEnv === 'development') {
      await syncDatabase(false);
    }

    // Start listening
    app.listen(config.port, '0.0.0.0', () => {
      logger.info(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   👤  SOS App User Service                               ║
║                                                           ║
║   Environment: ${config.nodeEnv.padEnd(42)}║
║   Port: ${config.port.toString().padEnd(50)}║
║   Database: ${config.database.name.padEnd(45)}║
║                                                           ║
║   Health: http://localhost:${config.port}/health         ║
║   API: http://localhost:${config.port}/api/v1            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;
