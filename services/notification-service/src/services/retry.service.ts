import { logger } from '../utils/logger';
import { config } from '../config';
import {
  NotificationJob,
  NotificationChannel,
  NotificationPriority,
} from '../models/Notification';
import { addNotificationJob } from '../queues/notification.queue';

/**
 * Handle retry logic with fallback channels
 * Returns true if a fallback notification was enqueued
 */
export async function handleRetry(
  job: NotificationJob,
  attemptsMade: number
): Promise<boolean> {
  logger.info('Handling notification retry', {
    emergencyId: job.emergencyId,
    recipientId: job.recipientId,
    channel: job.channel,
    attemptsMade,
  });

  // If push notification failed, immediately try SMS as fallback
  if (job.channel === NotificationChannel.PUSH && attemptsMade === 1) {
    if (job.contactInfo.phone) {
      logger.info('Push notification failed, falling back to SMS', {
        emergencyId: job.emergencyId,
        recipientId: job.recipientId,
      });

      await enqueueFallbackNotification(job, NotificationChannel.SMS);
      return true;
    }
  }

  // If SMS failed and we have email, try email as final fallback
  if (job.channel === NotificationChannel.SMS && attemptsMade === 1) {
    if (job.contactInfo.email) {
      logger.info('SMS failed, falling back to email', {
        emergencyId: job.emergencyId,
        recipientId: job.recipientId,
      });

      await enqueueFallbackNotification(job, NotificationChannel.EMAIL);
      return true;
    }
  }

  return false;
}

/**
 * Enqueue a fallback notification on a different channel
 */
async function enqueueFallbackNotification(
  originalJob: NotificationJob,
  fallbackChannel: NotificationChannel
): Promise<void> {
  const fallbackJob: NotificationJob = {
    ...originalJob,
    channel: fallbackChannel,
    priority: NotificationPriority.EMERGENCY, // Escalate priority for fallback
  };

  try {
    await addNotificationJob(fallbackJob, {
      delay: 0, // Send immediately
      priority: 1, // Highest priority
    });

    logger.info('Fallback notification enqueued', {
      emergencyId: fallbackJob.emergencyId,
      recipientId: fallbackJob.recipientId,
      originalChannel: originalJob.channel,
      fallbackChannel,
    });
  } catch (error: any) {
    logger.error('Failed to enqueue fallback notification', {
      emergencyId: fallbackJob.emergencyId,
      error: error.message,
    });
  }
}

/**
 * Calculate retry delay with exponential backoff
 */
export function calculateRetryDelay(attemptNumber: number): number {
  const baseDelay = config.notification.initialRetryDelay;
  const multiplier = config.notification.retryBackoffMultiplier;
  const maxDelay = config.notification.maxRetryDelay;

  const delay = Math.min(
    baseDelay * Math.pow(multiplier, attemptNumber - 1),
    maxDelay
  );

  logger.debug('Calculated retry delay', {
    attemptNumber,
    delay,
    baseDelay,
    multiplier,
    maxDelay,
  });

  return delay;
}

/**
 * Check if notification should be retried
 */
export function shouldRetry(
  channel: NotificationChannel,
  attemptsMade: number,
  errorCode?: string
): boolean {
  const maxAttempts = config.notification.retryAttempts;

  // Don't retry if max attempts reached
  if (attemptsMade >= maxAttempts) {
    return false;
  }

  // Don't retry for certain permanent errors
  const permanentErrorCodes = [
    'INVALID_TOKEN',
    'INVALID_PHONE_NUMBER',
    'INVALID_EMAIL',
    'BLACKLISTED',
    'UNREGISTERED',
    'PERMISSION_DENIED',
  ];

  if (errorCode && permanentErrorCodes.some(code => errorCode.includes(code))) {
    logger.info('Permanent error detected, skipping retry', {
      errorCode,
      attemptsMade,
    });
    return false;
  }

  return true;
}

/**
 * Retry all failed notifications for an emergency
 */
export async function retryFailedNotifications(emergencyId: string): Promise<number> {
  logger.info('Retrying failed notifications for emergency', { emergencyId });

  // This would query failed notifications from MongoDB and re-enqueue them
  // Implementation depends on having access to NotificationModel
  // For now, this is a placeholder

  return 0;
}

/**
 * Get retry strategy based on channel
 */
export function getRetryStrategy(channel: NotificationChannel): {
  attempts: number;
  backoff: { type: string; delay: number };
} {
  switch (channel) {
    case NotificationChannel.PUSH:
      return {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // 5s, 15s, 45s
        },
      };

    case NotificationChannel.SMS:
      return {
        attempts: 2,
        backoff: {
          type: 'fixed',
          delay: 10000, // 10s, 10s
        },
      };

    case NotificationChannel.EMAIL:
      return {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 10000, // 10s, 20s, 40s
        },
      };

    default:
      return {
        attempts: config.notification.retryAttempts,
        backoff: {
          type: 'exponential',
          delay: config.notification.initialRetryDelay,
        },
      };
  }
}

/**
 * Exponential backoff with jitter
 */
export function exponentialBackoffWithJitter(
  attempt: number,
  baseDelay: number,
  maxDelay: number
): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
  const capped = Math.min(exponentialDelay, maxDelay);

  // Add random jitter (±20%)
  const jitter = capped * 0.2 * (Math.random() * 2 - 1);

  return Math.floor(capped + jitter);
}
