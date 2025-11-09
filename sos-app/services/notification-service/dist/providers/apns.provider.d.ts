import apn from '@parse/node-apn';
import { NotificationJob } from '../models/Notification';
export interface APNsResult {
    success: boolean;
    messageId?: string;
    error?: string;
    failedTokens?: string[];
}
declare class APNsProvider {
    private provider;
    private initialized;
    constructor();
    private initialize;
    /**
     * Send critical push notification via Apple Push Notification service
     * Uses interruption-level=critical to bypass Do Not Disturb
     */
    sendCriticalNotification(job: NotificationJob): Promise<APNsResult>;
    /**
     * Send to multiple tokens
     */
    sendMultiple(tokens: string[], job: NotificationJob): Promise<apn.Responses<any, any>>;
    /**
     * Shutdown provider gracefully
     */
    shutdown(): Promise<void>;
    private getNotificationTitle;
    private getNotificationBody;
    private getErrorMessage;
}
export declare const apnsProvider: APNsProvider;
export {};
//# sourceMappingURL=apns.provider.d.ts.map