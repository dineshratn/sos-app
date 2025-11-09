/**
 * API client configuration
 *
 * @packageDocumentation
 */

/**
 * API client configuration options
 */
export interface ApiClientConfig {
  /** Base URL for API requests */
  baseURL: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Enable request/response logging */
  enableLogging?: boolean;
  /** Enable automatic retries */
  enableRetry?: boolean;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Retry delay in milliseconds */
  retryDelay?: number;
  /** Custom headers to include in all requests */
  headers?: Record<string, string>;
  /** Authentication token */
  token?: string;
  /** Token type (default: 'Bearer') */
  tokenType?: string;
  /** Enable credentials (cookies) */
  withCredentials?: boolean;
}

/**
 * Default API client configuration
 */
export const defaultConfig: ApiClientConfig = {
  baseURL: process.env.API_BASE_URL || 'http://localhost:3000/api/v1',
  timeout: 30000, // 30 seconds
  enableLogging: process.env.NODE_ENV === 'development',
  enableRetry: true,
  maxRetries: 3,
  retryDelay: 1000,
  tokenType: 'Bearer',
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

/**
 * Merge configurations
 */
export function mergeConfig(
  base: ApiClientConfig,
  override?: Partial<ApiClientConfig>
): ApiClientConfig {
  if (!override) {
    return base;
  }

  return {
    ...base,
    ...override,
    headers: {
      ...base.headers,
      ...override.headers,
    },
  };
}

/**
 * HTTP methods
 */
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

/**
 * Request configuration
 */
export interface RequestConfig {
  /** HTTP method */
  method?: HttpMethod;
  /** Request headers */
  headers?: Record<string, string>;
  /** Request parameters (query string) */
  params?: Record<string, unknown>;
  /** Request body */
  data?: unknown;
  /** Request timeout */
  timeout?: number;
  /** Retry configuration */
  retry?: {
    enabled: boolean;
    maxAttempts: number;
    delay: number;
  };
}

/**
 * Response data wrapper
 */
export interface ApiResponse<T = unknown> {
  /** Response data */
  data: T;
  /** HTTP status code */
  status: number;
  /** Status text */
  statusText: string;
  /** Response headers */
  headers: Record<string, string>;
}

/**
 * Error response
 */
export interface ApiErrorResponse {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Error details */
  details?: string;
  /** Error metadata */
  metadata?: Record<string, unknown>;
  /** Timestamp */
  timestamp: string;
  /** Request ID */
  requestId?: string;
  /** Suggested actions */
  actions?: Array<{
    label: string;
    type: string;
    target: string;
  }>;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum retry attempts */
  maxAttempts: number;
  /** Initial delay in milliseconds */
  initialDelay: number;
  /** Maximum delay in milliseconds */
  maxDelay: number;
  /** Backoff multiplier */
  multiplier: number;
  /** HTTP status codes that should trigger retry */
  retryableStatusCodes: number[];
}

/**
 * Default retry configuration
 */
export const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  multiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};
