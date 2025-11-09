import { NotificationJob } from '../models/Notification';
export interface SMSResult {
    success: boolean;
    messageId?: string;
    error?: string;
    status?: string;
}
declare class SMSProvider {
    private client;
    private initialized;
    constructor();
    private initialize;
    /**
     * Send SMS notification via Twilio
     */
    sendSMS(job: NotificationJob): Promise<SMSResult>;
    /**
     * Send SMS to multiple recipients
     */
    sendBulkSMS(phoneNumbers: string[], job: NotificationJob): Promise<SMSResult[]>;
    /**
     * Get message status
     */
    getMessageStatus(messageId: string): Promise<string | null>;
    /**
     * Validate phone number format
     */
    validatePhoneNumber(phoneNumber: string): Promise<boolean>;
    private formatSMSMessage;
    private getStatusCallbackUrl;
    private getErrorMessage;
}
export declare const smsProvider: SMSProvider;
export {};
//# sourceMappingURL=sms.provider.d.ts.map