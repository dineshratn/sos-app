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
 * Notification Service Routes
 * Proxies requests to notification-service
 * All routes require authentication
 */
// Apply authentication middleware to all routes
router.use(authMiddleware_1.authenticateToken);
// ==================== Notification Routes ====================
/**
 * @route   GET /api/v1/notifications
 * @desc    Get user's notifications
 * @access  Private
 */
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.default.info(`Proxying get notifications for user ${req.user?.userId}`);
    const response = await httpClient_1.default.get('notification', '/api/v1/notifications', {
        headers: {
            Authorization: req.headers.authorization,
        },
        params: req.query,
    });
    res.status(response.status).json(response.data);
}));
/**
 * @route   GET /api/v1/notifications/:notificationId
 * @desc    Get specific notification
 * @access  Private
 */
router.get('/:notificationId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.default.info(`Proxying get notification ${req.params.notificationId}`);
    const response = await httpClient_1.default.get('notification', `/api/v1/notifications/${req.params.notificationId}`, {
        headers: {
            Authorization: req.headers.authorization,
        },
    });
    res.status(response.status).json(response.data);
}));
/**
 * @route   PUT /api/v1/notifications/:notificationId/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/:notificationId/read', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.default.info(`Proxying mark notification as read ${req.params.notificationId}`);
    const response = await httpClient_1.default.put('notification', `/api/v1/notifications/${req.params.notificationId}/read`, req.body, {
        headers: {
            Authorization: req.headers.authorization,
        },
    });
    res.status(response.status).json(response.data);
}));
/**
 * @route   PUT /api/v1/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/mark-all-read', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.default.info(`Proxying mark all notifications as read for user ${req.user?.userId}`);
    const response = await httpClient_1.default.put('notification', '/api/v1/notifications/mark-all-read', req.body, {
        headers: {
            Authorization: req.headers.authorization,
        },
    });
    res.status(response.status).json(response.data);
}));
/**
 * @route   DELETE /api/v1/notifications/:notificationId
 * @desc    Delete notification
 * @access  Private
 */
router.delete('/:notificationId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.default.info(`Proxying delete notification ${req.params.notificationId}`);
    const response = await httpClient_1.default.delete('notification', `/api/v1/notifications/${req.params.notificationId}`, {
        headers: {
            Authorization: req.headers.authorization,
        },
    });
    res.status(response.status).json(response.data);
}));
/**
 * @route   GET /api/v1/notifications/unread/count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get('/unread/count', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.default.info(`Proxying get unread count for user ${req.user?.userId}`);
    const response = await httpClient_1.default.get('notification', '/api/v1/notifications/unread/count', {
        headers: {
            Authorization: req.headers.authorization,
        },
    });
    res.status(response.status).json(response.data);
}));
// ==================== Notification Preferences Routes ====================
/**
 * @route   GET /api/v1/notifications/preferences
 * @desc    Get notification preferences
 * @access  Private
 */
router.get('/preferences', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.default.info(`Proxying get notification preferences for user ${req.user?.userId}`);
    const response = await httpClient_1.default.get('notification', '/api/v1/notifications/preferences', {
        headers: {
            Authorization: req.headers.authorization,
        },
    });
    res.status(response.status).json(response.data);
}));
/**
 * @route   PUT /api/v1/notifications/preferences
 * @desc    Update notification preferences
 * @access  Private
 */
router.put('/preferences', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.default.info(`Proxying update notification preferences for user ${req.user?.userId}`);
    const response = await httpClient_1.default.put('notification', '/api/v1/notifications/preferences', req.body, {
        headers: {
            Authorization: req.headers.authorization,
        },
    });
    res.status(response.status).json(response.data);
}));
exports.default = router;
//# sourceMappingURL=notification.routes.js.map