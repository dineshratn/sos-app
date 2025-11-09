"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const httpClient_1 = __importDefault(require("../utils/httpClient"));
const errorHandler_1 = require("../middleware/errorHandler");
const authMiddleware_1 = require("../middleware/authMiddleware");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
/**
 * User Service Routes
 * Proxies requests to user-service
 * All routes require authentication
 */
// Apply authentication middleware to all routes
router.use(authMiddleware_1.authenticateToken);
// ==================== User Profile Routes ====================
/**
 * @route   GET /api/v1/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.default.info(`Proxying get profile request for user ${req.user?.userId}`);
    const response = await httpClient_1.default.get('user', '/api/v1/users/profile', {
        headers: {
            Authorization: req.headers.authorization,
        },
    });
    res.status(response.status).json(response.data);
}));
/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.default.info(`Proxying update profile request for user ${req.user?.userId}`);
    const response = await httpClient_1.default.put('user', '/api/v1/users/profile', req.body, {
        headers: {
            Authorization: req.headers.authorization,
        },
    });
    res.status(response.status).json(response.data);
}));
/**
 * @route   DELETE /api/v1/users/profile
 * @desc    Delete user account
 * @access  Private
 */
router.delete('/profile', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.default.info(`Proxying delete profile request for user ${req.user?.userId}`);
    const response = await httpClient_1.default.delete('user', '/api/v1/users/profile', {
        headers: {
            Authorization: req.headers.authorization,
        },
    });
    res.status(response.status).json(response.data);
}));
// ==================== Emergency Contacts Routes ====================
/**
 * @route   GET /api/v1/users/emergency-contacts
 * @desc    Get all emergency contacts
 * @access  Private
 */
router.get('/emergency-contacts', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.default.info(`Proxying get emergency contacts for user ${req.user?.userId}`);
    const response = await httpClient_1.default.get('user', '/api/v1/users/emergency-contacts', {
        headers: {
            Authorization: req.headers.authorization,
        },
    });
    res.status(response.status).json(response.data);
}));
/**
 * @route   POST /api/v1/users/emergency-contacts
 * @desc    Add emergency contact
 * @access  Private
 */
router.post('/emergency-contacts', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.default.info(`Proxying add emergency contact for user ${req.user?.userId}`);
    const response = await httpClient_1.default.post('user', '/api/v1/users/emergency-contacts', req.body, {
        headers: {
            Authorization: req.headers.authorization,
        },
    });
    res.status(response.status).json(response.data);
}));
/**
 * @route   GET /api/v1/users/emergency-contacts/:contactId
 * @desc    Get specific emergency contact
 * @access  Private
 */
router.get('/emergency-contacts/:contactId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.default.info(`Proxying get emergency contact ${req.params.contactId}`);
    const response = await httpClient_1.default.get('user', `/api/v1/users/emergency-contacts/${req.params.contactId}`, {
        headers: {
            Authorization: req.headers.authorization,
        },
    });
    res.status(response.status).json(response.data);
}));
/**
 * @route   PUT /api/v1/users/emergency-contacts/:contactId
 * @desc    Update emergency contact
 * @access  Private
 */
router.put('/emergency-contacts/:contactId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.default.info(`Proxying update emergency contact ${req.params.contactId}`);
    const response = await httpClient_1.default.put('user', `/api/v1/users/emergency-contacts/${req.params.contactId}`, req.body, {
        headers: {
            Authorization: req.headers.authorization,
        },
    });
    res.status(response.status).json(response.data);
}));
/**
 * @route   DELETE /api/v1/users/emergency-contacts/:contactId
 * @desc    Delete emergency contact
 * @access  Private
 */
router.delete('/emergency-contacts/:contactId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.default.info(`Proxying delete emergency contact ${req.params.contactId}`);
    const response = await httpClient_1.default.delete('user', `/api/v1/users/emergency-contacts/${req.params.contactId}`, {
        headers: {
            Authorization: req.headers.authorization,
        },
    });
    res.status(response.status).json(response.data);
}));
exports.default = router;
//# sourceMappingURL=user.routes.js.map