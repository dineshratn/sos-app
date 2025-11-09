import { NotificationJob, NotificationChannel } from '../models/Notification';
/**
 * Handle retry logic with fallback channels
 * Returns true if a fallback notification was enqueued
 */
export declare function handleRetry(job: NotificationJob, attemptsMade: number): Promise<boolean>;
/**
 * Calculate retry delay with exponential backoff
 */
export declare function calculateRetryDelay(attemptNumber: number): number;
/**
 * Check if notification should be retried
 */
export declare function shouldRetry(_channel: NotificationChannel, attemptsMade: number, errorCode?: string): boolean;
/**
 * Retry all failed notifications for an emergency
 */
export declare function retryFailedNotifications(emergencyId: string): Promise<number>;
/**
 * Get retry strategy based on channel
 */
export declare function getRetryStrategy(channel: NotificationChannel): {
    attempts: number;
    backoff: {
        type: string;
        delay: number;
    };
};
/**
 * Exponential backoff with jitter
 */
export declare function exponentialBackoffWithJitter(attempt: number, baseDelay: number, maxDelay: number): number;
//# sourceMappingURL=retry.service.d.ts.map