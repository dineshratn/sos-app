import { Router, Request, Response } from 'express';
import httpClient from '../utils/httpClient';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/authMiddleware';
import { emergencyRateLimiter } from '../middleware/rateLimiter';
import logger from '../utils/logger';

const router = Router();

/**
 * Emergency Service Routes
 * Proxies requests to emergency-service
 * All routes require authentication
 */

// Apply authentication middleware to all routes
router.use(authenticateToken);

// ==================== Emergency Alert Routes ====================

/**
 * @route   POST /api/v1/emergencies
 * @desc    Create new emergency alert
 * @access  Private
 */
router.post(
  '/',
  emergencyRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Proxying create emergency alert for user ${req.user?.userId}`);

    const response = await httpClient.post('emergency', '/api/v1/emergencies', req.body, {
      headers: {
        Authorization: req.headers.authorization,
      },
    });

    res.status(response.status).json(response.data);
  })
);

/**
 * @route   GET /api/v1/emergencies
 * @desc    Get user's emergency alerts
 * @access  Private
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Proxying get emergency alerts for user ${req.user?.userId}`);

    const response = await httpClient.get('emergency', '/api/v1/emergencies', {
      headers: {
        Authorization: req.headers.authorization,
      },
      params: req.query,
    });

    res.status(response.status).json(response.data);
  })
);

/**
 * @route   GET /api/v1/emergencies/:emergencyId
 * @desc    Get specific emergency alert
 * @access  Private
 */
router.get(
  '/:emergencyId',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Proxying get emergency ${req.params.emergencyId}`);

    const response = await httpClient.get(
      'emergency',
      `/api/v1/emergencies/${req.params.emergencyId}`,
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
 * @route   PUT /api/v1/emergencies/:emergencyId/status
 * @desc    Update emergency status
 * @access  Private
 */
router.put(
  '/:emergencyId/status',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Proxying update emergency status ${req.params.emergencyId}`);

    const response = await httpClient.put(
      'emergency',
      `/api/v1/emergencies/${req.params.emergencyId}/status`,
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
 * @route   PUT /api/v1/emergencies/:emergencyId/cancel
 * @desc    Cancel emergency alert
 * @access  Private
 */
router.put(
  '/:emergencyId/cancel',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Proxying cancel emergency ${req.params.emergencyId}`);

    const response = await httpClient.put(
      'emergency',
      `/api/v1/emergencies/${req.params.emergencyId}/cancel`,
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
 * @route   PUT /api/v1/emergencies/:emergencyId/resolve
 * @desc    Resolve emergency alert
 * @access  Private
 */
router.put(
  '/:emergencyId/resolve',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Proxying resolve emergency ${req.params.emergencyId}`);

    const response = await httpClient.put(
      'emergency',
      `/api/v1/emergencies/${req.params.emergencyId}/resolve`,
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
 * @route   GET /api/v1/emergencies/:emergencyId/timeline
 * @desc    Get emergency timeline/history
 * @access  Private
 */
router.get(
  '/:emergencyId/timeline',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Proxying get emergency timeline ${req.params.emergencyId}`);

    const response = await httpClient.get(
      'emergency',
      `/api/v1/emergencies/${req.params.emergencyId}/timeline`,
      {
        headers: {
          Authorization: req.headers.authorization,
        },
      }
    );

    res.status(response.status).json(response.data);
  })
);

export default router;
