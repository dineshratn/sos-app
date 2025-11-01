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
          error: 'Verification token is required',
          code: 'TOKEN_REQUIRED',
        });
        return;
      }

      const result = await mfaService.verifyAndEnableMFA(userId, token);

      logger.info(`MFA verified and enabled for user: ${userId}`);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/auth/mfa/disable
 * @desc    Disable MFA for the user (requires verification)
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
          error: 'Verification token is required',
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

export default router;
