import { Model } from 'sequelize-typescript';
import EmergencyContact from './EmergencyContact';
export interface UserProfileAttributes {
    id?: string;
    userId: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: Date;
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    phoneNumber?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
    medicalConditions?: string;
    allergies?: string;
    medications?: string;
    emergencyNotes?: string;
    profilePictureUrl?: string;
    notificationPreferences?: Record<string, any>;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
}
export default class UserProfile extends Model<UserProfileAttributes> {
    id: string;
    userId: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: Date;
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    phoneNumber?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
    medicalConditions?: string;
    allergies?: string;
    medications?: string;
    emergencyNotes?: string;
    profilePictureUrl?: string;
    notificationPreferences?: Record<string, any>;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    emergencyContacts: EmergencyContact[];
    /**
     * Get full name
     */
    getFullName(): string;
    /**
     * Check if profile is complete
     * (has minimum required information)
     */
    isProfileComplete(): boolean;
    /**
     * Get age from date of birth
     */
    getAge(): number | null;
    /**
     * Return safe object (without sensitive data if needed)
     */
    toSafeObject(): Partial<UserProfileAttributes>;
    /**
     * Return minimal public profile
     * (for sharing with emergency contacts)
     */
    toPublicProfile(): Partial<UserProfileAttributes>;
}
//# sourceMappingURL=UserProfile.d.ts.map