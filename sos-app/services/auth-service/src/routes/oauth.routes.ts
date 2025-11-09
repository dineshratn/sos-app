import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import oauthService from '../services/oauth.service';
import { validateToken } from '../middleware/validateToken';
import { body, param } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation';
import { AuthProvider } from '../models/User';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

const router = Router();

/**
 * OAuth 2.0 Routes
 * Handles Google and Apple authentication
 */

// ==================== Google OAuth ====================

/**
 * @route   GET /api/v1/auth/google
 * @desc    Initiate Google OAuth flow
 * @access  Public
 */
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

/**
 * @route   GET /api/v1/auth/google/callback
 * @desc    Google OAuth callback
 * @access  Public
 */
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/auth/login?error=oauth_failed' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = req.user as any;

      // Extract device info from headers/query
      const deviceId = (req.query.deviceId as string) || req.headers['x-device-id'] as string;
      const deviceName = (req.query.deviceName as string) || req.headers['x-device-name'] as string;
      const deviceType = (req.query.deviceType as string) || req.headers['x-device-type'] as string;

      if (!deviceId) {
        throw new AppError('Device ID is required', 400, 'DEVICE_ID_REQUIRED');
      }

      const deviceInfo = {
        deviceId,
        deviceName,
        deviceType,
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      };

      const result = await oauthService.handleOAuthLogin(
        profile,
        AuthProvider.GOOGLE,
        { deviceId, deviceName, deviceType },
        deviceInfo
      );

      // In production, redirect to frontend with tokens in URL/state
      // For now, return JSON response
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// ==================== Apple OAuth ====================

/**
 * @route   GET /api/v1/auth/apple
 * @desc    Initiate Apple OAuth flow
 * @access  Public
 */
router.get(
  '/apple',
  passport.authenticate('apple', {
    scope: ['name', 'email'],
    session: false,
  })
);

/**
 * @route   POST /api/v1/auth/apple/callback
 * @desc    Apple OAuth callback (Apple uses POST)
 * @access  Public
 */
router.post(
  '/apple/callback',
  passport.authenticate('apple', { session: false, failureRedirect: '/auth/login?error=oauth_failed' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = req.user as any;

      // Extract device info from headers/query/body
      const deviceId = req.body.deviceId || (req.query.deviceId as string) || req.headers['x-device-id'] as string;
      const deviceName = req.body.deviceName || (req.query.deviceName as string) || req.headers['x-device-name'] as string;
      const deviceType = req.body.deviceType || (req.query.deviceType as string) || req.headers['x-device-type'] as string;

      if (!deviceId) {
        throw new AppError('Device ID is required', 400, 'DEVICE_ID_REQUIRED');
      }

      const deviceInfo = {
        deviceId,
        deviceName,
        deviceType,
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      };

      const result = await oauthService.handleOAuthLogin(
        profile,
        AuthProvider.APPLE,
        { deviceId, deviceName, deviceType },
        deviceInfo
      );

      // In production, redirect to frontend with tokens
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// ==================== Account Linking ====================

/**
 * @route   POST /api/v1/auth/link/:provider
 * @desc    Link OAuth account to existing user
 * @access  Private (requires authentication)
 */
router.post(
  '/link/:provider',
  validateToken,
  [
    param('provider')
      .isIn(['google', 'apple'])
      .withMessage('Provider must be google or apple'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const provider = req.params.provider as 'google' | 'apple';

      // Initiate OAuth flow for linking
      // User needs to authenticate with OAuth provider first
      // This would typically redirect to provider's authorization page
      // For now, we'll return a message indicating the flow

      const authUrl = provider === 'google'
        ? '/api/v1/auth/google?link=true&userId=' + userId
        : '/api/v1/auth/apple?link=true&userId=' + userId;

      res.status(200).json({
        success: true,
        message: `Redirect user to ${provider} OAuth for linking`,
        authUrl,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/auth/link/complete
 * @desc    Complete OAuth account linking (called after OAuth callback)
 * @access  Private
 */
router.post(
  '/link/complete',
  validateToken,
  [
    body('provider')
      .isIn(['google', 'apple'])
      .withMessage('Provider must be google or apple'),
    body('oauthProfile')
      .notEmpty()
      .withMessage('OAuth profile is required'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const { provider, oauthProfile } = req.body;

      const user = await oauthService.linkOAuthAccount(
        userId,
        oauthProfile,
        provider
      );

      logger.info(`OAuth account linked: ${userId} -> ${provider}`);

      res.status(200).json({
        success: true,
        message: `${provider} account linked successfully`,
        user: user.toSafeObject(),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/auth/unlink
 * @desc    Unlink OAuth account from user (requires password set)
 * @access  Private
 */
router.delete(
  '/unlink',
  validateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;

      const user = await oauthService.unlinkOAuthAccount(userId);

      logger.info(`OAuth account unlinked: ${userId}`);

      res.status(200).json({
        success: true,
        message: 'OAuth account unlinked successfully',
        user: user.toSafeObject(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== OAuth Status ====================

/**
 * @route   GET /api/v1/auth/oauth/status
 * @desc    Get OAuth linking status for current user
 * @access  Private
 */
router.get(
  '/oauth/status',
  validateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const User = (await import('../models/User')).default;

      const user = await User.findByPk(userId);

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      res.status(200).json({
        success: true,
        authProvider: user.authProvider,
        providerId: user.providerId ? '***' + user.providerId.slice(-4) : null,
        isOAuthLinked: user.authProvider !== AuthProvider.LOCAL,
        hasPassword: !!user.passwordHash,
        canUnlink: user.authProvider !== AuthProvider.LOCAL && !!user.passwordHash,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
