import { Router, Request, Response, NextFunction } from 'express';
import mfaService from '../services/mfa.service';
import { validateToken } from '../middleware/validateToken';
import logger from '../utils/logger';

const router = Router();

/**
 * @route   POST /api/v1/auth/mfa/enroll
 * @desc    Enroll in MFA - generates TOTP secret and QR code
 * @access  Private (requires valid access token)
 */
router.post(
  '/enroll',
  validateToken,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;

      const result = await mfaService.enrollMFA(userId);

      logger.info(`MFA enrollment initiated for user: ${userId}`);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/auth/mfa/verify
 * @desc    Verify TOTP code and enable MFA
 * @access  Private (requires valid access token)
 */
router.post(
  '/verify',
  validateToken,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { token } = req.body;

      if (!token) {
        res.status(400).json({
          success: false,
          error: 'Verification code is required',
          code: 'TOKEN_REQUIRED',
        });
        return;
      }

      const result = await mfaService.verifyAndEnableMFA(userId, token);

      logger.info(`MFA verification successful for user: ${userId}`);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/auth/mfa/challenge
 * @desc    Verify TOTP code during login (MFA challenge)
 * @access  Public (but requires userId in request body from login flow)
 */
router.post(
  '/challenge',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, token } = req.body;

      if (!userId || !token) {
        res.status(400).json({
          success: false,
          error: 'User ID and verification code are required',
          code: 'MISSING_FIELDS',
        });
        return;
      }

      const isValid = await mfaService.verifyMFALogin(userId, token);

      if (!isValid) {
        logger.warn(`Invalid MFA token for user: ${userId}`);
        res.status(400).json({
          success: false,
          error: 'Invalid verification code',
          code: 'INVALID_MFA_TOKEN',
        });
        return;
      }

      logger.info(`MFA challenge passed for user: ${userId}`);

      res.status(200).json({
        success: true,
        message: 'MFA verification successful',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/auth/mfa/disable
 * @desc    Disable MFA for user account
 * @access  Private (requires valid access token)
 */
router.post(
  '/disable',
  validateToken,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;
      const { token } = req.body;

      if (!token) {
        res.status(400).json({
          success: false,
          error: 'Verification code is required',
          code: 'TOKEN_REQUIRED',
        });
        return;
      }

      const result = await mfaService.disableMFA(userId, token);

      logger.info(`MFA disabled for user: ${userId}`);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/auth/mfa/status
 * @desc    Get MFA status for current user
 * @access  Private (requires valid access token)
 */
router.get(
  '/status',
  validateToken,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId!;

      const status = await mfaService.getMFAStatus(userId);

      res.status(200).json({
        success: true,
        ...status,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
