import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import User from '../models/User';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import config from '../config';

/**
 * MFA Service
 *
 * Handles Time-based One-Time Password (TOTP) multi-factor authentication
 * Uses speakeasy for TOTP generation and verification
 */
class MFAService {
  /**
   * Enroll user in MFA - Generate TOTP secret and QR code
   */
  public async enrollMFA(
    userId: string
  ): Promise<{ success: boolean; secret: string; qrCodeUrl: string; backupCodes: string[] }> {
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

      // Generate QR code as data URL
      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url || '');

      // Generate backup codes (8 codes, 10 characters each)
      const backupCodes = this.generateBackupCodes(8);

      // Save secret to user (temporarily until verified)
      // Note: In production, encrypt this secret before storing
      user.mfaSecret = secret.base32;
      await user.save();

      logger.info(`MFA enrollment initiated for user: ${userId}`);

      return {
        success: true,
        secret: secret.base32,
        qrCodeUrl,
        backupCodes,
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
   * Verify TOTP code and enable MFA
   */
  public async verifyAndEnableMFA(
    userId: string,
    token: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      if (user.mfaEnabled) {
        throw new AppError('MFA is already enabled', 400, 'MFA_ALREADY_ENABLED');
      }

      if (!user.mfaSecret) {
        throw new AppError(
          'MFA not enrolled. Please enroll first.',
          400,
          'MFA_NOT_ENROLLED'
        );
      }

      // Verify TOTP token
      const isValid = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token,
        window: 2, // Allow 2 time steps (±60 seconds)
      });

      if (!isValid) {
        throw new AppError('Invalid verification code', 400, 'INVALID_MFA_TOKEN');
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
      throw new AppError('Failed to verify MFA', 500, 'MFA_VERIFICATION_ERROR');
    }
  }

  /**
   * Verify TOTP token during login
   */
  public async verifyMFAToken(userId: string, token: string): Promise<boolean> {
    try {
      const user = await User.findByPk(userId);

      if (!user || !user.mfaEnabled || !user.mfaSecret) {
        throw new AppError('MFA not enabled for this account', 400, 'MFA_NOT_ENABLED');
      }

      // Verify TOTP token
      const isValid = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token,
        window: 2, // Allow 2 time steps (±60 seconds)
      });

      return isValid;
    } catch (error) {
      logger.error('MFA token verification error:', error);
      return false;
    }
  }

  /**
   * Disable MFA for user
   */
  public async disableMFA(
    userId: string,
    token: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      if (!user.mfaEnabled) {
        throw new AppError('MFA is not enabled', 400, 'MFA_NOT_ENABLED');
      }

      // Verify current TOTP token before disabling
      const isValid = await this.verifyMFAToken(userId, token);

      if (!isValid) {
        throw new AppError('Invalid verification code', 400, 'INVALID_MFA_TOKEN');
      }

      // Disable MFA and remove secret
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

  /**
   * Generate backup codes for MFA
   */
  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    for (let i = 0; i < count; i++) {
      let code = '';
      for (let j = 0; j < 10; j++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      // Format as XXXXX-XXXXX
      codes.push(`${code.slice(0, 5)}-${code.slice(5)}`);
    }

    return codes;
  }

  /**
   * Get MFA status for user
   */
  public async getMFAStatus(userId: string): Promise<{ enabled: boolean; enrolled: boolean }> {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      return {
        enabled: user.mfaEnabled,
        enrolled: !!user.mfaSecret,
      };
    } catch (error) {
      logger.error('Get MFA status error:', error);
      throw new AppError('Failed to get MFA status', 500, 'MFA_STATUS_ERROR');
    }
  }
}

export default new MFAService();
