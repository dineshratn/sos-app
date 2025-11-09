"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const UserProfile_1 = __importDefault(require("../models/UserProfile"));
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = __importDefault(require("../utils/logger"));
const phoneValidator_1 = require("../utils/phoneValidator");
class ProfileService {
    /**
     * Get user profile by user ID
     * Creates profile if it doesn't exist
     */
    async getProfile(userId) {
        try {
            let profile = await UserProfile_1.default.findOne({
                where: { userId },
                include: ['emergencyContacts'],
            });
            // Create profile if it doesn't exist
            if (!profile) {
                profile = await UserProfile_1.default.create({
                    userId,
                    isActive: true,
                });
                logger_1.default.info(`New profile created for user: ${userId}`);
            }
            return profile;
        }
        catch (error) {
            logger_1.default.error(`Error getting profile for user ${userId}:`, error);
            throw new errorHandler_1.AppError('Failed to get user profile', 500, 'PROFILE_GET_ERROR');
        }
    }
    /**
     * Update user profile
     */
    async updateProfile(userId, data) {
        try {
            // Get or create profile
            let profile = await UserProfile_1.default.findOne({ where: { userId } });
            if (!profile) {
                profile = await UserProfile_1.default.create({
                    userId,
                    isActive: true,
                });
            }
            // Validate phone number if provided
            if (data.phoneNumber) {
                const phoneValidation = (0, phoneValidator_1.validatePhoneNumber)(data.phoneNumber);
                if (!phoneValidation.isValid) {
                    throw new errorHandler_1.AppError(phoneValidation.message || 'Invalid phone number', 400, 'INVALID_PHONE_NUMBER');
                }
                // Use formatted phone number
                data.phoneNumber = phoneValidation.formatted;
            }
            // Validate date of birth if provided
            if (data.dateOfBirth) {
                const dob = new Date(data.dateOfBirth);
                const today = new Date();
                if (dob > today) {
                    throw new errorHandler_1.AppError('Date of birth cannot be in the future', 400, 'INVALID_DATE_OF_BIRTH');
                }
                const age = today.getFullYear() - dob.getFullYear();
                if (age > 150) {
                    throw new errorHandler_1.AppError('Invalid date of birth', 400, 'INVALID_DATE_OF_BIRTH');
                }
            }
            // Update profile
            await profile.update(data);
            logger_1.default.info(`Profile updated for user: ${userId}`);
            return profile;
        }
        catch (error) {
            if (error instanceof errorHandler_1.AppError) {
                throw error;
            }
            logger_1.default.error(`Error updating profile for user ${userId}:`, error);
            throw new errorHandler_1.AppError('Failed to update user profile', 500, 'PROFILE_UPDATE_ERROR');
        }
    }
    /**
     * Delete user profile (soft delete)
     */
    async deleteProfile(userId) {
        try {
            const profile = await UserProfile_1.default.findOne({ where: { userId } });
            if (!profile) {
                throw new errorHandler_1.AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');
            }
            // Soft delete (paranoid mode)
            await profile.destroy();
            logger_1.default.info(`Profile deleted for user: ${userId}`);
        }
        catch (error) {
            if (error instanceof errorHandler_1.AppError) {
                throw error;
            }
            logger_1.default.error(`Error deleting profile for user ${userId}:`, error);
            throw new errorHandler_1.AppError('Failed to delete user profile', 500, 'PROFILE_DELETE_ERROR');
        }
    }
    /**
     * Check if profile exists
     */
    async profileExists(userId) {
        try {
            const count = await UserProfile_1.default.count({ where: { userId } });
            return count > 0;
        }
        catch (error) {
            logger_1.default.error(`Error checking profile existence for user ${userId}:`, error);
            return false;
        }
    }
    /**
     * Get profile by ID (internal use)
     */
    async getProfileById(profileId) {
        try {
            return await UserProfile_1.default.findByPk(profileId);
        }
        catch (error) {
            logger_1.default.error(`Error getting profile by ID ${profileId}:`, error);
            return null;
        }
    }
}
exports.default = new ProfileService();
//# sourceMappingURL=profile.service.js.map