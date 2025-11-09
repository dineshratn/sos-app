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
 * Location Service Routes
 * Proxies requests to location-service
 * All routes require authentication
 */
// Apply authentication middleware to all routes
router.use(authMiddleware_1.authenticateToken);
// ==================== Location Tracking Routes ====================
/**
 * @route   POST /api/v1/locations
 * @desc    Update user location
 * @access  Private
 */
router.post('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.default.info(`Proxying update location for user ${req.user?.userId}`);
    const response = await httpClient_1.default.post('location', '/api/v1/locations', req.body, {
        headers: {
            Authorization: req.headers.authorization,
        },
    });
    res.status(response.status).json(response.data);
}));
/**
 * @route   GET /api/v1/locations/current
 * @desc    Get user's current location
 * @access  Private
 */
router.get('/current', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.default.info(`Proxying get current location for user ${req.user?.userId}`);
    const response = await httpClient_1.default.get('location', '/api/v1/locations/current', {
        headers: {
            Authorization: req.headers.authorization,
        },
    });
    res.status(response.status).json(response.data);
}));
/**
 * @route   GET /api/v1/locations/history
 * @desc    Get user's location history
 * @access  Private
 */
router.get('/history', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.default.info(`Proxying get location history for user ${req.user?.userId}`);
    const response = await httpClient_1.default.get('location', '/api/v1/locations/history', {
        headers: {
            Authorization: req.headers.authorization,
        },
        params: req.query,
    });
    res.status(response.status).json(response.data);
}));
/**
 * @route   GET /api/v1/locations/emergency/:emergencyId
 * @desc    Get location for specific emergency
 * @access  Private
 */
router.get('/emergency/:emergencyId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.default.info(`Proxying get emergency location ${req.params.emergencyId}`);
    const response = await httpClient_1.default.get('location', `/api/v1/locations/emergency/${req.params.emergencyId}`, {
        headers: {
            Authorization: req.headers.authorization,
        },
    });
    res.status(response.status).json(response.data);
}));
/**
 * @route   POST /api/v1/locations/share
 * @desc    Share location with contacts
 * @access  Private
 */
router.post('/share', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.default.info(`Proxying share location for user ${req.user?.userId}`);
    const response = await httpClient_1.default.post('location', '/api/v1/locations/share', req.body, {
        headers: {
            Authorization: req.headers.authorization,
        },
    });
    res.status(response.status).json(response.data);
}));
exports.default = router;
//# sourceMappingURL=location.routes.js.map