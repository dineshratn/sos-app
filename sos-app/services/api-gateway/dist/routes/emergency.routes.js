"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const httpClient_1 = __importDefault(require("../utils/httpClient"));
const errorHandler_1 = require("../middleware/errorHandler");
const authMiddleware_1 = require("../middleware/authMiddleware");
const rateLimiter_1 = require("../middleware/rateLimiter");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
/**
 * Emergency Service Routes
 * Proxies requests to emergency-service
 * All routes require authentication
 */
// Apply authentication middleware to all routes
router.use(authMiddleware_1.authenticateToken);
// ==================== Emergency Alert Routes ====================
/**
 * @route   POST /api/v1/emergencies
 * @desc    Create new emergency alert
 * @access  Private
 */
router.post('/', rateLimiter_1.emergencyRateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.default.info(`Proxying create emergency alert for user ${req.user?.userId}`);
    const response = await httpClient_1.default.post('emergency', '/api/v1/emergencies', req.body, {
        headers: {
            Authorization: req.headers.authorization,
        },
    });
    res.status(response.status).json(response.data);
}));
/**
 * @route   GET /api/v1/emergencies
 * @desc    Get user's emergency alerts
 * @access  Private
 */
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.default.info(`Proxying get emergency alerts for user ${req.user?.userId}`);
    const response = await httpClient_1.default.get('emergency', '/api/v1/emergencies', {
        headers: {
            Authorization: req.headers.authorization,
        },
        params: req.query,
    });
    res.status(response.status).json(response.data);
}));
/**
 * @route   GET /api/v1/emergencies/:emergencyId
 * @desc    Get specific emergency alert
 * @access  Private
 */
router.get('/:emergencyId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.default.info(`Proxying get emergency ${req.params.emergencyId}`);
    const response = await httpClient_1.default.get('emergency', `/api/v1/emergencies/${req.params.emergencyId}`, {
        headers: {
            Authorization: req.headers.authorization,
        },
    });
    res.status(response.status).json(response.data);
}));
/**
 * @route   PUT /api/v1/emergencies/:emergencyId/status
 * @desc    Update emergency status
 * @access  Private
 */
router.put('/:emergencyId/status', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.default.info(`Proxying update emergency status ${req.params.emergencyId}`);
    const response = await httpClient_1.default.put('emergency', `/api/v1/emergencies/${req.params.emergencyId}/status`, req.body, {
        headers: {
            Authorization: req.headers.authorization,
        },
    });
    res.status(response.status).json(response.data);
}));
/**
 * @route   PUT /api/v1/emergencies/:emergencyId/cancel
 * @desc    Cancel emergency alert
 * @access  Private
 */
router.put('/:emergencyId/cancel', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.default.info(`Proxying cancel emergency ${req.params.emergencyId}`);
    const response = await httpClient_1.default.put('emergency', `/api/v1/emergencies/${req.params.emergencyId}/cancel`, req.body, {
        headers: {
            Authorization: req.headers.authorization,
        },
    });
    res.status(response.status).json(response.data);
}));
/**
 * @route   PUT /api/v1/emergencies/:emergencyId/resolve
 * @desc    Resolve emergency alert
 * @access  Private
 */
router.put('/:emergencyId/resolve', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.default.info(`Proxying resolve emergency ${req.params.emergencyId}`);
    const response = await httpClient_1.default.put('emergency', `/api/v1/emergencies/${req.params.emergencyId}/resolve`, req.body, {
        headers: {
            Authorization: req.headers.authorization,
        },
    });
    res.status(response.status).json(response.data);
}));
/**
 * @route   GET /api/v1/emergencies/:emergencyId/timeline
 * @desc    Get emergency timeline/history
 * @access  Private
 */
router.get('/:emergencyId/timeline', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.default.info(`Proxying get emergency timeline ${req.params.emergencyId}`);
    const response = await httpClient_1.default.get('emergency', `/api/v1/emergencies/${req.params.emergencyId}/timeline`, {
        headers: {
            Authorization: req.headers.authorization,
        },
    });
    res.status(response.status).json(response.data);
}));
exports.default = router;
//# sourceMappingURL=emergency.routes.js.map