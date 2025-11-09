"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const joi_1 = __importDefault(require("joi"));
const user_service_1 = __importDefault(require("../services/user.service"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
/**
 * Validation Schemas
 */
const updateProfileSchema = joi_1.default.object({
    firstName: joi_1.default.string().min(1).max(100).optional(),
    lastName: joi_1.default.string().min(1).max(100).optional(),
    dateOfBirth: joi_1.default.date().iso().max('now').optional(),
    profilePictureUrl: joi_1.default.string().uri().max(500).optional(),
    phoneNumber: joi_1.default.string().min(10).max(20).optional(),
    address: joi_1.default.string().max(500).optional(),
    city: joi_1.default.string().max(100).optional(),
    state: joi_1.default.string().max(100).optional(),
    country: joi_1.default.string().max(100).optional(),
    postalCode: joi_1.default.string().max(20).optional(),
    timezone: joi_1.default.string().max(50).optional(),
    language: joi_1.default.string().length(2).optional(),
    notificationPreferences: joi_1.default.object().optional(),
});
/**
 * @route   GET /api/v1/users/me
 * @desc    Get current user's profile
 * @access  Private
 */
router.get('/me', auth_1.validateToken, async (req, res, next) => {
    try {
        const userId = req.userId;
        // Get or create profile if it doesn't exist
        const profile = await user_service_1.default.getOrCreateUserProfile(userId);
        res.json({
            success: true,
            data: {
                profile: profile.toSafeObject(),
            },
            message: 'User profile retrieved successfully',
        });
    }
    catch (error) {
        logger_1.default.error('Error in GET /api/v1/users/me:', error);
        next(error);
    }
});
/**
 * @route   PUT /api/v1/users/me
 * @desc    Update current user's profile
 * @access  Private
 */
router.put('/me', auth_1.validateToken, async (req, res, next) => {
    try {
        const userId = req.userId;
        // Validate request body
        const { error, value } = updateProfileSchema.validate(req.body);
        if (error) {
            throw new errorHandler_1.AppError(`Validation error: ${error.details.map((d) => d.message).join(', ')}`, 400, 'VALIDATION_ERROR');
        }
        // Update profile
        const profile = await user_service_1.default.updateUserProfile(userId, value);
        res.json({
            success: true,
            data: {
                profile: profile.toSafeObject(),
            },
            message: 'User profile updated successfully',
        });
    }
    catch (error) {
        logger_1.default.error('Error in PUT /api/v1/users/me:', error);
        next(error);
    }
});
/**
 * @route   DELETE /api/v1/users/me
 * @desc    Delete current user's account (soft delete)
 * @access  Private
 */
router.delete('/me', auth_1.validateToken, async (req, res, next) => {
    try {
        const userId = req.userId;
        // Soft delete the user profile
        await user_service_1.default.deleteUserProfile(userId);
        res.json({
            success: true,
            data: null,
            message: 'User account deleted successfully',
        });
    }
    catch (error) {
        logger_1.default.error('Error in DELETE /api/v1/users/me:', error);
        next(error);
    }
});
/**
 * @route   GET /api/v1/users/me/age
 * @desc    Get current user's age
 * @access  Private
 */
router.get('/me/age', auth_1.validateToken, async (req, res, next) => {
    try {
        const userId = req.userId;
        const age = await user_service_1.default.getUserAge(userId);
        res.json({
            success: true,
            data: {
                age,
            },
            message: age !== null ? 'Age calculated successfully' : 'Date of birth not set',
        });
    }
    catch (error) {
        logger_1.default.error('Error in GET /api/v1/users/me/age:', error);
        next(error);
    }
});
/**
 * @route   PUT /api/v1/users/me/picture
 * @desc    Update profile picture URL
 * @access  Private
 */
router.put('/me/picture', auth_1.validateToken, async (req, res, next) => {
    try {
        const userId = req.userId;
        const { pictureUrl } = req.body;
        if (!pictureUrl) {
            throw new errorHandler_1.AppError('Picture URL is required', 400, 'PICTURE_URL_REQUIRED');
        }
        // Validate URL format
        const urlSchema = joi_1.default.string().uri().max(500);
        const { error } = urlSchema.validate(pictureUrl);
        if (error) {
            throw new errorHandler_1.AppError('Invalid picture URL format', 400, 'INVALID_URL');
        }
        const profile = await user_service_1.default.updateProfilePicture(userId, pictureUrl);
        res.json({
            success: true,
            data: {
                profilePictureUrl: profile.profilePictureUrl,
            },
            message: 'Profile picture updated successfully',
        });
    }
    catch (error) {
        logger_1.default.error('Error in PUT /api/v1/users/me/picture:', error);
        next(error);
    }
});
/**
 * @route   PUT /api/v1/users/me/notifications
 * @desc    Update notification preferences
 * @access  Private
 */
router.put('/me/notifications', auth_1.validateToken, async (req, res, next) => {
    try {
        const userId = req.userId;
        const preferences = req.body;
        if (!preferences || typeof preferences !== 'object') {
            throw new errorHandler_1.AppError('Notification preferences must be an object', 400, 'INVALID_PREFERENCES');
        }
        const profile = await user_service_1.default.updateNotificationPreferences(userId, preferences);
        res.json({
            success: true,
            data: {
                notificationPreferences: profile.notificationPreferences,
            },
            message: 'Notification preferences updated successfully',
        });
    }
    catch (error) {
        logger_1.default.error('Error in PUT /api/v1/users/me/notifications:', error);
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=user.routes.js.map