/**
 * Error handling and formatting utilities
 *
 * @packageDocumentation
 */

import type { ApiError, ErrorAction } from '../types/common';

/**
 * Base application error
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: string,
    public metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: string, metadata?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details, metadata);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', details?: string) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied', details?: string) {
    super(message, 'AUTHORIZATION_ERROR', 403, details);
    this.name = 'AuthorizationError';
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict error
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: string) {
    super(message, 'CONFLICT', 409, details);
    this.name = 'ConflictError';
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, undefined, { retryAfter });
    this.name = 'RateLimitError';
  }
}

/**
 * Service unavailable error
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable', details?: string) {
    super(message, 'SERVICE_UNAVAILABLE', 503, details);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Database error
 */
export class DatabaseError extends AppError {
  constructor(message: string, details?: string) {
    super(message, 'DATABASE_ERROR', 500, details);
    this.name = 'DatabaseError';
  }
}

/**
 * External service error
 */
export class ExternalServiceError extends AppError {
  constructor(serviceName: string, message: string, details?: string) {
    super(`${serviceName}: ${message}`, 'EXTERNAL_SERVICE_ERROR', 502, details);
    this.name = 'ExternalServiceError';
  }
}

/**
 * Emergency-specific errors
 */
export class EmergencyAlreadyActiveError extends AppError {
  constructor(emergencyId: string) {
    super(
      'You have an active emergency',
      'EMERGENCY_ALREADY_ACTIVE',
      409,
      `Emergency ID: ${emergencyId} is already active for this user`,
      { emergencyId }
    );
    this.name = 'EmergencyAlreadyActiveError';
  }
}

/**
 * Format error as API error response
 *
 * @param error - Error to format
 * @param requestId - Optional request ID for tracking
 * @returns Formatted API error
 */
export function formatApiError(error: Error | AppError, requestId?: string): ApiError {
  const timestamp = new Date().toISOString();

  // Handle AppError instances
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
      metadata: error.metadata,
      timestamp,
      requestId,
    };
  }

  // Handle generic errors
  return {
    code: 'INTERNAL_SERVER_ERROR',
    message: error.message || 'An unexpected error occurred',
    timestamp,
    requestId,
  };
}

/**
 * Create error with suggested actions
 *
 * @param error - Base error
 * @param actions - Suggested actions
 * @returns API error with actions
 */
export function createErrorWithActions(
  error: Error | AppError,
  actions: ErrorAction[]
): ApiError {
  const apiError = formatApiError(error);
  return {
    ...apiError,
    actions,
  };
}

/**
 * Check if error is operational (expected) or programming error
 *
 * @param error - Error to check
 * @returns True if operational error
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return true;
  }
  return false;
}

/**
 * Extract error message from various error types
 *
 * @param error - Error object
 * @returns Error message string
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }

  return 'An unknown error occurred';
}

/**
 * Extract error stack trace safely
 *
 * @param error - Error object
 * @returns Stack trace or undefined
 */
export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  return undefined;
}

/**
 * Log error with context
 *
 * @param error - Error to log
 * @param context - Additional context
 * @returns Formatted error info for logging
 */
export function formatErrorForLogging(
  error: Error | AppError,
  context?: Record<string, unknown>
): Record<string, unknown> {
  const errorInfo: Record<string, unknown> = {
    message: error.message,
    name: error.name,
    stack: error.stack,
  };

  if (error instanceof AppError) {
    errorInfo.code = error.code;
    errorInfo.statusCode = error.statusCode;
    errorInfo.details = error.details;
    errorInfo.metadata = error.metadata;
  }

  if (context) {
    errorInfo.context = context;
  }

  return errorInfo;
}

/**
 * Wrap async function with error handling
 *
 * @param fn - Async function to wrap
 * @returns Wrapped function that catches errors
 */
export function asyncErrorHandler<T extends (...args: any[]) => Promise<any>>(
  fn: T
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (error) {
      // Re-throw AppError instances
      if (error instanceof AppError) {
        throw error;
      }

      // Wrap other errors
      throw new AppError(
        getErrorMessage(error),
        'UNHANDLED_ERROR',
        500,
        getErrorStack(error)
      );
    }
  };
}

/**
 * Retry async function with exponential backoff
 *
 * @param fn - Function to retry
 * @param maxRetries - Maximum retry attempts
 * @param initialDelay - Initial delay in milliseconds
 * @param maxDelay - Maximum delay in milliseconds
 * @returns Result of function or throws error
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000,
  maxDelay = 30000
): Promise<T> {
  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on operational errors (client errors)
      if (error instanceof AppError && error.statusCode >= 400 && error.statusCode < 500) {
        throw error;
      }

      // Last attempt, throw error
      if (attempt === maxRetries) {
        break;
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Exponential backoff
      delay = Math.min(delay * 2, maxDelay);
    }
  }

  throw lastError!;
}

/**
 * Common error codes
 */
export const ErrorCodes = {
  // Authentication & Authorization
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Resource
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Service
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',

  // Emergency
  EMERGENCY_ALREADY_ACTIVE: 'EMERGENCY_ALREADY_ACTIVE',
  EMERGENCY_NOT_FOUND: 'EMERGENCY_NOT_FOUND',
  NO_EMERGENCY_CONTACTS: 'NO_EMERGENCY_CONTACTS',

  // Generic
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  UNHANDLED_ERROR: 'UNHANDLED_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
