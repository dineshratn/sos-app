"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRetry = handleRetry;
exports.calculateRetryDelay = calculateRetryDelay;
exports.shouldRetry = shouldRetry;
exports.retryFailedNotifications = retryFailedNotifications;
exports.getRetryStrategy = getRetryStrategy;
exports.exponentialBackoffWithJitter = exponentialBackoffWithJitter;
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
const Notification_1 = require("../models/Notification");
const notification_queue_1 = require("../queues/notification.queue");
/**
 * Handle retry logic with fallback channels
 * Returns true if a fallback notification was enqueued
 */
async function handleRetry(job, attemptsMade) {
    logger_1.logger.info('Handling notification retry', {
        emergencyId: job.emergencyId,
        recipientId: job.recipientId,
        channel: job.channel,
        attemptsMade,
    });
    // If push notification failed, immediately try SMS as fallback
    if (job.channel === Notification_1.NotificationChannel.PUSH && attemptsMade === 1) {
        if (job.contactInfo.phone) {
            logger_1.logger.info('Push notification failed, falling back to SMS', {
                emergencyId: job.emergencyId,
                recipientId: job.recipientId,
            });
            await enqueueFallbackNotification(job, Notification_1.NotificationChannel.SMS);
            return true;
        }
    }
    // If SMS failed and we have email, try email as final fallback
    if (job.channel === Notification_1.NotificationChannel.SMS && attemptsMade === 1) {
        if (job.contactInfo.email) {
            logger_1.logger.info('SMS failed, falling back to email', {
                emergencyId: job.emergencyId,
                recipientId: job.recipientId,
            });
            await enqueueFallbackNotification(job, Notification_1.NotificationChannel.EMAIL);
            return true;
        }
    }
    return false;
}
/**
 * Enqueue a fallback notification on a different channel
 */
async function enqueueFallbackNotification(originalJob, fallbackChannel) {
    const fallbackJob = {
        ...originalJob,
        channel: fallbackChannel,
        priority: Notification_1.NotificationPriority.EMERGENCY, // Escalate priority for fallback
    };
    try {
        await (0, notification_queue_1.addNotificationJob)(fallbackJob, {
            delay: 0, // Send immediately
            priority: 1, // Highest priority
        });
        logger_1.logger.info('Fallback notification enqueued', {
            emergencyId: fallbackJob.emergencyId,
            recipientId: fallbackJob.recipientId,
            originalChannel: originalJob.channel,
            fallbackChannel,
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to enqueue fallback notification', {
            emergencyId: fallbackJob.emergencyId,
            error: error.message,
        });
    }
}
/**
 * Calculate retry delay with exponential backoff
 */
function calculateRetryDelay(attemptNumber) {
    const baseDelay = config_1.config.notification.initialRetryDelay;
    const multiplier = config_1.config.notification.retryBackoffMultiplier;
    const maxDelay = config_1.config.notification.maxRetryDelay;
    const delay = Math.min(baseDelay * Math.pow(multiplier, attemptNumber - 1), maxDelay);
    logger_1.logger.debug('Calculated retry delay', {
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
function shouldRetry(_channel, attemptsMade, errorCode) {
    const maxAttempts = config_1.config.notification.retryAttempts;
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
        logger_1.logger.info('Permanent error detected, skipping retry', {
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
async function retryFailedNotifications(emergencyId) {
    logger_1.logger.info('Retrying failed notifications for emergency', { emergencyId });
    // This would query failed notifications from MongoDB and re-enqueue them
    // Implementation depends on having access to NotificationModel
    // For now, this is a placeholder
    return 0;
}
/**
 * Get retry strategy based on channel
 */
function getRetryStrategy(channel) {
    switch (channel) {
        case Notification_1.NotificationChannel.PUSH:
            return {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000, // 5s, 15s, 45s
                },
            };
        case Notification_1.NotificationChannel.SMS:
            return {
                attempts: 2,
                backoff: {
                    type: 'fixed',
                    delay: 10000, // 10s, 10s
                },
            };
        case Notification_1.NotificationChannel.EMAIL:
            return {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 10000, // 10s, 20s, 40s
                },
            };
        default:
            return {
                attempts: config_1.config.notification.retryAttempts,
                backoff: {
                    type: 'exponential',
                    delay: config_1.config.notification.initialRetryDelay,
                },
            };
    }
}
/**
 * Exponential backoff with jitter
 */
function exponentialBackoffWithJitter(attempt, baseDelay, maxDelay) {
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const capped = Math.min(exponentialDelay, maxDelay);
    // Add random jitter (±20%)
    const jitter = capped * 0.2 * (Math.random() * 2 - 1);
    return Math.floor(capped + jitter);
}
//# sourceMappingURL=retry.service.js.map