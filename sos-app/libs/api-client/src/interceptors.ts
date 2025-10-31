/**
 * Request and response interceptors for API client
 *
 * @packageDocumentation
 */

import type { ApiClientConfig, ApiErrorResponse } from './config';

/**
 * Axios-compatible request config
 */
export interface AxiosRequestConfig {
  url?: string;
  method?: string;
  baseURL?: string;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  data?: unknown;
  timeout?: number;
  withCredentials?: boolean;
  [key: string]: unknown;
}

/**
 * Axios-compatible response
 */
export interface AxiosResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: AxiosRequestConfig;
}

/**
 * Axios-compatible error
 */
export interface AxiosError<T = unknown> {
  config?: AxiosRequestConfig;
  code?: string;
  request?: unknown;
  response?: AxiosResponse<T>;
  isAxiosError: boolean;
  message: string;
}

/**
 * Request interceptor - adds authentication token
 */
export function authRequestInterceptor(
  config: AxiosRequestConfig,
  token?: string,
  tokenType = 'Bearer'
): AxiosRequestConfig {
  if (token && config.headers) {
    config.headers['Authorization'] = `${tokenType} ${token}`;
  }
  return config;
}

/**
 * Request interceptor - adds request ID for tracking
 */
export function requestIdInterceptor(config: AxiosRequestConfig): AxiosRequestConfig {
  if (config.headers) {
    config.headers['X-Request-ID'] = generateRequestId();
  }
  return config;
}

/**
 * Request interceptor - logs request details
 */
export function loggingRequestInterceptor(
  config: AxiosRequestConfig,
  logger?: { http: (message: string, meta?: Record<string, unknown>) => void }
): AxiosRequestConfig {
  if (logger) {
    logger.http('API Request', {
      method: config.method?.toUpperCase(),
      url: config.url,
      params: config.params,
      headers: sanitizeHeaders(config.headers),
    });
  }
  return config;
}

/**
 * Response interceptor - logs response details
 */
export function loggingResponseInterceptor<T>(
  response: AxiosResponse<T>,
  logger?: { http: (message: string, meta?: Record<string, unknown>) => void }
): AxiosResponse<T> {
  if (logger) {
    logger.http('API Response', {
      method: response.config.method?.toUpperCase(),
      url: response.config.url,
      status: response.status,
      statusText: response.statusText,
    });
  }
  return response;
}

/**
 * Response interceptor - transforms response data
 */
export function transformResponseInterceptor<T>(
  response: AxiosResponse<T>
): AxiosResponse<T> {
  // Unwrap nested data if API returns { data: { data: ... } }
  if (
    response.data &&
    typeof response.data === 'object' &&
    'data' in response.data &&
    'success' in response.data
  ) {
    return {
      ...response,
      data: (response.data as { data: T }).data,
    };
  }
  return response;
}

/**
 * Error interceptor - handles and formats errors
 */
export function errorHandlerInterceptor(
  error: AxiosError<ApiErrorResponse>,
  logger?: {
    error: (message: string, meta?: Record<string, unknown>) => void;
  }
): Promise<never> {
  // Log error
  if (logger) {
    logger.error('API Error', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      url: error.config?.url,
      method: error.config?.method,
      response: error.response?.data,
    });
  }

  // Transform error to standard format
  const apiError = transformError(error);

  // Reject with formatted error
  return Promise.reject(apiError);
}

/**
 * Transform axios error to API error format
 */
function transformError(error: AxiosError<ApiErrorResponse>): Error & {
  code?: string;
  statusCode?: number;
  response?: ApiErrorResponse;
} {
  // Network error
  if (!error.response) {
    const networkError = new Error('Network error. Please check your connection.') as Error & {
      code: string;
      statusCode: number;
    };
    networkError.code = 'NETWORK_ERROR';
    networkError.statusCode = 0;
    return networkError;
  }

  // HTTP error with API error response
  if (error.response.data) {
    const apiError = new Error(error.response.data.message || 'An error occurred') as Error & {
      code: string;
      statusCode: number;
      response: ApiErrorResponse;
    };
    apiError.code = error.response.data.code || 'API_ERROR';
    apiError.statusCode = error.response.status;
    apiError.response = error.response.data;
    return apiError;
  }

  // Generic HTTP error
  const httpError = new Error(error.message || 'Request failed') as Error & {
    code: string;
    statusCode: number;
  };
  httpError.code = 'HTTP_ERROR';
  httpError.statusCode = error.response.status;
  return httpError;
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sanitize headers for logging (remove sensitive data)
 */
function sanitizeHeaders(headers?: Record<string, string>): Record<string, string> {
  if (!headers) {
    return {};
  }

  const sanitized = { ...headers };
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];

  sensitiveHeaders.forEach((header) => {
    const key = Object.keys(sanitized).find(
      (k) => k.toLowerCase() === header.toLowerCase()
    );
    if (key) {
      sanitized[key] = '[REDACTED]';
    }
  });

  return sanitized;
}

/**
 * Check if error should be retried
 */
export function shouldRetry(
  error: AxiosError,
  attempt: number,
  maxAttempts: number,
  retryableStatusCodes: number[]
): boolean {
  // Don't retry if max attempts reached
  if (attempt >= maxAttempts) {
    return false;
  }

  // Don't retry if no response (network error) on last attempt
  if (!error.response && attempt === maxAttempts - 1) {
    return false;
  }

  // Retry on network errors
  if (!error.response) {
    return true;
  }

  // Retry on specific status codes
  return retryableStatusCodes.includes(error.response.status);
}

/**
 * Calculate retry delay with exponential backoff
 */
export function calculateRetryDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  multiplier: number
): number {
  const delay = baseDelay * Math.pow(multiplier, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * Create retry interceptor
 */
export function createRetryInterceptor(config: {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  multiplier: number;
  retryableStatusCodes: number[];
}) {
  return async function retryInterceptor(
    error: AxiosError,
    axiosInstance: any
  ): Promise<any> {
    const requestConfig = error.config as AxiosRequestConfig & { retryCount?: number };

    if (!requestConfig) {
      return Promise.reject(error);
    }

    requestConfig.retryCount = requestConfig.retryCount || 0;

    if (shouldRetry(error, requestConfig.retryCount, config.maxAttempts, config.retryableStatusCodes)) {
      requestConfig.retryCount += 1;

      const delay = calculateRetryDelay(
        requestConfig.retryCount,
        config.baseDelay,
        config.maxDelay,
        config.multiplier
      );

      await new Promise((resolve) => setTimeout(resolve, delay));

      return axiosInstance(requestConfig);
    }

    return Promise.reject(error);
  };
}
