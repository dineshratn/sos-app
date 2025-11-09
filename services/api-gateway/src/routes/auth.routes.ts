import { Router, Request, Response } from 'express';
import httpClient from '../utils/httpClient';
import { asyncHandler } from '../middleware/errorHandler';
import { authRateLimiter } from '../middleware/rateLimiter';
import logger from '../utils/logger';

const router = Router();

/**
 * Authentication Service Routes
 * Proxies requests to auth-service
 */

// ==================== Public Routes ====================

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post(
  '/register',
  authRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Proxying registration request');

    const response = await httpClient.post('auth', '/api/v1/auth/register', req.body);

    res.status(response.status).json(response.data);
  })
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  authRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Proxying login request');

    const response = await httpClient.post('auth', '/api/v1/auth/login', req.body);

    res.status(response.status).json(response.data);
  })
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Proxying token refresh request');

    const response = await httpClient.post('auth', '/api/v1/auth/refresh', req.body);

    res.status(response.status).json(response.data);
  })
);

// ==================== OAuth Routes ====================

/**
 * @route   GET /api/v1/auth/google
 * @desc    Initiate Google OAuth
 * @access  Public
 */
router.get(
  '/google',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Proxying Google OAuth initiation');

    const response = await httpClient.get('auth', '/api/v1/auth/google', {
      params: req.query,
    });

    // Redirect to Google OAuth
    res.redirect(response.request.res.responseUrl);
  })
);

/**
 * @route   GET /api/v1/auth/google/callback
 * @desc    Google OAuth callback
 * @access  Public
 */
router.get(
  '/google/callback',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Proxying Google OAuth callback');

    const response = await httpClient.get('auth', '/api/v1/auth/google/callback', {
      params: req.query,
    });

    res.status(response.status).json(response.data);
  })
);

/**
 * @route   GET /api/v1/auth/apple
 * @desc    Initiate Apple OAuth
 * @access  Public
 */
router.get(
  '/apple',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Proxying Apple OAuth initiation');

    const response = await httpClient.get('auth', '/api/v1/auth/apple', {
      params: req.query,
    });

    res.redirect(response.request.res.responseUrl);
  })
);

/**
 * @route   POST /api/v1/auth/apple/callback
 * @desc    Apple OAuth callback
 * @access  Public
 */
router.post(
  '/apple/callback',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Proxying Apple OAuth callback');

    const response = await httpClient.post('auth', '/api/v1/auth/apple/callback', req.body, {
      params: req.query,
    });

    res.status(response.status).json(response.data);
  })
);

// ==================== Protected Routes ====================

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post(
  '/logout',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Proxying logout request');

    // Forward auth header to service
    const response = await httpClient.post('auth', '/api/v1/auth/logout', req.body, {
      headers: {
        Authorization: req.headers.authorization,
      },
    });

    res.status(response.status).json(response.data);
  })
);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user info
 * @access  Private
 */
router.get(
  '/me',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Proxying get current user request');

    const response = await httpClient.get('auth', '/api/v1/auth/me', {
      headers: {
        Authorization: req.headers.authorization,
      },
    });

    res.status(response.status).json(response.data);
  })
);

/**
 * @route   GET /api/v1/auth/sessions
 * @desc    Get user sessions
 * @access  Private
 */
router.get(
  '/sessions',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Proxying get sessions request');

    const response = await httpClient.get('auth', '/api/v1/auth/sessions', {
      headers: {
        Authorization: req.headers.authorization,
      },
    });

    res.status(response.status).json(response.data);
  })
);

/**
 * @route   POST /api/v1/auth/link/:provider
 * @desc    Link OAuth account
 * @access  Private
 */
router.post(
  '/link/:provider',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Proxying OAuth link request for ${req.params.provider}`);

    const response = await httpClient.post(
      'auth',
      `/api/v1/auth/link/${req.params.provider}`,
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
 * @route   DELETE /api/v1/auth/unlink
 * @desc    Unlink OAuth account
 * @access  Private
 */
router.delete(
  '/unlink',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Proxying OAuth unlink request');

    const response = await httpClient.delete('auth', '/api/v1/auth/unlink', {
      headers: {
        Authorization: req.headers.authorization,
      },
    });

    res.status(response.status).json(response.data);
  })
);

/**
 * @route   GET /api/v1/auth/oauth/status
 * @desc    Get OAuth status
 * @access  Private
 */
router.get(
  '/oauth/status',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Proxying OAuth status request');

    const response = await httpClient.get('auth', '/api/v1/auth/oauth/status', {
      headers: {
        Authorization: req.headers.authorization,
      },
    });

    res.status(response.status).json(response.data);
  })
);

export default router;
