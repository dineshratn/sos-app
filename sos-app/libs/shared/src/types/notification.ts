/**
 * Notification and alerting type definitions
 *
 * @packageDocumentation
 */

import type { UUID, Timestamp, NotificationChannel, NotificationStatus } from './common';
import type { EmergencyType, Location } from './common';

/**
 * Notification types
 */
export enum NotificationType {
  EMERGENCY_ALERT = 'EMERGENCY_ALERT',
  LOCATION_UPDATE = 'LOCATION_UPDATE',
  CONTACT_ACKNOWLEDGED = 'CONTACT_ACKNOWLEDGED',
  EMERGENCY_RESOLVED = 'EMERGENCY_RESOLVED',
  EMERGENCY_CANCELLED = 'EMERGENCY_CANCELLED',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  DEVICE_ALERT = 'DEVICE_ALERT',
  SYSTEM_NOTIFICATION = 'SYSTEM_NOTIFICATION',
}

/**
 * Notification record
 */
export interface Notification {
  /** Notification ID */
  id: UUID;
  /** Batch ID (for grouped notifications) */
  batchId?: UUID;
  /** Emergency ID (if applicable) */
  emergencyId?: UUID;
  /** Recipient ID */
  recipientId: UUID;
  /** Recipient name */
  recipientName: string;
  /** Recipient contact (phone/email) */
  recipientContact: string;
  /** Notification channel */
  channel: NotificationChannel;
  /** Notification type */
  type: NotificationType;
  /** Notification status */
  status: NotificationStatus;
  /** Subject/title */
  subject: string;
  /** Message content */
  content: string;
  /** Notification data/payload */
  data?: Record<string, unknown>;
  /** Sent timestamp */
  sentAt?: Timestamp;
  /** Delivered timestamp */
  deliveredAt?: Timestamp;
  /** Failed timestamp */
  failedAt?: Timestamp;
  /** Failure reason */
  failureReason?: string;
  /** Retry count */
  retryCount: number;
  /** Maximum retry attempts */
  maxRetries: number;
  /** Creation timestamp */
  createdAt: Timestamp;
}

/**
 * Notification batch (group of related notifications)
 */
export interface NotificationBatch {
  /** Batch ID */
  batchId: UUID;
  /** Emergency ID */
  emergencyId?: UUID;
  /** Notification type */
  type: NotificationType;
  /** Notifications in batch */
  notifications: Notification[];
  /** Total count */
  totalCount: number;
  /** Success count */
  successCount: number;
  /** Failed count */
  failedCount: number;
  /** Pending count */
  pendingCount: number;
  /** Batch creation timestamp */
  createdAt: Timestamp;
  /** Batch completion timestamp */
  completedAt?: Timestamp;
}

/**
 * Push notification payload
 */
export interface PushNotificationPayload {
  /** Notification title */
  title: string;
  /** Notification body */
  body: string;
  /** Icon URL */
  icon?: string;
  /** Image URL */
  image?: string;
  /** Badge count */
  badge?: number;
  /** Sound */
  sound?: string;
  /** Priority */
  priority: 'high' | 'normal' | 'low';
  /** Time to live (seconds) */
  ttl?: number;
  /** Custom data */
  data?: Record<string, unknown>;
  /** Action buttons */
  actions?: PushNotificationAction[];
}

/**
 * Push notification action button
 */
export interface PushNotificationAction {
  /** Action ID */
  action: string;
  /** Action label */
  title: string;
  /** Icon */
  icon?: string;
}

/**
 * SMS notification content
 */
export interface SMSNotificationContent {
  /** Recipient phone number */
  to: string;
  /** SMS body (max 160 chars for single SMS) */
  body: string;
  /** Sender ID (optional) */
  from?: string;
}

/**
 * Email notification content
 */
export interface EmailNotificationContent {
  /** Recipient email */
  to: string;
  /** Email subject */
  subject: string;
  /** HTML body */
  html: string;
  /** Plain text body */
  text: string;
  /** Sender email */
  from?: string;
  /** Reply-to email */
  replyTo?: string;
  /** CC recipients */
  cc?: string[];
  /** BCC recipients */
  bcc?: string[];
  /** Attachments */
  attachments?: EmailAttachment[];
}

/**
 * Email attachment
 */
export interface EmailAttachment {
  /** Filename */
  filename: string;
  /** Content type */
  contentType: string;
  /** Content (base64 encoded or URL) */
  content: string;
  /** Size in bytes */
  size?: number;
}

/**
 * WebSocket notification message
 */
export interface WebSocketNotification {
  /** Event type */
  event: string;
  /** Notification data */
  data: Record<string, unknown>;
  /** Timestamp */
  timestamp: Timestamp;
}

/**
 * Emergency alert notification template data
 */
export interface EmergencyAlertNotificationData {
  /** Emergency ID */
  emergencyId: UUID;
  /** User name */
  userName: string;
  /** Emergency type */
  emergencyType: EmergencyType;
  /** Initial location */
  location: Location;
  /** Location address */
  address?: string;
  /** Initial message */
  message?: string;
  /** Emergency timestamp */
  timestamp: Timestamp;
  /** View link */
  viewLink: string;
  /** Medical info link */
  medicalInfoLink?: string;
}

/**
 * Location update notification data
 */
export interface LocationUpdateNotificationData {
  /** Emergency ID */
  emergencyId: UUID;
  /** User name */
  userName: string;
  /** Updated location */
  location: Location;
  /** Address */
  address?: string;
  /** Timestamp */
  timestamp: Timestamp;
}

