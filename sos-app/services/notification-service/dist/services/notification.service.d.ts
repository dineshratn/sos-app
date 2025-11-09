import { Emergency, EmergencyContact, NotificationBatch } from '../models/Notification';
/**
 * Dispatch emergency alert to all emergency contacts via multiple channels
 */
export declare function dispatchEmergencyAlert(emergency: Emergency, contacts: EmergencyContact[]): Promise<NotificationBatch>;
/**
 * Dispatch location update notification
 */
export declare function dispatchLocationUpdate(emergencyId: string, _location: {
    latitude: number;
    longitude: number;
    address?: string;
}, contacts: EmergencyContact[]): Promise<void>;
/**
 * Dispatch acknowledgment notification to user
 */
export declare function dispatchAcknowledgmentNotification(emergencyId: string, acknowledgedBy: string, userId: string, userContactInfo: {
    fcmToken?: string;
    apnsToken?: string;
    phone?: string;
}): Promise<void>;
/**
 * Get batch status
 */
export declare function getBatchStatus(batchId: string): Promise<NotificationBatch | null>;
/**
 * Update batch statistics
 */
export declare function updateBatchStats(batchId: string, stats: Partial<{
    sentCount: number;
    deliveredCount: number;
    failedCount: number;
    pendingCount: number;
}>): Promise<void>;
//# sourceMappingURL=notification.service.d.ts.map