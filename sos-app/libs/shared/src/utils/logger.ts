/**
 * Logger utility using Winston for structured logging
 *
 * @packageDocumentation
 */

/**
 * Log levels
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  VERBOSE = 'verbose',
  DEBUG = 'debug',
  SILLY = 'silly',
}

/**
 * Logger interface
 */
export interface ILogger {
  error(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  http(message: string, meta?: Record<string, unknown>): void;
  verbose(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
  silly(message: string, meta?: Record<string, unknown>): void;
}

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  /** Service name */
  service: string;
  /** Log level */
  level?: LogLevel;
  /** Enable console logging */
  console?: boolean;
  /** Enable file logging */
  file?: boolean;
  /** File path for logs */
  filePath?: string;
  /** Environment (development, production, test) */
  environment?: string;
}

/**
 * Simple logger implementation
 *
 * Note: This is a basic implementation. In production, replace with Winston.
 * Winston is not included as a dependency to keep the shared library lightweight.
 * Services should implement their own Winston logger based on this interface.
 */
export class Logger implements ILogger {
  private static instances: Map<string, Logger> = new Map();
  private service: string;
  private level: LogLevel;
  private environment: string;

  private constructor(config: LoggerConfig) {
    this.service = config.service;
    this.level = config.level || LogLevel.INFO;
    this.environment = config.environment || process.env['NODE_ENV'] || 'development';
  }

  /**
   * Get logger instance for a service (singleton pattern)
   */
  public static getInstance(service: string, config?: Partial<LoggerConfig>): Logger {
    if (!Logger.instances.has(service)) {
      Logger.instances.set(service, new Logger({ service, ...config }));
    }
    return Logger.instances.get(service)!;
  }

  /**
   * Check if a log level should be logged based on configured level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = Object.values(LogLevel);
    const configuredLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= configuredLevelIndex;
  }

  /**
   * Format log message
   */
  private formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const metaString = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${this.service}] ${message}${metaString}`;
  }

  /**
   * Log a message
   */
  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, meta);

    // In development, use colored console output
    if (this.environment === 'development') {
      switch (level) {
        case LogLevel.ERROR:
          console.error(formattedMessage);
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage);
          break;
        case LogLevel.DEBUG:
        case LogLevel.VERBOSE:
        case LogLevel.SILLY:
          console.debug(formattedMessage);
          break;
        default:
          console.log(formattedMessage);
      }
    } else {
      // In production, use console.log for all levels (captured by logging infrastructure)
      console.log(formattedMessage);
    }
  }

  /**
   * Log error message
   */
  public error(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, meta);
  }

  /**
   * Log warning message
   */
  public warn(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, meta);
  }

  /**
   * Log info message
   */
  public info(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, meta);
  }

  /**
   * Log HTTP request message
   */
  public http(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.HTTP, message, meta);
  }

  /**
   * Log verbose message
   */
  public verbose(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.VERBOSE, message, meta);
  }

  /**
   * Log debug message
   */
  public debug(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  /**
   * Log silly/trace message
   */
  public silly(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.SILLY, message, meta);
  }

  /**
   * Create a child logger with additional context
   */
  public child(context: Record<string, unknown>): ChildLogger {
    return new ChildLogger(this, context);
  }
}

/**
 * Child logger with additional context
 */
export class ChildLogger implements ILogger {
  constructor(
    private parent: Logger,
    private context: Record<string, unknown>
  ) {}

  private mergeContext(meta?: Record<string, unknown>): Record<string, unknown> {
    return { ...this.context, ...meta };
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.parent.error(message, this.mergeContext(meta));
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.parent.warn(message, this.mergeContext(meta));
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.parent.info(message, this.mergeContext(meta));
  }

  http(message: string, meta?: Record<string, unknown>): void {
    this.parent.http(message, this.mergeContext(meta));
  }

  verbose(message: string, meta?: Record<string, unknown>): void {
    this.parent.verbose(message, this.mergeContext(meta));
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.parent.debug(message, this.mergeContext(meta));
  }

  silly(message: string, meta?: Record<string, unknown>): void {
    this.parent.silly(message, this.mergeContext(meta));
  }
}

/**
 * Create a logger instance
 *
 * @example
 * ```typescript
 * const logger = createLogger('auth-service');
 * logger.info('User logged in', { userId: '123' });
 * ```
 */
export function createLogger(service: string, config?: Partial<LoggerConfig>): Logger {
  return Logger.getInstance(service, config);
}
