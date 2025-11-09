"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchEmergencyAlert = dispatchEmergencyAlert;
exports.dispatchLocationUpdate = dispatchLocationUpdate;
exports.dispatchAcknowledgmentNotification = dispatchAcknowledgmentNotification;
exports.getBatchStatus = getBatchStatus;
exports.updateBatchStats = updateBatchStats;
const uuid_1 = require("uuid");
const logger_1 = require("../utils/logger");
const Notification_1 = require("../models/Notification");
const notification_queue_1 = require("../queues/notification.queue");
const notification_schema_1 = require("../db/schemas/notification.schema");
/**
 * Dispatch emergency alert to all emergency contacts via multiple channels
 */
async function dispatchEmergencyAlert(emergency, contacts) {
    const batchId = (0, uuid_1.v4)();
    logger_1.logger.info('Dispatching emergency alert', {
        emergencyId: emergency.id,
        batchId,
        contactCount: contacts.length,
    });
    try {
        // Generate emergency link
        const emergencyLink = generateEmergencyLink(emergency.id);
        // Create notification jobs for each contact and channel
        const jobs = [];
        for (const contact of contacts) {
            const templateData = {
                userName: emergency.userName,
                emergencyType: emergency.emergencyType,
                location: `${emergency.location.latitude}, ${emergency.location.longitude}`,
                address: emergency.location.address,
                emergencyLink,
            };
            const contactInfo = {
                phone: contact.phoneNumber,
                email: contact.email,
                fcmToken: contact.fcmToken,
                apnsToken: contact.apnsToken,
            };
            // Determine priority based on contact priority
            const priority = contact.priority === 'PRIMARY'
                ? Notification_1.NotificationPriority.EMERGENCY
                : contact.priority === 'SECONDARY'
                    ? Notification_1.NotificationPriority.HIGH
                    : Notification_1.NotificationPriority.NORMAL;
            // Push notification (highest priority)
            if (contact.fcmToken || contact.apnsToken) {
                jobs.push({
                    emergencyId: emergency.id,
                    batchId,
                    recipientId: contact.id,
                    recipientName: contact.name,
                    channel: Notification_1.NotificationChannel.PUSH,
                    priority,
                    templateData,
                    contactInfo,
                });
            }
            // SMS notification
            if (contact.phoneNumber) {
                jobs.push({
                    emergencyId: emergency.id,
                    batchId,
                    recipientId: contact.id,
                    recipientName: contact.name,
                    channel: Notification_1.NotificationChannel.SMS,
                    priority,
                    templateData,
                    contactInfo,
                });
            }
            // Email notification
            if (contact.email) {
                jobs.push({
                    emergencyId: emergency.id,
                    batchId,
                    recipientId: contact.id,
                    recipientName: contact.name,
                    channel: Notification_1.NotificationChannel.EMAIL,
                    priority,
                    templateData,
                    contactInfo,
                });
            }
        }
        // Create batch record
        const batch = await notification_schema_1.NotificationBatchModel.create({
            batchId,
            emergencyId: emergency.id,
            totalCount: jobs.length,
            pendingCount: jobs.length,
            sentCount: 0,
            deliveredCount: 0,
            failedCount: 0,
        });
        // Add jobs to Bull queue
        await (0, notification_queue_1.addBulkNotificationJobs)(jobs);
        logger_1.logger.info('Emergency alert dispatched successfully', {
            emergencyId: emergency.id,
            batchId,
            jobCount: jobs.length,
        });
        return {
            batchId,
            emergencyId: emergency.id,
            totalCount: jobs.length,
            sentCount: 0,
            deliveredCount: 0,
            failedCount: 0,
            pendingCount: jobs.length,
            createdAt: batch.createdAt,
        };
    }
    catch (error) {
        logger_1.logger.error('Failed to dispatch emergency alert', {
            emergencyId: emergency.id,
            batchId,
            error: error.message,
            stack: error.stack,
        });
        throw error;
    }
}
/**
 * Dispatch location update notification
 */
async function dispatchLocationUpdate(emergencyId, _location, contacts) {
    logger_1.logger.info('Dispatching location update', {
        emergencyId,
        contactCount: contacts.length,
    });
    // For location updates, we primarily use WebSocket (handled elsewhere)
    // But we can optionally send push notifications for significant location changes
    // This is typically not needed as real-time updates are via WebSocket
}
/**
 * Dispatch acknowledgment notification to user
 */
async function dispatchAcknowledgmentNotification(emergencyId, acknowledgedBy, userId, userContactInfo) {
    logger_1.logger.info('Dispatching acknowledgment notification', {
        emergencyId,
        acknowledgedBy,
        userId,
    });
    const batchId = (0, uuid_1.v4)();
    const emergencyLink = generateEmergencyLink(emergencyId);
    const templateData = {
        userName: 'You',
        emergencyType: 'ACKNOWLEDGMENT',
        location: '',
        emergencyLink,
        acknowledgedBy,
    };
    const jobs = [];
    // Push notification to user
    if (userContactInfo.fcmToken || userContactInfo.apnsToken) {
        jobs.push({
            emergencyId,
            batchId,
            recipientId: userId,
            recipientName: 'User',
            channel: Notification_1.NotificationChannel.PUSH,
            priority: Notification_1.NotificationPriority.HIGH,
            templateData: {
                ...templateData,
                userName: acknowledgedBy,
                emergencyType: 'has acknowledged your emergency',
            },
            contactInfo: {
                fcmToken: userContactInfo.fcmToken,
                apnsToken: userContactInfo.apnsToken,
            },
        });
    }
    if (jobs.length > 0) {
        await (0, notification_queue_1.addBulkNotificationJobs)(jobs);
    }
}
/**
 * Get batch status
 */
async function getBatchStatus(batchId) {
    try {
        const batch = await notification_schema_1.NotificationBatchModel.findOne({ batchId }).lean();
        if (!batch) {
            return null;
        }
        return {
            batchId: batch.batchId,
            emergencyId: batch.emergencyId,
            totalCount: batch.totalCount,
            sentCount: batch.sentCount,
            deliveredCount: batch.deliveredCount,
            failedCount: batch.failedCount,
            pendingCount: batch.pendingCount,
            createdAt: batch.createdAt,
            completedAt: batch.completedAt,
        };
    }
    catch (error) {
        logger_1.logger.error('Failed to get batch status', {
            batchId,
            error: error.message,
        });
        return null;
    }
}
/**
 * Update batch statistics
 */
async function updateBatchStats(batchId, stats) {
    try {
        await notification_schema_1.NotificationBatchModel.updateOne({ batchId }, {
            $inc: stats,
            $set: {
                completedAt: stats.pendingCount === 0 ? new Date() : undefined,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to update batch stats', {
            batchId,
            error: error.message,
        });
    }
}
/**
 * Generate emergency link for notifications
 */
function generateEmergencyLink(emergencyId) {
    const baseUrl = process.env.WEB_APP_URL || 'https://app.sos-app.com';
    return `${baseUrl}/emergency/${emergencyId}`;
}
//# sourceMappingURL=notification.service.js.map