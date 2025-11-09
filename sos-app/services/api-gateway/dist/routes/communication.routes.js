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
 * Communication Service Routes
 * Proxies requests to communication-service
 * All routes require authentication
 */
// Apply authentication middleware to all routes
router.use(authMiddleware_1.authenticateToken);
// ==================== Chat/Messaging Routes ====================
/**
 * @route   POST /api/v1/communications/messages
 * @desc    Send message to emergency contact
 * @access  Private
 */
router.post('/messages', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.default.info(`Proxying send message for user ${req.user?.userId}`);
    const response = await httpClient_1.default.post('communication', '/api/v1/communications/messages', req.body, {
        headers: {
            Authorization: req.headers.authorization,
        },
    });
    res.status(response.status).json(response.data);
}));
/**
 * @route   GET /api/v1/communications/messages
 * @desc    Get user's messages
 * @access  Private
 */
router.get('/messages', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.default.info(`Proxying get messages for user ${req.user?.userId}`);
    const response = await httpClient_1.default.get('communication', '/api/v1/communications/messages', {
        headers: {
            Authorization: req.headers.authorization,
        },
        params: req.query,
    });
    res.status(response.status).json(response.data);
}));
/**
 * @route   GET /api/v1/communications/conversations/:conversationId
 * @desc    Get conversation messages
 * @access  Private
 */
router.get('/conversations/:conversationId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.default.info(`Proxying get conversation ${req.params.conversationId}`);
    const response = await httpClient_1.default.get('communication', `/api/v1/communications/conversations/${req.params.conversationId}`, {
        headers: {
            Authorization: req.headers.authorization,
        },
        params: req.query,
    });
    res.status(response.status).json(response.data);
}));
// ==================== Voice/Video Call Routes ====================
/**
 * @route   POST /api/v1/communications/calls
 * @desc    Initiate voice/video call
 * @access  Private
 */
router.post('/calls', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.default.info(`Proxying initiate call for user ${req.user?.userId}`);
    const response = await httpClient_1.default.post('communication', '/api/v1/communications/calls', req.body, {
        headers: {
            Authorization: req.headers.authorization,
        },
    });
    res.status(response.status).json(response.data);
}));
/**
 * @route   PUT /api/v1/communications/calls/:callId/status
 * @desc    Update call status (answer, end, etc.)
 * @access  Private
 */
router.put('/calls/:callId/status', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.default.info(`Proxying update call status ${req.params.callId}`);
    const response = await httpClient_1.default.put('communication', `/api/v1/communications/calls/${req.params.callId}/status`, req.body, {
        headers: {
            Authorization: req.headers.authorization,
        },
    });
    res.status(response.status).json(response.data);
}));
/**
 * @route   GET /api/v1/communications/calls/history
 * @desc    Get call history
 * @access  Private
 */
router.get('/calls/history', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    logger_1.default.info(`Proxying get call history for user ${req.user?.userId}`);
    const response = await httpClient_1.default.get('communication', '/api/v1/communications/calls/history', {
        headers: {
            Authorization: req.headers.authorization,
        },
        params: req.query,
    });
    res.status(response.status).json(response.data);
}));
exports.default = router;
//# sourceMappingURL=communication.routes.js.map