/**
 * Acknowledgment notification data
 */
export interface AcknowledgmentNotificationData {
  /** Emergency ID */
  emergencyId: UUID;
  /** Contact name who acknowledged */
  contactName: string;
  /** Acknowledgment message */
  message?: string;
  /** Timestamp */
  timestamp: Timestamp;
}

/**
 * Notification template
 */
export interface NotificationTemplate {
  /** Template ID */
  id: string;
  /** Template name */
  name: string;
  /** Notification type */
  type: NotificationType;
  /** Channel */
  channel: NotificationChannel;
  /** Subject template */
  subject: string;
  /** Body template (supports variables) */
  body: string;
  /** HTML template (for email) */
  htmlBody?: string;
  /** Template variables */
  variables: string[];
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  /** User ID */
  userId: UUID;
  /** Push notifications enabled */
  pushEnabled: boolean;
  /** SMS notifications enabled */
  smsEnabled: boolean;
  /** Email notifications enabled */
  emailEnabled: boolean;
  /** Per-type preferences */
  typePreferences: Record<NotificationType, {
    /** Enabled */
    enabled: boolean;
    /** Channels */
    channels: NotificationChannel[];
  }>;
  /** Quiet hours */
  quietHours?: {
    /** Enabled */
    enabled: boolean;
    /** Start time (24h format, e.g., "22:00") */
    startTime: string;
    /** End time (24h format, e.g., "08:00") */
    endTime: string;
    /** Timezone */
    timezone: string;
    /** Emergency alerts override quiet hours */
    emergencyOverride: boolean;
  };
}

/**
 * Notification delivery report
 */
export interface NotificationDeliveryReport {
  /** Notification ID */
  notificationId: UUID;
  /** Channel */
  channel: NotificationChannel;
  /** Status */
  status: NotificationStatus;
  /** Sent at */
  sentAt?: Timestamp;
  /** Delivered at */
  deliveredAt?: Timestamp;
  /** Delivery latency (ms) */
  latency?: number;
  /** Provider response */
  providerResponse?: Record<string, unknown>;
  /** Error details */
  error?: {
    /** Error code */
    code: string;
    /** Error message */
    message: string;
    /** Details */
    details?: string;
  };
}

/**
 * Notification statistics
 */
export interface NotificationStats {
  /** Time period */
  period: {
    start: Timestamp;
    end: Timestamp;
  };
  /** Total sent */
  totalSent: number;
  /** Total delivered */
  totalDelivered: number;
  /** Total failed */
  totalFailed: number;
  /** Delivery rate (%) */
  deliveryRate: number;
  /** Average delivery time (seconds) */
  averageDeliveryTime: number;
  /** By channel */
  byChannel: Record<NotificationChannel, {
    sent: number;
    delivered: number;
    failed: number;
    deliveryRate: number;
  }>;
  /** By type */
  byType: Record<NotificationType, {
    sent: number;
    delivered: number;
    failed: number;
  }>;
}

/**
 * Notification retry configuration
 */
export interface NotificationRetryConfig {
  /** Maximum retry attempts */
  maxRetries: number;
  /** Initial delay (milliseconds) */
  initialDelay: number;
  /** Maximum delay (milliseconds) */
  maxDelay: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** Retryable error codes */
  retryableErrors: string[];
}

/**
 * Notification escalation rule
 */
export interface NotificationEscalationRule {
  /** Rule ID */
  id: UUID;
  /** Emergency type (if type-specific) */
  emergencyType?: EmergencyType;
  /** Primary notification channels */
  primaryChannels: NotificationChannel[];
  /** Escalation delay (seconds) */
  escalationDelay: number;
  /** Escalation channels */
  escalationChannels: NotificationChannel[];
  /** Follow-up interval (seconds) */
  followUpInterval: number;
  /** Maximum follow-ups */
  maxFollowUps: number;
}

/**
 * FCM (Firebase Cloud Messaging) device token
 */
export interface FCMToken {
  /** User ID */
  userId: UUID;
  /** Device ID */
  deviceId: string;
  /** FCM token */
  token: string;
  /** Platform */
  platform: 'ios' | 'android' | 'web';
  /** Created timestamp */
  createdAt: Timestamp;
  /** Last used timestamp */
  lastUsedAt?: Timestamp;
}

/**
 * APNs (Apple Push Notification) device token
 */
export interface APNsToken {
  /** User ID */
  userId: UUID;
  /** Device ID */
  deviceId: string;
  /** APNs device token */
  token: string;
  /** Environment */
  environment: 'production' | 'sandbox';
  /** Created timestamp */
  createdAt: Timestamp;
  /** Last used timestamp */
  lastUsedAt?: Timestamp;
}

/**
 * Notification queue job
 */
export interface NotificationQueueJob {
  /** Job ID */
  id: UUID;
  /** Notification ID */
  notificationId: UUID;
  /** Priority (1-10, higher = more urgent) */
  priority: number;
  /** Job status */
  status: 'pending' | 'processing' | 'completed' | 'failed';
  /** Retry count */
  retryCount: number;
  /** Scheduled timestamp */
  scheduledAt: Timestamp;
  /** Started timestamp */
  startedAt?: Timestamp;
  /** Completed timestamp */
  completedAt?: Timestamp;
  /** Error message */
  error?: string;
}
