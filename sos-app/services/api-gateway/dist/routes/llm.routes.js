"use strict";
/**
 * LLM Service Routes
 *
 * Proxy routes to LLM Service for AI-powered emergency assessment and first aid guidance
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const httpClient_1 = __importDefault(require("../utils/httpClient"));
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
/**
 * POST /api/v1/llm/assess
 * AI-powered emergency severity assessment
 */
router.post('/assess', authMiddleware_1.authenticateToken, async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        logger_1.default.info(`LLM assessment request from user: ${userId}`);
        const response = await httpClient_1.default.post('llm', '/api/v1/llm/assess', req.body, {
            headers: {
                'X-User-Id': userId,
                'X-Request-Id': req.headers['x-request-id'],
            },
        });
        res.status(response.status).json(response.data);
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/v1/llm/first-aid
 * AI-powered first aid guidance
 */
router.post('/first-aid', authMiddleware_1.authenticateToken, async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        logger_1.default.info(`LLM first aid request from user: ${userId}`);
        const response = await httpClient_1.default.post('llm', '/api/v1/llm/first-aid', req.body, {
            headers: {
                'X-User-Id': userId,
                'X-Request-Id': req.headers['x-request-id'],
            },
        });
        res.status(response.status).json(response.data);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/llm/health
 * Check LLM service health
 */
router.get('/health', async (_req, res, next) => {
    try {
        const response = await httpClient_1.default.get('llm', '/health');
        res.status(response.status).json(response.data);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=llm.routes.js.map