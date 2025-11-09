"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const profile_service_1 = __importDefault(require("../services/profile.service"));
const errorHandler_1 = require("../middleware/errorHandler");
const authMiddleware_1 = require("../middleware/authMiddleware");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
/**
 * User Profile Routes
 * All routes require authentication
 */
// Apply authentication to all routes
router.use(authMiddleware_1.validateToken);
/**
 * @route   GET /api/v1/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    logger_1.default.info(`Getting profile for user: ${userId}`);
    const profile = await profile_service_1.default.getProfile(userId);
    res.status(200).json({
        success: true,
        profile: profile.toSafeObject(),
    });
}));
/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    logger_1.default.info(`Updating profile for user: ${userId}`);
    const profile = await profile_service_1.default.updateProfile(userId, req.body);
    res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        profile: profile.toSafeObject(),
    });
}));
/**
 * @route   DELETE /api/v1/users/profile
 * @desc    Delete user account (soft delete)
 * @access  Private
 */
router.delete('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    logger_1.default.info(`Deleting profile for user: ${userId}`);
    await profile_service_1.default.deleteProfile(userId);
    res.status(200).json({
        success: true,
        message: 'Profile deleted successfully',
    });
}));
exports.default = router;
//# sourceMappingURL=profile.routes.js.map