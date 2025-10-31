import { Router, Request, Response } from 'express';
import httpClient from '../utils/httpClient';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/authMiddleware';
import logger from '../utils/logger';

const router = Router();

/**
 * Notification Service Routes
 * Proxies requests to notification-service
 * All routes require authentication
 */

// Apply authentication middleware to all routes
router.use(authenticateToken);

// ==================== Notification Routes ====================

/**
 * @route   GET /api/v1/notifications
 * @desc    Get user's notifications
 * @access  Private
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Proxying get notifications for user ${req.user?.userId}`);

    const response = await httpClient.get('notification', '/api/v1/notifications', {
      headers: {
        Authorization: req.headers.authorization,
      },
      params: req.query,
    });

    res.status(response.status).json(response.data);
  })
);

/**
 * @route   GET /api/v1/notifications/:notificationId
 * @desc    Get specific notification
 * @access  Private
 */
router.get(
  '/:notificationId',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Proxying get notification ${req.params.notificationId}`);

    const response = await httpClient.get(
      'notification',
      `/api/v1/notifications/${req.params.notificationId}`,
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
 * @route   PUT /api/v1/notifications/:notificationId/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put(
  '/:notificationId/read',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Proxying mark notification as read ${req.params.notificationId}`);

    const response = await httpClient.put(
      'notification',
      `/api/v1/notifications/${req.params.notificationId}/read`,
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
 * @route   PUT /api/v1/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put(
  '/mark-all-read',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Proxying mark all notifications as read for user ${req.user?.userId}`);

    const response = await httpClient.put(
      'notification',
      '/api/v1/notifications/mark-all-read',
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
 * @route   DELETE /api/v1/notifications/:notificationId
 * @desc    Delete notification
 * @access  Private
 */
router.delete(
  '/:notificationId',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Proxying delete notification ${req.params.notificationId}`);

    const response = await httpClient.delete(
      'notification',
      `/api/v1/notifications/${req.params.notificationId}`,
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
 * @route   GET /api/v1/notifications/unread/count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get(
  '/unread/count',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Proxying get unread count for user ${req.user?.userId}`);

    const response = await httpClient.get('notification', '/api/v1/notifications/unread/count', {
      headers: {
        Authorization: req.headers.authorization,
      },
    });

    res.status(response.status).json(response.data);
  })
);

// ==================== Notification Preferences Routes ====================

/**
 * @route   GET /api/v1/notifications/preferences
 * @desc    Get notification preferences
 * @access  Private
 */
router.get(
  '/preferences',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Proxying get notification preferences for user ${req.user?.userId}`);

    const response = await httpClient.get('notification', '/api/v1/notifications/preferences', {
      headers: {
        Authorization: req.headers.authorization,
      },
    });

    res.status(response.status).json(response.data);
  })
);

/**
 * @route   PUT /api/v1/notifications/preferences
 * @desc    Update notification preferences
 * @access  Private
 */
router.put(
  '/preferences',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Proxying update notification preferences for user ${req.user?.userId}`);

    const response = await httpClient.put(
      'notification',
      '/api/v1/notifications/preferences',
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

export default router;
