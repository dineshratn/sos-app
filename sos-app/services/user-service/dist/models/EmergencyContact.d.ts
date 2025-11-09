import { Model } from 'sequelize-typescript';
import UserProfile from './UserProfile';
export declare enum ContactRelationship {
    SPOUSE = "spouse",
    PARENT = "parent",
    CHILD = "child",
    SIBLING = "sibling",
    FRIEND = "friend",
    PARTNER = "partner",
    RELATIVE = "relative",
    GUARDIAN = "guardian",
    CAREGIVER = "caregiver",
    NEIGHBOR = "neighbor",
    COLLEAGUE = "colleague",
    OTHER = "other"
}
export declare enum ContactPriority {
    CRITICAL = 1,
    HIGH = 2,
    MEDIUM = 3,
    LOW = 4
}
export interface EmergencyContactAttributes {
    id?: string;
    userProfileId: string;
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
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
}
export default class EmergencyContact extends Model<EmergencyContactAttributes> {
    id: string;
    userProfileId: string;
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
    isPrimary: boolean;
    priority: number;
    notes?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    userProfile: UserProfile;
    /**
     * Check if contact has complete information
     */
    isComplete(): boolean;
    /**
     * Get display name with relationship
     */
    getDisplayName(): string;
    /**
     * Return safe object
     */
    toSafeObject(): Partial<EmergencyContactAttributes>;
    /**
     * Return minimal contact info (for notifications)
     */
    toMinimalContact(): {
        id: string;
        name: string;
        phoneNumber: string;
        relationship: ContactRelationship;
    };
}
//# sourceMappingURL=EmergencyContact.d.ts.map