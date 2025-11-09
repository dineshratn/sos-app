import UserProfile from '../models/UserProfile';
export interface UpdateProfileData {
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
}
declare class ProfileService {
    /**
     * Get user profile by user ID
     * Creates profile if it doesn't exist
     */
    getProfile(userId: string): Promise<UserProfile>;
    /**
     * Update user profile
     */
    updateProfile(userId: string, data: UpdateProfileData): Promise<UserProfile>;
    /**
     * Delete user profile (soft delete)
     */
    deleteProfile(userId: string): Promise<void>;
    /**
     * Check if profile exists
     */
    profileExists(userId: string): Promise<boolean>;
    /**
     * Get profile by ID (internal use)
     */
    getProfileById(profileId: string): Promise<UserProfile | null>;
}
declare const _default: ProfileService;
export default _default;
//# sourceMappingURL=profile.service.d.ts.map