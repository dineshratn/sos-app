import { Router, Request, Response } from 'express';
import httpClient from '../utils/httpClient';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/authMiddleware';
import logger from '../utils/logger';

const router = Router();

/**
 * Location Service Routes
 * Proxies requests to location-service
 * All routes require authentication
 */

// Apply authentication middleware to all routes
router.use(authenticateToken);

// ==================== Location Tracking Routes ====================

/**
 * @route   POST /api/v1/locations
 * @desc    Update user location
 * @access  Private
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Proxying update location for user ${req.user?.userId}`);

    const response = await httpClient.post('location', '/api/v1/locations', req.body, {
      headers: {
        Authorization: req.headers.authorization,
      },
    });

    res.status(response.status).json(response.data);
  })
);

/**
 * @route   GET /api/v1/locations/current
 * @desc    Get user's current location
 * @access  Private
 */
router.get(
  '/current',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Proxying get current location for user ${req.user?.userId}`);

    const response = await httpClient.get('location', '/api/v1/locations/current', {
      headers: {
        Authorization: req.headers.authorization,
      },
    });

    res.status(response.status).json(response.data);
  })
);

/**
 * @route   GET /api/v1/locations/history
 * @desc    Get user's location history
 * @access  Private
 */
router.get(
  '/history',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Proxying get location history for user ${req.user?.userId}`);

    const response = await httpClient.get('location', '/api/v1/locations/history', {
      headers: {
        Authorization: req.headers.authorization,
      },
      params: req.query,
    });

    res.status(response.status).json(response.data);
  })
);

/**
 * @route   GET /api/v1/locations/emergency/:emergencyId
 * @desc    Get location for specific emergency
 * @access  Private
 */
router.get(
  '/emergency/:emergencyId',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Proxying get emergency location ${req.params.emergencyId}`);

    const response = await httpClient.get(
      'location',
      `/api/v1/locations/emergency/${req.params.emergencyId}`,
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
 * @route   POST /api/v1/locations/share
 * @desc    Share location with contacts
 * @access  Private
 */
router.post(
  '/share',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Proxying share location for user ${req.user?.userId}`);

    const response = await httpClient.post('location', '/api/v1/locations/share', req.body, {
      headers: {
        Authorization: req.headers.authorization,
      },
    });

    res.status(response.status).json(response.data);
  })
);

export default router;
