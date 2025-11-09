import admin from 'firebase-admin';
import { NotificationJob } from '../models/Notification';
export interface FCMResult {
    success: boolean;
    messageId?: string;
    error?: string;
}
declare class FCMProvider {
    private initialized;
    constructor();
    private initialize;
    /**
     * Send push notification via Firebase Cloud Messaging
     */
    sendPushNotification(job: NotificationJob): Promise<FCMResult>;
    /**
     * Send to multiple tokens (multicast)
     */
    sendMulticast(tokens: string[], job: NotificationJob): Promise<admin.messaging.BatchResponse>;
    /**
     * Verify if token is valid
     */
    verifyToken(token: string): Promise<boolean>;
    private getNotificationTitle;
    private getNotificationBody;
    private getErrorMessage;
}
export declare const fcmProvider: FCMProvider;
export {};
//# sourceMappingURL=fcm.provider.d.ts.map