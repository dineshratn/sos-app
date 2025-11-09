import EmergencyContact, { ContactPriority, ContactRelationship } from '../models/EmergencyContact';
/**
 * Emergency Contact Service
 *
 * Handles all business logic related to emergency contacts including:
 * - Contact creation with validation
 * - Contact retrieval and filtering
 * - Contact updates
 * - Contact deletion
 * - Priority management
 */
export interface CreateEmergencyContactDTO {
    name: string;
    phoneNumber: string;
    email?: string;
    relationship: ContactRelationship;
    priority: ContactPriority;
    address?: string;
    notes?: string;
}
export interface UpdateEmergencyContactDTO {
    name?: string;
    phoneNumber?: string;
    email?: string;
    relationship?: ContactRelationship;
    priority?: ContactPriority;
    address?: string;
    notes?: string;
}
declare class EmergencyContactService {
    /**
     * Get all emergency contacts for a user
     */
    getUserContacts(userId: string, options?: {
        priority?: ContactPriority;
        includeUnverified?: boolean;
    }): Promise<EmergencyContact[]>;
    /**
     * Get a single emergency contact by ID
     */
    getContactById(userId: string, contactId: string): Promise<EmergencyContact>;
    /**
     * Create a new emergency contact
     */
    createContact(userId: string, userProfileId: string, data: CreateEmergencyContactDTO): Promise<EmergencyContact>;
    /**
     * Update an emergency contact
     */
    updateContact(userId: string, contactId: string, updates: UpdateEmergencyContactDTO): Promise<EmergencyContact>;
    /**
     * Delete an emergency contact (soft delete)
     */
    deleteContact(userId: string, contactId: string): Promise<void>;
    /**
     * Mark a contact as verified
     */
    verifyContact(userId: string, contactId: string): Promise<EmergencyContact>;
    /**
     * Get primary emergency contacts
     */
    getPrimaryContacts(userId: string): Promise<EmergencyContact[]>;
    /**
     * Update last notified timestamp
     * Called when a contact is notified during an emergency
     */
    updateLastNotified(contactId: string): Promise<void>;
    /**
     * Get contacts by priority level
     */
    getContactsByPriority(userId: string, priority: ContactPriority): Promise<EmergencyContact[]>;
    /**
     * Get all verified contacts for emergency notification
     */
    getVerifiedContacts(userId: string): Promise<EmergencyContact[]>;
    /**
     * Count user's emergency contacts
     */
    countUserContacts(userId: string): Promise<number>;
    /**
     * Check if user has any primary contacts
     */
    hasPrimaryContact(userId: string): Promise<boolean>;
    /**
     * Get contact statistics for a user
     */
    getContactStats(userId: string): Promise<{
        total: number;
        active: number;
        inactive: number;
        byPriority: {
            critical: number;
            high: number;
            medium: number;
            low: number;
        };
    }>;
}
declare const _default: EmergencyContactService;
export default _default;
//# sourceMappingURL=contact.service.d.ts.map