import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import User from '../models/User';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

interface MFAEnrollmentResponse {
  success: boolean;
  message: string;
  secret: string;
  qrCode: string;
  manualEntryKey: string;
}

interface MFAVerificationResponse {
  success: boolean;
  message: string;
}

class MFAService {
  /**
   * Enroll user in MFA - generate TOTP secret and QR code
   */
  public async enrollMFA(userId: string): Promise<MFAEnrollmentResponse> {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      if (user.mfaEnabled) {
        throw new AppError('MFA is already enabled for this account', 400, 'MFA_ALREADY_ENABLED');
      }

      // Generate TOTP secret
      const secret = speakeasy.generateSecret({
        name: `SOS App (${user.email})`,
        issuer: 'SOS App',
        length: 32,
      });

      // Store the secret temporarily (not enabled yet until verified)
      user.mfaSecret = secret.base32;
      await user.save();

      // Generate QR code
      const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url!);

      logger.info(`MFA enrollment initiated for user: ${userId}`);

      return {
        success: true,
        message: 'Scan the QR code with your authenticator app',
        secret: secret.base32,
        qrCode: qrCodeDataUrl,
        manualEntryKey: secret.base32,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('MFA enrollment error:', error);
      throw new AppError('Failed to enroll in MFA', 500, 'MFA_ENROLLMENT_ERROR');
    }
  }

  /**
   * Verify MFA code and enable MFA for the user
   */
  public async verifyAndEnableMFA(userId: string, token: string): Promise<MFAVerificationResponse> {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      if (!user.mfaSecret) {
        throw new AppError('MFA enrollment not initiated', 400, 'MFA_NOT_INITIATED');
      }

      if (user.mfaEnabled) {
        throw new AppError('MFA is already enabled', 400, 'MFA_ALREADY_ENABLED');
      }

      // Verify the TOTP token
      const verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: token,
        window: 2, // Allow 2 time steps before/after for clock skew
      });

      if (!verified) {
        throw new AppError('Invalid verification code', 400, 'INVALID_MFA_CODE');
      }

      // Enable MFA
      user.mfaEnabled = true;
      await user.save();

      logger.info(`MFA enabled for user: ${userId}`);

      return {
        success: true,
        message: 'MFA has been successfully enabled for your account',
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('MFA verification error:', error);
      throw new AppError('Failed to verify MFA code', 500, 'MFA_VERIFICATION_ERROR');
    }
  }

  /**
   * Verify MFA code during login
   */
  public async verifyMFALogin(userId: string, token: string): Promise<boolean> {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      if (!user.mfaEnabled || !user.mfaSecret) {
        throw new AppError('MFA is not enabled for this account', 400, 'MFA_NOT_ENABLED');
      }

      // Verify the TOTP token
      const verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: token,
        window: 2, // Allow 2 time steps before/after for clock skew
      });

      if (!verified) {
        logger.warn(`Failed MFA login attempt for user: ${userId}`);
        return false;
      }

      logger.info(`Successful MFA verification for user: ${userId}`);
      return true;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('MFA login verification error:', error);
      throw new AppError('Failed to verify MFA code', 500, 'MFA_LOGIN_VERIFICATION_ERROR');
    }
  }

  /**
   * Disable MFA for a user (requires verification)
   */
  public async disableMFA(userId: string, token: string): Promise<MFAVerificationResponse> {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      if (!user.mfaEnabled) {
        throw new AppError('MFA is not enabled', 400, 'MFA_NOT_ENABLED');
      }

      // Verify the TOTP token before disabling
      const verified = speakeasy.totp.verify({
        secret: user.mfaSecret!,
        encoding: 'base32',
        token: token,
        window: 2,
      });

      if (!verified) {
        throw new AppError('Invalid verification code', 400, 'INVALID_MFA_CODE');
      }

      // Disable MFA
      user.mfaEnabled = false;
      user.mfaSecret = undefined;
      await user.save();

      logger.info(`MFA disabled for user: ${userId}`);

      return {
        success: true,
        message: 'MFA has been disabled for your account',
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('MFA disable error:', error);
      throw new AppError('Failed to disable MFA', 500, 'MFA_DISABLE_ERROR');
    }
  }
}

export default new MFAService();
