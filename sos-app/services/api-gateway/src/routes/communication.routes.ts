import { Router, Request, Response } from 'express';
import httpClient from '../utils/httpClient';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/authMiddleware';
import logger from '../utils/logger';

const router = Router();

/**
 * Communication Service Routes
 * Proxies requests to communication-service
 * All routes require authentication
 */

// Apply authentication middleware to all routes
router.use(authenticateToken);

// ==================== Chat/Messaging Routes ====================

/**
 * @route   POST /api/v1/communications/messages
 * @desc    Send message to emergency contact
 * @access  Private
 */
router.post(
  '/messages',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Proxying send message for user ${req.user?.userId}`);

    const response = await httpClient.post('communication', '/api/v1/communications/messages', req.body, {
      headers: {
        Authorization: req.headers.authorization,
      },
    });

    res.status(response.status).json(response.data);
  })
);

/**
 * @route   GET /api/v1/communications/messages
 * @desc    Get user's messages
 * @access  Private
 */
router.get(
  '/messages',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Proxying get messages for user ${req.user?.userId}`);

    const response = await httpClient.get('communication', '/api/v1/communications/messages', {
      headers: {
        Authorization: req.headers.authorization,
      },
      params: req.query,
    });

    res.status(response.status).json(response.data);
  })
);

/**
 * @route   GET /api/v1/communications/conversations/:conversationId
 * @desc    Get conversation messages
 * @access  Private
 */
router.get(
  '/conversations/:conversationId',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Proxying get conversation ${req.params.conversationId}`);

    const response = await httpClient.get(
      'communication',
      `/api/v1/communications/conversations/${req.params.conversationId}`,
      {
        headers: {
          Authorization: req.headers.authorization,
        },
        params: req.query,
      }
    );

    res.status(response.status).json(response.data);
  })
);

// ==================== Voice/Video Call Routes ====================

/**
 * @route   POST /api/v1/communications/calls
 * @desc    Initiate voice/video call
 * @access  Private
 */
router.post(
  '/calls',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Proxying initiate call for user ${req.user?.userId}`);

    const response = await httpClient.post('communication', '/api/v1/communications/calls', req.body, {
      headers: {
        Authorization: req.headers.authorization,
      },
    });

    res.status(response.status).json(response.data);
  })
);

/**
 * @route   PUT /api/v1/communications/calls/:callId/status
 * @desc    Update call status (answer, end, etc.)
 * @access  Private
 */
router.put(
  '/calls/:callId/status',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Proxying update call status ${req.params.callId}`);

    const response = await httpClient.put(
      'communication',
      `/api/v1/communications/calls/${req.params.callId}/status`,
      req.body,
      {
        headers: {
          Authorization: req.headers.authorization,
        },
      }
    );

    res.status(response.status).json(response.data);
  })
);

/**
 * @route   GET /api/v1/communications/calls/history
 * @desc    Get call history
 * @access  Private
 */
router.get(
  '/calls/history',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Proxying get call history for user ${req.user?.userId}`);

    const response = await httpClient.get('communication', '/api/v1/communications/calls/history', {
      headers: {
        Authorization: req.headers.authorization,
      },
      params: req.query,
    });

    res.status(response.status).json(response.data);
  })
);

export default router;
