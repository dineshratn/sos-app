"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.smsProvider = void 0;
const twilio_1 = __importDefault(require("twilio"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
class SMSProvider {
    client = null;
    initialized = false;
    constructor() {
        this.initialize();
    }
    initialize() {
        try {
            if (!config_1.config.twilio.accountSid || !config_1.config.twilio.authToken || !config_1.config.twilio.phoneNumber) {
                logger_1.logger.warn('Twilio configuration incomplete, SMS provider disabled');
                return;
            }
            this.client = (0, twilio_1.default)(config_1.config.twilio.accountSid, config_1.config.twilio.authToken);
            this.initialized = true;
            logger_1.logger.info('Twilio SMS provider initialized successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize Twilio SMS provider', {
                error: error.message,
            });
        }
    }
    /**
     * Send SMS notification via Twilio
     */
    async sendSMS(job) {
        if (!this.initialized || !this.client) {
            return {
                success: false,
                error: 'Twilio SMS provider not initialized',
            };
        }
        const phoneNumber = job.contactInfo.phone;
        if (!phoneNumber) {
            return {
                success: false,
                error: 'Phone number not provided',
            };
        }
        try {
            const message = this.formatSMSMessage(job);
            const response = await this.client.messages.create({
                body: message,
                from: config_1.config.twilio.phoneNumber,
                to: phoneNumber,
                statusCallback: this.getStatusCallbackUrl(job),
            });
            logger_1.logger.info('SMS sent successfully', {
                emergencyId: job.emergencyId,
                recipientId: job.recipientId,
                messageId: response.sid,
                status: response.status,
                to: phoneNumber,
            });
            return {
                success: true,
                messageId: response.sid,
                status: response.status,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to send SMS', {
                emergencyId: job.emergencyId,
                recipientId: job.recipientId,
                error: error.message,
                code: error.code,
                status: error.status,
            });
            return {
                success: false,
                error: this.getErrorMessage(error),
            };
        }
    }
    /**
     * Send SMS to multiple recipients
     */
    async sendBulkSMS(phoneNumbers, job) {
        if (!this.initialized || !this.client) {
            throw new Error('Twilio SMS provider not initialized');
        }
        const message = this.formatSMSMessage(job);
        const promises = phoneNumbers.map(async (phoneNumber) => {
            try {
                const response = await this.client.messages.create({
                    body: message,
                    from: config_1.config.twilio.phoneNumber,
                    to: phoneNumber,
                });
                return {
                    success: true,
                    messageId: response.sid,
                    status: response.status,
                };
            }
            catch (error) {
                return {
                    success: false,
                    error: this.getErrorMessage(error),
                };
            }
        });
        return Promise.all(promises);
    }
    /**
     * Get message status
     */
    async getMessageStatus(messageId) {
        if (!this.initialized || !this.client) {
            return null;
        }
        try {
            const message = await this.client.messages(messageId).fetch();
            return message.status;
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch message status', {
                messageId,
                error: error.message,
            });
            return null;
        }
    }
    /**
     * Validate phone number format
     */
    async validatePhoneNumber(phoneNumber) {
        if (!this.initialized || !this.client) {
            return false;
        }
        try {
            const lookup = await this.client.lookups.v2
                .phoneNumbers(phoneNumber)
                .fetch();
            return lookup.valid || false;
        }
        catch (error) {
            return false;
        }
    }
    formatSMSMessage(job) {
        const { userName, emergencyType, address, emergencyLink } = job.templateData;
        const location = address || job.templateData.location;
        return (`🆘 EMERGENCY ALERT!\n\n` +
            `${userName} has triggered a ${emergencyType} emergency.\n\n` +
            `Location: ${location}\n\n` +
            `View details and respond: ${emergencyLink}\n\n` +
            `This is an automated emergency notification from SOS App.`);
    }
    getStatusCallbackUrl(job) {
        const baseUrl = process.env.BASE_URL || 'http://localhost:3005';
        return `${baseUrl}/api/v1/webhooks/twilio/status?emergencyId=${job.emergencyId}&recipientId=${job.recipientId}`;
    }
    getErrorMessage(error) {
        const errorCode = error.code;
        switch (errorCode) {
            case 21211:
                return 'Invalid phone number';
            case 21408:
                return 'Permission to send SMS not granted';
            case 21610:
                return 'Phone number is blacklisted';
            case 21614:
                return 'Invalid mobile number';
            case 30001:
                return 'Queue overflow';
            case 30002:
                return 'Account suspended';
            case 30003:
                return 'Unreachable destination';
            case 30004:
                return 'Message blocked';
            case 30005:
                return 'Unknown destination';
            case 30006:
                return 'Landline or unreachable carrier';
            case 30007:
                return 'Carrier violation';
            case 30008:
                return 'Unknown error';
            case 30009:
                return 'Missing segment';
            case 30010:
                return 'Message price exceeds limit';
            case 21601:
                return 'Phone number is not SMS-capable';
            case 21602:
                return 'Message exceeds maximum length';
            case 21603:
                return 'From number is required';
            case 21604:
                return 'To number is required';
            case 21605:
                return 'Body is required';
            case 21606:
                return 'From number is not valid';
            case 21201:
                return 'No International Authorization';
            case 21612:
                return 'Cannot route to this number';
            case 21617:
                return 'Phone number does not belong to you';
            default:
                return error.message || 'SMS delivery failed';
        }
    }
}
// Export singleton instance
exports.smsProvider = new SMSProvider();
//# sourceMappingURL=sms.provider.js.map