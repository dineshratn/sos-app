import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import config from './config';
import logger from './utils/logger';
import httpClient from './utils/httpClient';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { globalRateLimiter } from './middleware/rateLimiter';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import emergencyRoutes from './routes/emergency.routes';
import locationRoutes from './routes/location.routes';
import notificationRoutes from './routes/notification.routes';
import communicationRoutes from './routes/communication.routes';

const app: Application = express();

// ==================== Security Middleware ====================

app.use(helmet({
  contentSecurityPolicy: false, // Disable for API gateway
  crossOriginEmbedderPolicy: false,
}));

// ==================== CORS Configuration ====================

app.use(cors({
  origin: config.cors.origins,
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-ID', 'X-Device-Name', 'X-Device-Type'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400, // 24 hours
}));

// ==================== Request Processing Middleware ====================

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  }));
}

// Request ID and logging middleware
app.use((req: Request, res: Response, next) => {
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.headers['x-request-id'] = requestId as string;

  logger.info(`${req.method} ${req.path}`, {
    requestId,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: (req as any).user?.userId,
  });

  next();
});

// ==================== Rate Limiting ====================

app.use('/api/', globalRateLimiter);

// ==================== Health Check Endpoints ====================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: config.serviceName,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/health/startup', (req: Request, res: Response) => {
  res.json({
    status: 'started',
    service: config.serviceName,
    version: '1.0.0',
  });
});

app.get('/health/ready', async (req: Request, res: Response) => {
  try {
    // Check if all services are reachable (simple ping)
    const serviceChecks = await Promise.allSettled([
      httpClient.get('auth', '/health').catch(() => ({ status: 'down' })),
      httpClient.get('user', '/health').catch(() => ({ status: 'down' })),
      httpClient.get('emergency', '/health').catch(() => ({ status: 'down' })),
      httpClient.get('location', '/health').catch(() => ({ status: 'down' })),
      httpClient.get('notification', '/health').catch(() => ({ status: 'down' })),
      httpClient.get('communication', '/health').catch(() => ({ status: 'down' })),
    ]);

    const services = {
      auth: serviceChecks[0].status === 'fulfilled' ? 'up' : 'down',
      user: serviceChecks[1].status === 'fulfilled' ? 'up' : 'down',
      emergency: serviceChecks[2].status === 'fulfilled' ? 'up' : 'down',
      location: serviceChecks[3].status === 'fulfilled' ? 'up' : 'down',
      notification: serviceChecks[4].status === 'fulfilled' ? 'up' : 'down',
      communication: serviceChecks[5].status === 'fulfilled' ? 'up' : 'down',
    };

    const allServicesUp = Object.values(services).every((status) => status === 'up');

    res.status(allServicesUp ? 200 : 503).json({
      status: allServicesUp ? 'ready' : 'degraded',
      service: config.serviceName,
      version: '1.0.0',
      services,
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      service: config.serviceName,
      error: 'Failed to check service health',
    });
  }
});

app.get('/health/live', (req: Request, res: Response) => {
  res.json({
    status: 'alive',
    service: config.serviceName,
    version: '1.0.0',
  });
});

// Circuit breaker status endpoint
app.get('/health/circuit-breakers', (req: Request, res: Response) => {
  const states = httpClient.getAllCircuitBreakerStates();

  res.json({
    circuitBreakers: states,
    timestamp: new Date().toISOString(),
  });
});

// ==================== Root Endpoint ====================

app.get('/', (req: Request, res: Response) => {
  res.json({
    service: config.serviceName,
    version: '1.0.0',
    description: 'SOS App API Gateway - Central entry point for all microservices',
    endpoints: {
      health: '/health',
      startup: '/health/startup',
      ready: '/health/ready',
      live: '/health/live',
      circuitBreakers: '/health/circuit-breakers',
      api: '/api/v1',
    },
    services: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      emergencies: '/api/v1/emergencies',
      locations: '/api/v1/locations',
      notifications: '/api/v1/notifications',
      communications: '/api/v1/communications',
    },
    documentation: '/api/v1/docs',
  });
});

// ==================== API Routes ====================

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/emergencies', emergencyRoutes);
app.use('/api/v1/locations', locationRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/communications', communicationRoutes);

// ==================== Error Handling ====================

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// ==================== Graceful Shutdown ====================

const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, starting graceful shutdown...`);

  try {
    // Close Redis connection
    const { redisClient } = await import('./middleware/rateLimiter');
    await redisClient.quit();

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

// ==================== Start Server ====================

const startServer = async () => {
  try {
    app.listen(config.port, '0.0.0.0', () => {
      logger.info(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🌐  SOS App API Gateway                                ║
║                                                           ║
║   Environment: ${config.nodeEnv.padEnd(42)}║
║   Port: ${config.port.toString().padEnd(50)}║
║                                                           ║
║   Health: http://localhost:${config.port}/health         ║
║   API: http://localhost:${config.port}/api/v1            ║
║                                                           ║
║   Services:                                               ║
║   - Auth: ${config.services.auth.url.padEnd(46)}║
║   - User: ${config.services.user.url.padEnd(46)}║
║   - Emergency: ${config.services.emergency.url.padEnd(43)}║
║   - Location: ${config.services.location.url.padEnd(44)}║
║   - Notification: ${config.services.notification.url.padEnd(40)}║
║   - Communication: ${config.services.communication.url.padEnd(39)}║
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
