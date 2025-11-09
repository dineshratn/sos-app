import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import config from './config';
import { connectDatabase, closeDatabaseConnection } from './config/database';
import logger from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app: Application = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS configuration
app.use(
  cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate limiting for HIPAA compliance (prevent brute force)
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware (HIPAA compliant - no PHI in logs)
app.use((req: Request, res: Response, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: (req as any).userId || 'anonymous',
    });
  });
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'medical-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    hipaaCompliant: true,
    encryption: {
      atRest: config.hipaa.encryptionAtRest,
      inTransit: config.hipaa.encryptionInTransit,
    },
  });
});

// Readiness check endpoint
app.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check database connection
    const { default: sequelize } = await import('./config/database');
    await sequelize.authenticate();

    res.json({
      status: 'ready',
      service: 'medical-service',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      service: 'medical-service',
      database: 'disconnected',
      error: (error as Error).message,
    });
  }
});

// API documentation endpoint
app.get('/api/v1', (req: Request, res: Response) => {
  res.json({
    service: 'Medical Service',
    version: '1.0.0',
    description: 'HIPAA-compliant medical information management',
    features: [
      'Encrypted medical profile storage',
      'Allergy tracking',
      'Medication management',
      'Medical condition tracking',
      'Emergency access for first responders',
      'Comprehensive audit logging',
    ],
    endpoints: {
      profile: '/api/v1/medical/profile',
      allergies: '/api/v1/medical/allergies',
      medications: '/api/v1/medical/medications',
      conditions: '/api/v1/medical/conditions',
      emergency: '/api/v1/medical/emergency/:userId',
      secureAccess: '/api/v1/medical/secure/:token',
      audit: '/api/v1/medical/audit',
    },
    compliance: {
      hipaa: true,
      encryption: 'AES-256-GCM',
      auditLogging: true,
      dataRetention: `${config.hipaa.dataRetentionDays} days`,
    },
    documentation: '/api/v1/docs',
  });
});

// API Routes
import medicalRoutes from './routes/medical.routes';
app.use('/api/v1/medical', medicalRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDatabase();

    // Start HTTP server
    const server = app.listen(config.port, () => {
      logger.info(`🏥 Medical Service listening on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`HIPAA Compliance: ✅ Enabled`);
      logger.info(`Encryption at Rest: ${config.hipaa.encryptionAtRest ? '✅' : '❌'}`);
      logger.info(`Encryption in Transit: ${config.hipaa.encryptionInTransit ? '✅' : '❌'}`);
      logger.info(`Audit Logging: ${config.audit.enabled ? '✅' : '❌'}`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, starting graceful shutdown`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await closeDatabaseConnection();
          logger.info('Database connection closed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
if (require.main === module) {
  startServer();
}

export default app;
