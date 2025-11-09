import EmergencyContact, { ContactRelationship } from '../models/EmergencyContact';
export interface CreateContactData {
    name: string;
    relationship: ContactRelationship;
    phoneNumber: string;
    alternatePhoneNumber?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    isPrimary?: boolean;
    priority?: number;
    notes?: string;
}
export interface UpdateContactData {
    name?: string;
    relationship?: ContactRelationship;
    phoneNumber?: string;
    alternatePhoneNumber?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    isPrimary?: boolean;
    priority?: number;
    notes?: string;
}
declare class EmergencyContactService {
    /**
     * Get all emergency contacts for a user
     */
    getContacts(userId: string): Promise<EmergencyContact[]>;
    /**
     * Get specific emergency contact by ID
     */
    getContactById(contactId: string, userId: string): Promise<EmergencyContact>;
    /**
     * Create new emergency contact
     */
    createContact(userId: string, data: CreateContactData): Promise<EmergencyContact>;
    /**
     * Update emergency contact
     */
    updateContact(contactId: string, userId: string, data: UpdateContactData): Promise<EmergencyContact>;
    /**
     * Delete emergency contact (soft delete)
     */
    deleteContact(contactId: string, userId: string): Promise<void>;
    /**
     * Set contact as primary
     */
    setPrimaryContact(contactId: string, userId: string): Promise<EmergencyContact>;
    /**
     * Get primary contact
     */
    getPrimaryContact(userId: string): Promise<EmergencyContact | null>;
    /**
     * Get contact count for user
     */
    getContactCount(userId: string): Promise<number>;
}
declare const _default: EmergencyContactService;
export default _default;
//# sourceMappingURL=emergencyContact.service.d.ts.map