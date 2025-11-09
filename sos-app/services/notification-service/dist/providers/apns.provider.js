"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apnsProvider = void 0;
const node_apn_1 = __importDefault(require("@parse/node-apn"));
const fs_1 = __importDefault(require("fs"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
class APNsProvider {
    provider = null;
    initialized = false;
    constructor() {
        this.initialize();
    }
    initialize() {
        try {
            if (!config_1.config.apns.keyId || !config_1.config.apns.teamId || !config_1.config.apns.keyPath) {
                logger_1.logger.warn('APNs configuration incomplete, provider disabled');
                return;
            }
            // Check if key file exists
            if (!fs_1.default.existsSync(config_1.config.apns.keyPath)) {
                logger_1.logger.warn('APNs key file not found', { path: config_1.config.apns.keyPath });
                return;
            }
            const options = {
                token: {
                    key: config_1.config.apns.keyPath,
                    keyId: config_1.config.apns.keyId,
                    teamId: config_1.config.apns.teamId,
                },
                production: config_1.config.apns.production,
            };
            this.provider = new node_apn_1.default.Provider(options);
            this.initialized = true;
            logger_1.logger.info('APNs provider initialized successfully', {
                production: config_1.config.apns.production,
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize APNs provider', {
                error: error.message,
            });
        }
    }
    /**
     * Send critical push notification via Apple Push Notification service
     * Uses interruption-level=critical to bypass Do Not Disturb
     */
    async sendCriticalNotification(job) {
        if (!this.initialized || !this.provider) {
            return {
                success: false,
                error: 'APNs provider not initialized',
            };
        }
        const apnsToken = job.contactInfo.apnsToken;
        if (!apnsToken) {
            return {
                success: false,
                error: 'APNs token not provided',
            };
        }
        try {
            const notification = new node_apn_1.default.Notification();
            // Critical alert configuration
            notification.alert = {
                title: this.getNotificationTitle(job),
                body: this.getNotificationBody(job),
            };
            // Critical sound (bypasses silent mode)
            notification.sound = {
                critical: 1,
                name: 'emergency.caf',
                volume: 1.0,
            };
            // iOS 15+ interruption level
            notification.interruption = 'critical';
            // Badge
            notification.badge = 1;
            // Category for action buttons
            notification.category = 'EMERGENCY_ALERT';
            // Payload data
            notification.payload = {
                emergencyId: job.emergencyId,
                batchId: job.batchId,
                recipientId: job.recipientId,
                emergencyType: job.templateData.emergencyType,
                userName: job.templateData.userName,
                location: job.templateData.location,
                address: job.templateData.address,
                emergencyLink: job.templateData.emergencyLink,
                timestamp: new Date().toISOString(),
            };
            // Expiry (1 hour)
            notification.expiry = Math.floor(Date.now() / 1000) + 3600;
            // Priority (10 = immediate)
            notification.priority = 10;
            // Topic (bundle ID)
            notification.topic = 'com.sosapp.emergency';
            // Thread ID for grouping
            notification.threadId = job.emergencyId;
            const result = await this.provider.send(notification, apnsToken);
            if (result.sent.length > 0) {
                logger_1.logger.info('APNs notification sent successfully', {
                    emergencyId: job.emergencyId,
                    recipientId: job.recipientId,
                    deviceToken: apnsToken.substring(0, 10) + '...',
                });
                return {
                    success: true,
                    messageId: result.sent[0].device,
                };
            }
            else if (result.failed.length > 0) {
                const failure = result.failed[0];
                const errorMessage = this.getErrorMessage(failure.response);
                logger_1.logger.error('APNs notification failed', {
                    emergencyId: job.emergencyId,
                    recipientId: job.recipientId,
                    error: errorMessage,
                    status: failure.status,
                });
                return {
                    success: false,
                    error: errorMessage,
                    failedTokens: result.failed.map(f => f.device),
                };
            }
            return {
                success: false,
                error: 'Unknown APNs error',
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to send APNs notification', {
                emergencyId: job.emergencyId,
                recipientId: job.recipientId,
                error: error.message,
            });
            return {
                success: false,
                error: error.message || 'APNs send failed',
            };
        }
    }
    /**
     * Send to multiple tokens
     */
    async sendMultiple(tokens, job) {
        if (!this.initialized || !this.provider) {
            throw new Error('APNs provider not initialized');
        }
        const notification = new node_apn_1.default.Notification();
        notification.alert = {
            title: this.getNotificationTitle(job),
            body: this.getNotificationBody(job),
        };
        notification.sound = {
            critical: 1,
            name: 'emergency.caf',
            volume: 1.0,
        };
        notification.interruption = 'critical';
        notification.badge = 1;
        notification.payload = {
            emergencyId: job.emergencyId,
            emergencyType: job.templateData.emergencyType,
            userName: job.templateData.userName,
            emergencyLink: job.templateData.emergencyLink,
        };
        notification.topic = 'com.sosapp.emergency';
        return await this.provider.send(notification, tokens);
    }
    /**
     * Shutdown provider gracefully
     */
    async shutdown() {
        if (this.provider) {
            await this.provider.shutdown();
            logger_1.logger.info('APNs provider shutdown complete');
        }
    }
    getNotificationTitle(job) {
        return `🆘 EMERGENCY: ${job.templateData.userName}`;
    }
    getNotificationBody(job) {
        const address = job.templateData.address || 'Unknown location';
        return `${job.templateData.emergencyType} emergency at ${address}. Tap to respond immediately.`;
    }
    getErrorMessage(response) {
        const reason = response?.reason;
        switch (reason) {
            case 'BadDeviceToken':
                return 'Invalid device token';
            case 'DeviceTokenNotForTopic':
                return 'Device token does not match topic';
            case 'Unregistered':
                return 'Device token is inactive or unregistered';
            case 'PayloadTooLarge':
                return 'Notification payload exceeds size limit';
            case 'BadTopic':
                return 'Invalid topic';
            case 'TopicDisallowed':
                return 'Topic not allowed for this device';
            case 'BadMessageId':
                return 'Invalid message ID';
            case 'BadExpirationDate':
                return 'Invalid expiration date';
            case 'BadPriority':
                return 'Invalid priority value';
            case 'MissingDeviceToken':
                return 'Device token missing';
            case 'MissingTopic':
                return 'Topic missing';
            case 'DuplicateHeaders':
                return 'Duplicate headers in request';
            case 'InvalidPushType':
                return 'Invalid push type';
            case 'MissingPushType':
                return 'Push type missing';
            case 'BadCertificate':
                return 'Invalid certificate';
            case 'BadCertificateEnvironment':
                return 'Certificate environment mismatch';
            case 'ExpiredProviderToken':
                return 'Provider token expired';
            case 'Forbidden':
                return 'Forbidden';
            case 'InvalidProviderToken':
                return 'Invalid provider token';
            case 'MissingProviderToken':
                return 'Provider token missing';
            case 'BadPath':
                return 'Invalid API path';
            case 'MethodNotAllowed':
                return 'HTTP method not allowed';
            case 'TooManyRequests':
                return 'Too many requests';
            case 'IdleTimeout':
                return 'Connection idle timeout';
            case 'Shutdown':
                return 'Server shutting down';
            case 'InternalServerError':
                return 'APNs internal server error';
            case 'ServiceUnavailable':
                return 'APNs service unavailable';
            default:
                return reason || 'Unknown APNs error';
        }
    }
}
// Export singleton instance
exports.apnsProvider = new APNsProvider();
// Graceful shutdown
process.on('SIGTERM', async () => {
    await exports.apnsProvider.shutdown();
});
//# sourceMappingURL=apns.provider.js.map