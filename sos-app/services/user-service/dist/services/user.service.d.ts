import UserProfile from '../models/UserProfile';
/**
 * User Profile Service
 *
 * Handles all business logic related to user profiles including:
 * - Profile creation
 * - Profile retrieval
 * - Profile updates
 * - Profile deletion (with GDPR compliance)
 */
export interface CreateUserProfileDTO {
    userId: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    profilePictureUrl?: string;
    phoneNumber?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    timezone?: string;
    language?: string;
    notificationPreferences?: Record<string, any>;
}
export interface UpdateUserProfileDTO {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    profilePictureUrl?: string;
    phoneNumber?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    timezone?: string;
    language?: string;
    notificationPreferences?: Record<string, any>;
}
declare class UserService {
    /**
     * Get user profile by user ID
     */
    getUserProfile(userId: string): Promise<UserProfile>;
    /**
     * Get or create user profile
     * Creates a profile if one doesn't exist for the user
     */
    getOrCreateUserProfile(userId: string): Promise<UserProfile>;
    /**
     * Create a new user profile
     */
    createUserProfile(data: CreateUserProfileDTO): Promise<UserProfile>;
    /**
     * Update user profile
     */
    updateUserProfile(userId: string, updates: UpdateUserProfileDTO): Promise<UserProfile>;
    /**
     * Delete user profile (soft delete)
     * GDPR compliance: marks profile as deleted without removing data immediately
     */
    deleteUserProfile(userId: string): Promise<void>;
    /**
     * Hard delete user profile (GDPR right to erasure)
     * Permanently removes all user data from the system
     */
    hardDeleteUserProfile(userId: string): Promise<void>;
    /**
     * Update profile picture URL
     */
    updateProfilePicture(userId: string, pictureUrl: string): Promise<UserProfile>;
    /**
     * Update notification preferences
     */
    updateNotificationPreferences(userId: string, preferences: Record<string, any>): Promise<UserProfile>;
    /**
     * Get user's age from date of birth
     */
    getUserAge(userId: string): Promise<number | null>;
    /**
     * Search users by name (for admin purposes)
     */
    searchUsersByName(searchTerm: string, limit?: number): Promise<UserProfile[]>;
    /**
     * Get recently created profiles (for admin purposes)
     */
    getRecentProfiles(limit?: number): Promise<UserProfile[]>;
}
declare const _default: UserService;
export default _default;
//# sourceMappingURL=user.service.d.ts.map