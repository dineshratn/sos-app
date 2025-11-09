"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const UserProfile_1 = __importDefault(require("../models/UserProfile"));
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = __importDefault(require("../utils/logger"));
const sequelize_1 = require("sequelize");
class UserService {
    /**
     * Get user profile by user ID
     */
    async getUserProfile(userId) {
        try {
            const profile = await UserProfile_1.default.findOne({
                where: { userId },
            });
            if (!profile) {
                throw new errorHandler_1.AppError('User profile not found', 404, 'PROFILE_NOT_FOUND');
            }
            return profile;
        }
        catch (error) {
            if (error instanceof errorHandler_1.AppError) {
                throw error;
            }
            logger_1.default.error('Error fetching user profile:', error);
            throw new errorHandler_1.AppError('Failed to fetch user profile', 500, 'FETCH_PROFILE_ERROR');
        }
    }
    /**
     * Get or create user profile
     * Creates a profile if one doesn't exist for the user
     */
    async getOrCreateUserProfile(userId) {
        try {
            let profile = await UserProfile_1.default.findOne({
                where: { userId },
            });
            if (!profile) {
                profile = await UserProfile_1.default.create({
                    userId,
                });
                logger_1.default.info(`Created new profile for user: ${userId}`);
            }
            return profile;
        }
        catch (error) {
            logger_1.default.error('Error getting/creating user profile:', error);
            throw new errorHandler_1.AppError('Failed to get or create user profile', 500, 'PROFILE_ERROR');
        }
    }
    /**
     * Create a new user profile
     */
    async createUserProfile(data) {
        try {
            // Check if profile already exists
            const existingProfile = await UserProfile_1.default.findOne({
                where: { userId: data.userId },
            });
            if (existingProfile) {
                throw new errorHandler_1.AppError('User profile already exists', 409, 'PROFILE_EXISTS');
            }
            // Convert dateOfBirth from string to Date if provided
            const createData = { ...data };
            if (data.dateOfBirth) {
                createData.dateOfBirth = new Date(data.dateOfBirth);
            }
            // Create new profile
            const profile = await UserProfile_1.default.create(createData);
            logger_1.default.info(`Created user profile: ${profile.id} for user: ${data.userId}`);
            return profile;
        }
        catch (error) {
            if (error instanceof errorHandler_1.AppError) {
                throw error;
            }
            logger_1.default.error('Error creating user profile:', error);
            throw new errorHandler_1.AppError('Failed to create user profile', 500, 'CREATE_PROFILE_ERROR');
        }
    }
    /**
     * Update user profile
     */
    async updateUserProfile(userId, updates) {
        try {
            const profile = await this.getUserProfile(userId);
            // Convert dateOfBirth from string to Date if provided
            const updateData = { ...updates };
            if (updates.dateOfBirth) {
                updateData.dateOfBirth = new Date(updates.dateOfBirth);
            }
            // Update profile fields
            await profile.update(updateData);
            logger_1.default.info(`Updated user profile: ${profile.id} for user: ${userId}`);
            return profile;
        }
        catch (error) {
            if (error instanceof errorHandler_1.AppError) {
                throw error;
            }
            logger_1.default.error('Error updating user profile:', error);
            throw new errorHandler_1.AppError('Failed to update user profile', 500, 'UPDATE_PROFILE_ERROR');
        }
    }
    /**
     * Delete user profile (soft delete)
     * GDPR compliance: marks profile as deleted without removing data immediately
     */
    async deleteUserProfile(userId) {
        try {
            const profile = await this.getUserProfile(userId);
            // Soft delete the profile
            await profile.destroy();
            logger_1.default.info(`Soft deleted user profile: ${profile.id} for user: ${userId}`);
        }
        catch (error) {
            if (error instanceof errorHandler_1.AppError) {
                throw error;
            }
            logger_1.default.error('Error deleting user profile:', error);
            throw new errorHandler_1.AppError('Failed to delete user profile', 500, 'DELETE_PROFILE_ERROR');
        }
    }
    /**
     * Hard delete user profile (GDPR right to erasure)
     * Permanently removes all user data from the system
     */
    async hardDeleteUserProfile(userId) {
        try {
            const profile = await UserProfile_1.default.findOne({
                where: { userId },
                paranoid: false, // Include soft-deleted records
            });
            if (!profile) {
                throw new errorHandler_1.AppError('User profile not found', 404, 'PROFILE_NOT_FOUND');
            }
            // Permanently delete the profile
            await profile.destroy({ force: true });
            logger_1.default.info(`Hard deleted user profile: ${profile.id} for user: ${userId}`);
        }
        catch (error) {
            if (error instanceof errorHandler_1.AppError) {
                throw error;
            }
            logger_1.default.error('Error hard deleting user profile:', error);
            throw new errorHandler_1.AppError('Failed to permanently delete user profile', 500, 'HARD_DELETE_ERROR');
        }
    }
    /**
     * Update profile picture URL
     */
    async updateProfilePicture(userId, pictureUrl) {
        try {
            const profile = await this.getUserProfile(userId);
            await profile.update({
                profilePictureUrl: pictureUrl,
            });
            logger_1.default.info(`Updated profile picture for user: ${userId}`);
            return profile;
        }
        catch (error) {
            if (error instanceof errorHandler_1.AppError) {
                throw error;
            }
            logger_1.default.error('Error updating profile picture:', error);
            throw new errorHandler_1.AppError('Failed to update profile picture', 500, 'UPDATE_PICTURE_ERROR');
        }
    }
    /**
     * Update notification preferences
     */
    async updateNotificationPreferences(userId, preferences) {
        try {
            const profile = await this.getUserProfile(userId);
            // Merge existing preferences with new ones
            const currentPreferences = profile.notificationPreferences || {};
            const updatedPreferences = {
                ...currentPreferences,
                ...preferences,
            };
            await profile.update({
                notificationPreferences: updatedPreferences,
            });
            logger_1.default.info(`Updated notification preferences for user: ${userId}`);
            return profile;
        }
        catch (error) {
            if (error instanceof errorHandler_1.AppError) {
                throw error;
            }
            logger_1.default.error('Error updating notification preferences:', error);
            throw new errorHandler_1.AppError('Failed to update notification preferences', 500, 'UPDATE_PREFERENCES_ERROR');
        }
    }
    /**
     * Get user's age from date of birth
     */
    async getUserAge(userId) {
        try {
            const profile = await this.getUserProfile(userId);
            return profile.getAge();
        }
        catch (error) {
            if (error instanceof errorHandler_1.AppError) {
                throw error;
            }
            logger_1.default.error('Error calculating user age:', error);
            throw new errorHandler_1.AppError('Failed to calculate user age', 500, 'AGE_CALCULATION_ERROR');
        }
    }
    /**
     * Search users by name (for admin purposes)
     */
    async searchUsersByName(searchTerm, limit = 20) {
        try {
            const profiles = await UserProfile_1.default.findAll({
                where: {
                    [sequelize_1.Op.or]: [
                        { firstName: { [sequelize_1.Op.iLike]: `%${searchTerm}%` } },
                        { lastName: { [sequelize_1.Op.iLike]: `%${searchTerm}%` } },
                    ],
                },
                limit,
                order: [['createdAt', 'DESC']],
            });
            return profiles;
        }
        catch (error) {
            logger_1.default.error('Error searching users by name:', error);
            throw new errorHandler_1.AppError('Failed to search users', 500, 'SEARCH_ERROR');
        }
    }
    /**
     * Get recently created profiles (for admin purposes)
     */
    async getRecentProfiles(limit = 20) {
        try {
            const profiles = await UserProfile_1.default.findAll({
                limit,
                order: [['createdAt', 'DESC']],
            });
            return profiles;
        }
        catch (error) {
            logger_1.default.error('Error fetching recent profiles:', error);
            throw new errorHandler_1.AppError('Failed to fetch recent profiles', 500, 'FETCH_RECENT_ERROR');
        }
    }
}
exports.default = new UserService();
//# sourceMappingURL=user.service.js.map