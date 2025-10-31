/**
 * @sos-app/api-client
 *
 * HTTP API client library for SOS App with Axios integration,
 * request/response interceptors, error handling, and retry logic.
 *
 * @packageDocumentation
 */

// Export configuration types and defaults
export * from './config';

// Export interceptors
export * from './interceptors';

// Export API client
export * from './client';

// Export typed API endpoints
export * from './endpoints';

// Library version
export const VERSION = '1.0.0';
