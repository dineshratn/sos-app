"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookRoutes = void 0;
const express_1 = require("express");
const logger_1 = require("../utils/logger");
const notification_schema_1 = require("../db/schemas/notification.schema");
const Notification_1 = require("../models/Notification");
const notification_service_1 = require("../services/notification.service");
const router = (0, express_1.Router)();
exports.webhookRoutes = router;
/**
 * Twilio SMS delivery status webhook
 * https://www.twilio.com/docs/sms/api/message-resource#message-status-values
 */
router.post('/twilio/status', async (req, res) => {
    try {
        const { MessageSid, MessageStatus, ErrorCode, ErrorMessage, } = req.body;
        const { emergencyId, recipientId } = req.query;
        logger_1.logger.info('Received Twilio status webhook', {
            messageSid: MessageSid,
            status: MessageStatus,
            emergencyId,
            recipientId,
        });
        // Map Twilio status to our notification status
        let notificationStatus;
        let deliveredAt;
        switch (MessageStatus) {
            case 'queued':
            case 'sending':
                notificationStatus = Notification_1.NotificationStatus.SENT;
                break;
            case 'sent':
            case 'delivered':
                notificationStatus = Notification_1.NotificationStatus.DELIVERED;
                deliveredAt = new Date();
                break;
            case 'failed':
            case 'undelivered':
                notificationStatus = Notification_1.NotificationStatus.FAILED;
                break;
            default:
                notificationStatus = Notification_1.NotificationStatus.PENDING;
        }
        // Update notification in database
        const notification = await notification_schema_1.NotificationModel.findOneAndUpdate({
            emergencyId: emergencyId,
            recipientId: recipientId,
            channel: 'SMS',
        }, {
            $set: {
                status: notificationStatus,
                deliveredAt,
                failureReason: ErrorMessage,
                'metadata.messageId': MessageSid,
                'metadata.errorCode': ErrorCode,
                'metadata.provider': 'twilio',
            },
        }, { new: true, sort: { createdAt: -1 } });
        if (notification && notificationStatus === Notification_1.NotificationStatus.DELIVERED) {
            await (0, notification_service_1.updateBatchStats)(notification.batchId, {
                deliveredCount: 1,
            });
        }
        res.status(200).send('OK');
    }
    catch (error) {
        logger_1.logger.error('Error processing Twilio webhook', {
            error: error.message,
            body: req.body,
        });
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * SendGrid email delivery status webhook
 * https://docs.sendgrid.com/for-developers/tracking-events/event
 */
router.post('/sendgrid/events', async (req, res) => {
    try {
        const events = Array.isArray(req.body) ? req.body : [req.body];
        logger_1.logger.info('Received SendGrid webhook', {
            eventCount: events.length,
        });
        for (const event of events) {
            const { event: eventType, sg_message_id, email, timestamp, reason, emergencyId, recipientId, } = event;
            logger_1.logger.debug('Processing SendGrid event', {
                eventType,
                messageId: sg_message_id,
                email,
                emergencyId,
                recipientId,
            });
            // Map SendGrid event to our notification status
            let notificationStatus = null;
            let deliveredAt;
            switch (eventType) {
                case 'processed':
                case 'delivered':
                    notificationStatus = Notification_1.NotificationStatus.DELIVERED;
                    deliveredAt = new Date(timestamp * 1000);
                    break;
                case 'bounce':
                case 'blocked':
                case 'dropped':
                    notificationStatus = Notification_1.NotificationStatus.FAILED;
                    break;
                case 'deferred':
                    // Email temporarily delayed, keep as SENT
                    break;
                default:
                    // opened, click, etc. - no status change needed
                    break;
            }
            if (notificationStatus && (emergencyId || recipientId)) {
                // Update notification in database
                const query = { channel: 'EMAIL' };
                if (emergencyId)
                    query.emergencyId = emergencyId;
                if (recipientId)
                    query.recipientId = recipientId;
                if (email)
                    query.recipientEmail = email;
                const notification = await notification_schema_1.NotificationModel.findOneAndUpdate(query, {
                    $set: {
                        status: notificationStatus,
                        deliveredAt,
                        failureReason: reason,
                        'metadata.messageId': sg_message_id,
                        'metadata.provider': 'sendgrid',
                    },
                }, { new: true, sort: { createdAt: -1 } });
                if (notification && notificationStatus === Notification_1.NotificationStatus.DELIVERED) {
                    await (0, notification_service_1.updateBatchStats)(notification.batchId, {
                        deliveredCount: 1,
                    });
                }
            }
        }
        res.status(200).send('OK');
    }
    catch (error) {
        logger_1.logger.error('Error processing SendGrid webhook', {
            error: error.message,
            body: req.body,
        });
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * FCM delivery receipt webhook (if configured)
 */
router.post('/fcm/receipt', async (req, res) => {
    try {
        const { messageId, status, error, emergencyId, recipientId } = req.body;
        logger_1.logger.info('Received FCM receipt webhook', {
            messageId,
            status,
            emergencyId,
            recipientId,
        });
        let notificationStatus;
        let deliveredAt;
        if (status === 'delivered') {
            notificationStatus = Notification_1.NotificationStatus.DELIVERED;
            deliveredAt = new Date();
        }
        else if (status === 'failed') {
            notificationStatus = Notification_1.NotificationStatus.FAILED;
        }
        else {
            notificationStatus = Notification_1.NotificationStatus.SENT;
        }
        // Update notification
        const notification = await notification_schema_1.NotificationModel.findOneAndUpdate({
            emergencyId,
            recipientId,
            channel: 'PUSH',
            'metadata.fcmToken': { $exists: true },
        }, {
            $set: {
                status: notificationStatus,
                deliveredAt,
                failureReason: error,
                'metadata.messageId': messageId,
            },
        }, { new: true, sort: { createdAt: -1 } });
        if (notification && notificationStatus === Notification_1.NotificationStatus.DELIVERED) {
            await (0, notification_service_1.updateBatchStats)(notification.batchId, {
                deliveredCount: 1,
            });
        }
        res.status(200).json({ success: true });
    }
    catch (error) {
        logger_1.logger.error('Error processing FCM webhook', {
            error: error.message,
            body: req.body,
        });
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * Generic delivery confirmation endpoint
 */
router.post('/delivery/confirm', async (req, res) => {
    try {
        const { notificationId, emergencyId, recipientId, channel, status, deliveredAt, metadata, } = req.body;
        logger_1.logger.info('Received delivery confirmation', {
            notificationId,
            emergencyId,
            recipientId,
            channel,
            status,
        });
        const updateData = {
            status,
            ...(deliveredAt && { deliveredAt: new Date(deliveredAt) }),
            ...(metadata && { metadata }),
        };
        const notification = await notification_schema_1.NotificationModel.findOneAndUpdate({
            ...(notificationId && { _id: notificationId }),
            ...(emergencyId && { emergencyId }),
            ...(recipientId && { recipientId }),
            ...(channel && { channel }),
        }, { $set: updateData }, { new: true, sort: { createdAt: -1 } });
        if (notification && status === Notification_1.NotificationStatus.DELIVERED) {
            await (0, notification_service_1.updateBatchStats)(notification.batchId, {
                deliveredCount: 1,
            });
        }
        res.status(200).json({ success: true, notification });
    }
    catch (error) {
        logger_1.logger.error('Error processing delivery confirmation', {
            error: error.message,
            body: req.body,
        });
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * Health check for webhook endpoints
 */
router.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'healthy',
        endpoints: [
            '/api/v1/webhooks/twilio/status',
            '/api/v1/webhooks/sendgrid/events',
            '/api/v1/webhooks/fcm/receipt',
            '/api/v1/webhooks/delivery/confirm',
        ],
    });
});
//# sourceMappingURL=webhook.routes.js.map