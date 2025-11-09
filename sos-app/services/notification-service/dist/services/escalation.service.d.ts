import { EmergencyContact, Emergency } from '../models/Notification';
interface EscalationData {
    emergencyId: string;
    userId: string;
    userName: string;
    emergencyType: string;
    location: {
        latitude: number;
        longitude: number;
        address?: string;
    };
    secondaryContacts: EmergencyContact[];
    escalationReason: string;
    timestamp: Date;
}
/**
 * Handle emergency escalation to secondary contacts
 */
export declare function handleEscalation(data: EscalationData): Promise<void>;
/**
 * Schedule escalation for an emergency if primary contacts don't acknowledge
 */
export declare function scheduleEscalation(emergency: Emergency, secondaryContacts: EmergencyContact[]): void;
/**
 * Cancel scheduled escalation (called when primary contact acknowledges)
 */
export declare function cancelEscalation(emergencyId: string): void;
/**
 * Stop follow-up notifications
 */
export declare function stopFollowUpNotifications(emergencyId: string): void;
/**
 * Check if emergency has been acknowledged
 */
export declare function checkAcknowledgment(emergencyId: string): Promise<boolean>;
/**
 * Get escalation status for an emergency
 */
export declare function getEscalationStatus(emergencyId: string): {
    scheduled: boolean;
    followUpActive: boolean;
};
/**
 * Clean up all escalation timers and intervals
 */
export declare function cleanupAllEscalations(): void;
export {};
//# sourceMappingURL=escalation.service.d.ts.map