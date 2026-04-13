import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import authService from '../services/auth.service';
import mfaService from '../services/mfa.service';
import { validateToken } from '../middleware/validateToken';
import {
  registerValidation,
  loginValidation,
  refreshTokenValidation,
  logoutValidation,
  handleValidationErrors,
} from '../middleware/validation';
import {
  RegisterRequest,
  LoginRequest,
  RefreshTokenRequest,
  LogoutRequest,
  DeviceInfo,
} from '../types/auth.types';
import config from '../config';
import logger from '../utils/logger';
import { generateTokenPair } from '../utils/jwt';
import redisService from '../services/redis.service';

const router = Router();

/**
 * Rate limiter for login endpoint
 * More restrictive than general rate limiting
 */
const loginLimiter = rateLimit({
  windowMs: config.rateLimit.loginWindowMs,
  max: config.rateLimit.loginMaxAttempts,
  message: {
    success: false,
    error: 'Too many login attempts from this IP, please try again later',
    code: 'LOGIN_RATE_LIMIT',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Helper function to extract device info from request
 */
const getDeviceInfo = (req: Request): DeviceInfo => {
  return {
    deviceId: req.body.deviceId,
    deviceName: req.body.deviceName,
    deviceType: req.body.deviceType,
    ipAddress: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
  };
};

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user with email and password
 * @access  Public
 */
router.post(
  '/register',
  registerValidation,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: RegisterRequest = req.body;
      const deviceInfo = getDeviceInfo(req);

      const result = await authService.register(data, deviceInfo);

      logger.info(`User registered successfully: ${data.email}`);

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login with email/phone and password
 * @access  Public
 */
router.post(
  '/login',
  loginLimiter,
  loginValidation,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: LoginRequest = req.body;
      const deviceInfo = getDeviceInfo(req);

      const result = await authService.login(data, deviceInfo);

      // Check if MFA is required - don't log as full login
      if ('mfaRequired' in result && result.mfaRequired) {
        logger.info(`MFA required for user: ${data.email || data.phoneNumber}`);
      } else {
        logger.info(`User logged in successfully: ${data.email || data.phoneNumber}`);
      }

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post(
  '/refresh',
  refreshTokenValidation,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: RefreshTokenRequest = req.body;

      const result = await authService.refreshToken(data);

      logger.info(`Token refreshed successfully`);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout and revoke tokens
 * @access  Private (requires valid access token)
 */
router.post(
  '/logout',
  validateToken,
  logoutValidation,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const data: LogoutRequest = req.body;

      const result = await authService.logout(userId, data);

      logger.info(`User logged out successfully: ${userId}`);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user information
 * @access  Private (requires valid access token)
 */
router.get(
  '/me',
  validateToken,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;

      // Import User model here to avoid circular dependency
      const User = (await import('../models/User')).default;

      const user = await User.findByPk(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        });
        return;
      }

      res.status(200).json({
        success: true,
        user: user.toSafeObject(),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/auth/sessions
 * @desc    Get all active sessions for current user
 * @access  Private (requires valid access token)
 */
router.get(
  '/sessions',
  validateToken,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;

      // Import Session model here to avoid circular dependency
      const Session = (await import('../models/Session')).default;

      const sessions = await Session.findAll({
        where: { userId },
        order: [['lastActiveAt', 'DESC']],
      });

      res.status(200).json({
        success: true,
        sessions: sessions.map((s) => s.toSafeObject()),
        count: sessions.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/auth/password-reset-request
 * @desc    Request password reset - generates token and sends email
 * @access  Public
 */
router.post(
  '/password-reset-request',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Email is required',
          code: 'EMAIL_REQUIRED',
        });
        return;
      }

      const result = await authService.requestPasswordReset(email);

      logger.info(`Password reset requested for: ${email}`);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/auth/password-reset
 * @desc    Reset password using token
 * @access  Public
 */
router.post(
  '/password-reset',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        res.status(400).json({
          success: false,
          error: 'Token and new password are required',
          code: 'MISSING_FIELDS',
        });
        return;
      }

      const result = await authService.resetPassword(token, newPassword);

      logger.info('Password reset completed successfully');

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/auth/mfa/challenge
 * @desc    Verify MFA code during login - issues tokens after successful verification
 * @access  Private (requires valid MFA-pending access token from login)
 */
router.post(
  '/mfa/challenge',
  validateToken,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const sessionId = req.sessionId;
      const { token, deviceId, deviceName, deviceType } = req.body;

      // Verify this is an MFA-pending token (issued during login for MFA users)
      if (sessionId !== 'mfa-pending') {
        res.status(403).json({
          success: false,
          error: 'Invalid token for MFA challenge. Please login again.',
          code: 'INVALID_MFA_FLOW',
        });
        return;
      }

      if (!token) {
        res.status(400).json({
          success: false,
          error: 'MFA token is required',
          code: 'TOKEN_REQUIRED',
        });
        return;
      }

      // Verify MFA code
      const isValid = await mfaService.verifyMFALogin(userId, token);

      if (!isValid) {
        res.status(401).json({
          success: false,
          error: 'Invalid MFA code',
          code: 'INVALID_MFA_CODE',
        });
        return;
      }

      // Import User and Session models
      const User = (await import('../models/User')).default;
      const Session = (await import('../models/Session')).default;

      const user = await User.findByPk(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        });
        return;
      }

      // Create new session or update existing
      let session = await Session.findOne({
        where: {
          userId,
          deviceId,
        },
      });

      if (session && session.isValid()) {
        // Update existing session - generate tokens with real session ID
        const tokens = generateTokenPair(user.id, user.email, session.id);
        session.refreshToken = tokens.refreshToken;
        session.updateLastActive();
        await session.save();

        // Cache session in Redis
        await redisService.cacheSession(
          session.id,
          { userId: user.id, email: user.email },
          config.session.timeoutHours * 3600
        );

        // Update last login
        user.updateLastLogin();
        await user.save();

        logger.info(`MFA challenge successful for user: ${userId}`);

        res.status(200).json({
          success: true,
          message: 'MFA verification successful',
          user: user.toSafeObject(),
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
            tokenType: 'Bearer',
          },
          session: session.toSafeObject(),
        });
      } else {
        // Create new session first with a temporary refresh token
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + config.session.timeoutHours);

        session = await Session.create({
          userId,
          deviceId: deviceId || 'unknown',
          deviceName,
          deviceType,
          refreshToken: 'pending', // Temporary, will be replaced below
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.get('user-agent'),
          expiresAt,
        });

        // Now generate tokens with the real session ID
        const tokens = generateTokenPair(user.id, user.email, session.id);

        // Update session with the real refresh token
        session.refreshToken = tokens.refreshToken;
        await session.save();

        // Cache session in Redis
        await redisService.cacheSession(
          session.id,
          { userId: user.id, email: user.email },
          config.session.timeoutHours * 3600
        );

        // Update last login
        user.updateLastLogin();
        await user.save();

        logger.info(`MFA challenge successful for user: ${userId}`);

        res.status(200).json({
          success: true,
          message: 'MFA verification successful',
          user: user.toSafeObject(),
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
            tokenType: 'Bearer',
          },
          session: session.toSafeObject(),
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

export default router;
