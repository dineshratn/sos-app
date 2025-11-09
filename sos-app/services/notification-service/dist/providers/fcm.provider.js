"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fcmProvider = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
class FCMProvider {
    initialized = false;
    constructor() {
        this.initialize();
    }
    initialize() {
        try {
            if (!config_1.config.fcm.projectId || !config_1.config.fcm.privateKey || !config_1.config.fcm.clientEmail) {
                logger_1.logger.warn('FCM configuration incomplete, provider disabled');
                return;
            }
            firebase_admin_1.default.initializeApp({
                credential: firebase_admin_1.default.credential.cert({
                    projectId: config_1.config.fcm.projectId,
                    privateKey: config_1.config.fcm.privateKey,
                    clientEmail: config_1.config.fcm.clientEmail,
                }),
            });
            this.initialized = true;
            logger_1.logger.info('FCM provider initialized successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize FCM provider', {
                error: error.message,
            });
        }
    }
    /**
     * Send push notification via Firebase Cloud Messaging
     */
    async sendPushNotification(job) {
        if (!this.initialized) {
            return {
                success: false,
                error: 'FCM provider not initialized',
            };
        }
        const fcmToken = job.contactInfo.fcmToken;
        if (!fcmToken) {
            return {
                success: false,
                error: 'FCM token not provided',
            };
        }
        try {
            const message = {
                token: fcmToken,
                notification: {
                    title: this.getNotificationTitle(job),
                    body: this.getNotificationBody(job),
                },
                data: {
                    emergencyId: job.emergencyId,
                    batchId: job.batchId,
                    recipientId: job.recipientId,
                    emergencyType: job.templateData.emergencyType,
                    userName: job.templateData.userName,
                    location: job.templateData.location,
                    emergencyLink: job.templateData.emergencyLink,
                    timestamp: new Date().toISOString(),
                },
                android: {
                    priority: 'high',
                    notification: {
                        channelId: 'emergency-alerts',
                        priority: 'max',
                        defaultSound: true,
                        defaultVibrateTimings: true,
                        visibility: 'public',
                        tag: job.emergencyId,
                    },
                },
                apns: {
                    headers: {
                        'apns-priority': '10',
                    },
                    payload: {
                        aps: {
                            alert: {
                                title: this.getNotificationTitle(job),
                                body: this.getNotificationBody(job),
                            },
                            sound: 'emergency.caf',
                            badge: 1,
                        },
                    },
                },
            };
            const response = await firebase_admin_1.default.messaging().send(message);
            logger_1.logger.info('FCM notification sent successfully', {
                emergencyId: job.emergencyId,
                recipientId: job.recipientId,
                messageId: response,
            });
            return {
                success: true,
                messageId: response,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to send FCM notification', {
                emergencyId: job.emergencyId,
                recipientId: job.recipientId,
                error: error.message,
                errorCode: error.code,
            });
            return {
                success: false,
                error: this.getErrorMessage(error),
            };
        }
    }
    /**
     * Send to multiple tokens (multicast)
     */
    async sendMulticast(tokens, job) {
        if (!this.initialized) {
            throw new Error('FCM provider not initialized');
        }
        const message = {
            tokens,
            notification: {
                title: this.getNotificationTitle(job),
                body: this.getNotificationBody(job),
            },
            data: {
                emergencyId: job.emergencyId,
                emergencyType: job.templateData.emergencyType,
                userName: job.templateData.userName,
                location: job.templateData.location,
                emergencyLink: job.templateData.emergencyLink,
            },
            android: {
                priority: 'high',
                notification: {
                    channelId: 'emergency-alerts',
                    priority: 'max',
                    defaultSound: true,
                },
            },
        };
        return await firebase_admin_1.default.messaging().sendMulticast(message);
    }
    /**
     * Verify if token is valid
     */
    async verifyToken(token) {
        if (!this.initialized) {
            return false;
        }
        try {
            await firebase_admin_1.default.messaging().send({
                token,
                data: { test: 'true' },
            }, true); // Dry run
            return true;
        }
        catch (error) {
            return false;
        }
    }
    getNotificationTitle(job) {
        return `🆘 EMERGENCY: ${job.templateData.userName} needs help!`;
    }
    getNotificationBody(job) {
        const address = job.templateData.address || 'Unknown location';
        return `${job.templateData.emergencyType} emergency. Location: ${address}. Tap to view details and respond.`;
    }
    getErrorMessage(error) {
        const errorCode = error.code;
        switch (errorCode) {
            case 'messaging/invalid-registration-token':
            case 'messaging/registration-token-not-registered':
                return 'Invalid or expired FCM token';
            case 'messaging/invalid-package-name':
                return 'Invalid app package name';
            case 'messaging/message-rate-exceeded':
                return 'Rate limit exceeded';
            case 'messaging/device-message-rate-exceeded':
                return 'Device rate limit exceeded';
            case 'messaging/too-many-topics':
                return 'Too many topics subscribed';
            case 'messaging/invalid-apns-credentials':
                return 'Invalid APNs credentials';
            case 'messaging/mismatched-credential':
                return 'Credential mismatch';
            case 'messaging/authentication-error':
                return 'Authentication failed';
            case 'messaging/server-unavailable':
                return 'FCM server unavailable';
            default:
                return error.message || 'Unknown FCM error';
        }
    }
}
// Export singleton instance
exports.fcmProvider = new FCMProvider();
//# sourceMappingURL=fcm.provider.js.map