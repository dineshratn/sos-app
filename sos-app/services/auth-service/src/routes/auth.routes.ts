import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import authService from '../services/auth.service';
import passwordResetService from '../services/password-reset.service';
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

      logger.info(`User logged in successfully: ${data.email || data.phoneNumber}`);

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

      const result = await passwordResetService.requestPasswordReset(email);

      logger.info(`Password reset requested for email: ${email}`);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/auth/password-reset
 * @desc    Confirm password reset with token and new password
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

      if (newPassword.length < 8) {
        res.status(400).json({
          success: false,
          error: 'Password must be at least 8 characters long',
          code: 'WEAK_PASSWORD',
        });
        return;
      }

      const result = await passwordResetService.confirmPasswordReset(token, newPassword);

      logger.info(`Password reset completed for token: ${token.substring(0, 10)}...`);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/auth/validate-reset-token/:token
 * @desc    Validate password reset token
 * @access  Public
 */
router.get(
  '/validate-reset-token/:token',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.params;

      const result = await passwordResetService.validateResetToken(token);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
