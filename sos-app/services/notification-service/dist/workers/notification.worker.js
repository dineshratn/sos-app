"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeNotificationWorker = initializeNotificationWorker;
exports.processNotificationJob = processNotificationJob;
const logger_1 = require("../utils/logger");
const Notification_1 = require("../models/Notification");
const notification_schema_1 = require("../db/schemas/notification.schema");
const fcm_provider_1 = require("../providers/fcm.provider");
const apns_provider_1 = require("../providers/apns.provider");
const sms_provider_1 = require("../providers/sms.provider");
const email_provider_1 = require("../providers/email.provider");
const notification_queue_1 = require("../queues/notification.queue");
const notification_service_1 = require("../services/notification.service");
const retry_service_1 = require("../services/retry.service");
/**
 * Initialize notification worker to process jobs from the queue
 */
async function initializeNotificationWorker() {
    logger_1.logger.info('Initializing notification worker');
    // Process jobs with concurrency based on channel
    notification_queue_1.notificationQueue.process('*', 10, async (job) => {
        return await processNotificationJob(job);
    });
    logger_1.logger.info('Notification worker initialized with concurrency: 10');
}
/**
 * Process individual notification job
 */
async function processNotificationJob(job) {
    const jobData = job.data;
    const notificationId = job.id;
    logger_1.logger.info('Processing notification job', {
        jobId: notificationId,
        emergencyId: jobData.emergencyId,
        recipientId: jobData.recipientId,
        channel: jobData.channel,
        attempt: job.attemptsMade + 1,
    });
    // Create notification record
    const notification = await notification_schema_1.NotificationModel.create({
        emergencyId: jobData.emergencyId,
        batchId: jobData.batchId,
        recipientId: jobData.recipientId,
        recipientName: jobData.recipientName,
        recipientPhone: jobData.contactInfo.phone,
        recipientEmail: jobData.contactInfo.email,
        channel: jobData.channel,
        status: Notification_1.NotificationStatus.QUEUED,
        priority: jobData.priority,
        content: generateNotificationContent(jobData),
        retryCount: job.attemptsMade,
        maxRetries: job.opts.attempts || 3,
    });
    try {
        let result;
        // Send notification via appropriate channel
        switch (jobData.channel) {
            case Notification_1.NotificationChannel.PUSH:
                result = await sendPushNotification(jobData);
                break;
            case Notification_1.NotificationChannel.SMS:
                result = await sendSMSNotification(jobData);
                break;
            case Notification_1.NotificationChannel.EMAIL:
                result = await sendEmailNotification(jobData);
                break;
            default:
                throw new Error(`Unsupported notification channel: ${jobData.channel}`);
        }
        if (result.success) {
            // Update notification as sent
            await notification_schema_1.NotificationModel.updateOne({ _id: notification._id }, {
                $set: {
                    status: Notification_1.NotificationStatus.SENT,
                    sentAt: new Date(),
                    'metadata.messageId': result.messageId,
                },
            });
            // Update batch stats
            await (0, notification_service_1.updateBatchStats)(jobData.batchId, {
                sentCount: 1,
                pendingCount: -1,
            });
            logger_1.logger.info('Notification sent successfully', {
                jobId: notificationId,
                emergencyId: jobData.emergencyId,
                channel: jobData.channel,
                messageId: result.messageId,
            });
            return result;
        }
        else {
            // Handle failure
            throw new Error(result.error || 'Notification delivery failed');
        }
    }
    catch (error) {
        logger_1.logger.error('Failed to process notification job', {
            jobId: notificationId,
            emergencyId: jobData.emergencyId,
            channel: jobData.channel,
            attempt: job.attemptsMade + 1,
            error: error.message,
        });
        // Update notification as failed
        await notification_schema_1.NotificationModel.updateOne({ _id: notification._id }, {
            $set: {
                status: Notification_1.NotificationStatus.FAILED,
                failedAt: new Date(),
                failureReason: error.message,
            },
        });
        // Check if we should retry with fallback channel
        await (0, retry_service_1.handleRetry)(jobData, job.attemptsMade + 1);
        // If this is the last attempt, update batch stats
        if (job.attemptsMade + 1 >= (job.opts.attempts || 3)) {
            await (0, notification_service_1.updateBatchStats)(jobData.batchId, {
                failedCount: 1,
                pendingCount: -1,
            });
        }
        // Re-throw error to trigger Bull's retry mechanism
        throw error;
    }
}
/**
 * Send push notification
 */
async function sendPushNotification(job) {
    // Determine which provider to use based on available token
    if (job.contactInfo.fcmToken) {
        return await fcm_provider_1.fcmProvider.sendPushNotification(job);
    }
    else if (job.contactInfo.apnsToken) {
        return await apns_provider_1.apnsProvider.sendCriticalNotification(job);
    }
    else {
        return {
            success: false,
            error: 'No push notification token available',
        };
    }
}
/**
 * Send SMS notification
 */
async function sendSMSNotification(job) {
    return await sms_provider_1.smsProvider.sendSMS(job);
}
/**
 * Send email notification
 */
async function sendEmailNotification(job) {
    return await email_provider_1.emailProvider.sendEmail(job);
}
/**
 * Generate notification content based on channel
 */
function generateNotificationContent(job) {
    const { userName, emergencyType, location, address } = job.templateData;
    const locationText = address || location;
    switch (job.channel) {
        case Notification_1.NotificationChannel.PUSH:
            return `${userName} needs help! ${emergencyType} emergency at ${locationText}`;
        case Notification_1.NotificationChannel.SMS:
            return (`🆘 EMERGENCY ALERT!\n` +
                `${userName} has triggered a ${emergencyType} emergency.\n` +
                `Location: ${locationText}\n` +
                `View details: ${job.templateData.emergencyLink}`);
        case Notification_1.NotificationChannel.EMAIL:
            return `Emergency alert: ${userName} needs immediate assistance`;
        default:
            return `Emergency: ${userName} needs help`;
    }
}
/**
 * Handle job completion (called by Bull)
 */
notification_queue_1.notificationQueue.on('completed', async (job, result) => {
    logger_1.logger.info('Job completed', {
        jobId: job.id,
        emergencyId: job.data.emergencyId,
        channel: job.data.channel,
    });
    // If delivery confirmation is received, update status to DELIVERED
    if (result.delivered) {
        const notification = await notification_schema_1.NotificationModel.findOneAndUpdate({
            emergencyId: job.data.emergencyId,
            recipientId: job.data.recipientId,
            channel: job.data.channel,
        }, {
            $set: {
                status: Notification_1.NotificationStatus.DELIVERED,
                deliveredAt: new Date(),
            },
        }, { new: true });
        if (notification) {
            await (0, notification_service_1.updateBatchStats)(job.data.batchId, {
                deliveredCount: 1,
            });
        }
    }
});
/**
 * Handle job failure (called by Bull)
 */
notification_queue_1.notificationQueue.on('failed', async (job, error) => {
    logger_1.logger.error('Job failed permanently', {
        jobId: job?.id,
        emergencyId: job?.data?.emergencyId,
        channel: job?.data?.channel,
        attempts: job?.attemptsMade,
        error: error.message,
    });
    // Final failure - all retries exhausted
    if (job && job.data) {
        await notification_schema_1.NotificationModel.updateOne({
            emergencyId: job.data.emergencyId,
            recipientId: job.data.recipientId,
            channel: job.data.channel,
        }, {
            $set: {
                status: Notification_1.NotificationStatus.FAILED,
                failedAt: new Date(),
                failureReason: error.message,
            },
        });
    }
});
//# sourceMappingURL=notification.worker.js.map