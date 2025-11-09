/**
 * Common type definitions used across the SOS App platform
 *
 * @packageDocumentation
 */

/**
 * UUID string type (RFC 4122 compliant)
 * @example "550e8400-e29b-41d4-a716-446655440000"
 */
export type UUID = string;

/**
 * ISO 8601 timestamp string
 * @example "2025-10-28T10:30:00Z"
 */
export type Timestamp = string;

/**
 * Geographic coordinates
 */
export interface Location {
  /** Latitude in decimal degrees (-90 to 90) */
  latitude: number;
  /** Longitude in decimal degrees (-180 to 180) */
  longitude: number;
  /** Accuracy in meters */
  accuracy: number;
  /** Altitude in meters (optional) */
  altitude?: number;
  /** Speed in meters per second (optional) */
  speed?: number;
  /** Heading in degrees (0-360) (optional) */
  heading?: number;
  /** Reverse geocoded address (optional) */
  address?: string;
}

/**
 * Location provider type
 */
export enum LocationProvider {
  GPS = 'GPS',
  CELLULAR = 'CELLULAR',
  WIFI = 'WIFI',
  HYBRID = 'HYBRID',
}

/**
 * Emergency type categories
 */
export enum EmergencyType {
  MEDICAL = 'MEDICAL',
  FIRE = 'FIRE',
  POLICE = 'POLICE',
  GENERAL = 'GENERAL',
  FALL_DETECTED = 'FALL_DETECTED',
  DEVICE_ALERT = 'DEVICE_ALERT',
}

/**
 * Emergency status
 */
export enum EmergencyStatus {
  PENDING = 'PENDING',     // Countdown active
  ACTIVE = 'ACTIVE',       // Emergency confirmed
  CANCELLED = 'CANCELLED', // User cancelled during countdown
  RESOLVED = 'RESOLVED',   // Emergency resolved
}

/**
 * Priority levels for emergency contacts
 */
export enum ContactPriority {
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
  TERTIARY = 'TERTIARY',
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  /** Page number (1-indexed) */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Sort field */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  /** Array of items */
  data: T[];
  /** Pagination metadata */
  pagination: {
    /** Current page */
    page: number;
    /** Items per page */
    limit: number;
    /** Total number of items */
    total: number;
    /** Total number of pages */
    totalPages: number;
    /** Has next page */
    hasNext: boolean;
    /** Has previous page */
    hasPrevious: boolean;
  };
}

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  /** Response data */
  data: T;
  /** Success status */
  success: boolean;
  /** Response message */
  message?: string;
  /** Timestamp of response */
  timestamp: Timestamp;
}

/**
 * Standard API error response
 */
export interface ApiError {
  /** Error code */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Detailed error information */
  details?: string;
  /** Error metadata */
  metadata?: Record<string, unknown>;
  /** Timestamp of error */
  timestamp: Timestamp;
  /** Request ID for tracking */
  requestId?: string;
  /** Suggested actions for user */
  actions?: ErrorAction[];
}

/**
 * Suggested action for error recovery
 */
export interface ErrorAction {
  /** Action label */
  label: string;
  /** Action type */
  type: 'navigation' | 'action' | 'external';
  /** Target URL or endpoint */
  target: string;
}

/**
 * Blood type options
 */
export enum BloodType {
  A_POSITIVE = 'A+',
  A_NEGATIVE = 'A-',
  B_POSITIVE = 'B+',
  B_NEGATIVE = 'B-',
  AB_POSITIVE = 'AB+',
  AB_NEGATIVE = 'AB-',
  O_POSITIVE = 'O+',
  O_NEGATIVE = 'O-',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Notification channel types
 */
export enum NotificationChannel {
  PUSH = 'PUSH',
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  WEBSOCKET = 'WEBSOCKET',
}

/**
 * Notification status
 */
export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  RETRY = 'RETRY',
}

/**
 * Authentication provider types
 */
export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  APPLE = 'apple',
}

/**
 * User role types
 */
export enum UserRole {
  USER = 'USER',
  CONTACT = 'CONTACT',
  RESPONDER = 'RESPONDER',
  ADMIN = 'ADMIN',
}

/**
 * Generic filter options for list queries
 */
export interface FilterOptions {
  /** Start date for filtering */
  startDate?: Timestamp;
  /** End date for filtering */
  endDate?: Timestamp;
  /** Status filter */
  status?: string;
  /** Search query */
  search?: string;
  /** Additional custom filters */
  [key: string]: unknown;
}

/**
 * Time duration in various units
 */
export interface Duration {
  /** Milliseconds */
  milliseconds?: number;
  /** Seconds */
  seconds?: number;
  /** Minutes */
  minutes?: number;
  /** Hours */
  hours?: number;
  /** Days */
  days?: number;
}

/**
 * File upload metadata
 */
export interface FileMetadata {
  /** File name */
  filename: string;
  /** MIME type */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /** File URL */
  url: string;
  /** Thumbnail URL (for images/videos) */
  thumbnailUrl?: string;
  /** Upload timestamp */
  uploadedAt: Timestamp;
}
