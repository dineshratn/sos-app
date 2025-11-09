import { Router, Request, Response } from 'express';
import httpClient from '../utils/httpClient';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/authMiddleware';
import logger from '../utils/logger';

const router = Router();

/**
 * User Service Routes
 * Proxies requests to user-service
 * All routes require authentication
 */

// Apply authentication middleware to all routes
router.use(authenticateToken);

// ==================== User Profile Routes ====================

/**
 * @route   GET /api/v1/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get(
  '/profile',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Proxying get profile request for user ${req.user?.userId}`);

    const response = await httpClient.get('user', '/api/v1/users/profile', {
      headers: {
        Authorization: req.headers.authorization,
      },
    });

    res.status(response.status).json(response.data);
  })
);

/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/profile',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Proxying update profile request for user ${req.user?.userId}`);

    const response = await httpClient.put('user', '/api/v1/users/profile', req.body, {
      headers: {
        Authorization: req.headers.authorization,
      },
    });

    res.status(response.status).json(response.data);
  })
);

/**
 * @route   DELETE /api/v1/users/profile
 * @desc    Delete user account
 * @access  Private
 */
router.delete(
  '/profile',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Proxying delete profile request for user ${req.user?.userId}`);

    const response = await httpClient.delete('user', '/api/v1/users/profile', {
      headers: {
        Authorization: req.headers.authorization,
      },
    });

    res.status(response.status).json(response.data);
  })
);

// ==================== Emergency Contacts Routes ====================

/**
 * @route   GET /api/v1/users/emergency-contacts
 * @desc    Get all emergency contacts
 * @access  Private
 */
router.get(
  '/emergency-contacts',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Proxying get emergency contacts for user ${req.user?.userId}`);

    const response = await httpClient.get('user', '/api/v1/users/emergency-contacts', {
      headers: {
        Authorization: req.headers.authorization,
      },
    });

    res.status(response.status).json(response.data);
  })
);

/**
 * @route   POST /api/v1/users/emergency-contacts
 * @desc    Add emergency contact
 * @access  Private
 */
router.post(
  '/emergency-contacts',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Proxying add emergency contact for user ${req.user?.userId}`);

    const response = await httpClient.post('user', '/api/v1/users/emergency-contacts', req.body, {
      headers: {
        Authorization: req.headers.authorization,
      },
    });

    res.status(response.status).json(response.data);
  })
);

/**
 * @route   GET /api/v1/users/emergency-contacts/:contactId
 * @desc    Get specific emergency contact
 * @access  Private
 */
router.get(
  '/emergency-contacts/:contactId',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Proxying get emergency contact ${req.params.contactId}`);

    const response = await httpClient.get(
      'user',
      `/api/v1/users/emergency-contacts/${req.params.contactId}`,
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
 * @route   PUT /api/v1/users/emergency-contacts/:contactId
 * @desc    Update emergency contact
 * @access  Private
 */
router.put(
  '/emergency-contacts/:contactId',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Proxying update emergency contact ${req.params.contactId}`);

    const response = await httpClient.put(
      'user',
      `/api/v1/users/emergency-contacts/${req.params.contactId}`,
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
 * @route   DELETE /api/v1/users/emergency-contacts/:contactId
 * @desc    Delete emergency contact
 * @access  Private
 */
router.delete(
  '/emergency-contacts/:contactId',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Proxying delete emergency contact ${req.params.contactId}`);

    const response = await httpClient.delete(
      'user',
      `/api/v1/users/emergency-contacts/${req.params.contactId}`,
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
