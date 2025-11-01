import crypto from 'crypto';
import User from '../models/User';
import { hashPassword } from '../utils/password';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

/**
 * Password Reset Service
 *
 * Handles password reset request and confirmation flows with secure tokens
 */
class PasswordResetService {
  /**
   * Generate a secure password reset token
   */
  private generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Request password reset - Generate token and send email
   */
  public async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    try {
      // Find user by email
      const user = await User.findOne({ where: { email } });

      // Always return success even if user not found (security best practice)
      // This prevents email enumeration attacks
      if (!user) {
        logger.warn(`Password reset requested for non-existent email: ${email}`);
        return {
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent',
        };
      }

      // Generate reset token
      const resetToken = this.generateResetToken();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Save token to database
      user.passwordResetToken = resetToken;
      user.passwordResetExpires = resetExpires;
      await user.save();

      logger.info(`Password reset token generated for user: ${user.id}`);

      // TODO: Send email with reset link
      // In production, integrate with email service (SendGrid, AWS SES, etc.)
      // const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      // await emailService.sendPasswordResetEmail(user.email, resetLink);

      // For now, log the token (REMOVE IN PRODUCTION)
      logger.info(`Password reset token for ${email}: ${resetToken}`);

      return {
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent',
      };
    } catch (error) {
      logger.error('Password reset request error:', error);
      throw new AppError('Failed to process password reset request', 500, 'PASSWORD_RESET_ERROR');
    }
  }

  /**
   * Confirm password reset with token and new password
   */
  public async confirmPasswordReset(
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Find user by reset token
      const user = await User.findOne({
        where: {
          passwordResetToken: token,
        },
      });

      if (!user) {
        throw new AppError('Invalid or expired password reset token', 400, 'INVALID_RESET_TOKEN');
      }

      // Check if token is expired
      if (!user.passwordResetExpires || new Date() > user.passwordResetExpires) {
        // Clear expired token
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        throw new AppError('Password reset token has expired', 400, 'EXPIRED_RESET_TOKEN');
      }

      // Hash new password
      const passwordHash = await hashPassword(newPassword);

      // Update user password and clear reset token
      user.passwordHash = passwordHash;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;

      // Reset failed login attempts (if any)
      user.failedLoginAttempts = 0;
      user.accountLockedUntil = undefined;

      await user.save();

      logger.info(`Password reset successful for user: ${user.id}`);

      // TODO: Send confirmation email
      // await emailService.sendPasswordChangedConfirmation(user.email);

      // TODO: Invalidate all existing sessions for security
      // await Session.destroy({ where: { userId: user.id } });
      // await redisService.invalidateUserSessions(user.id);

      return {
        success: true,
        message: 'Password has been reset successfully. Please log in with your new password.',
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Password reset confirmation error:', error);
      throw new AppError('Failed to reset password', 500, 'PASSWORD_RESET_ERROR');
    }
  }

  /**
   * Validate reset token (without changing password)
   * Useful for frontend to check if token is valid before showing reset form
   */
  public async validateResetToken(token: string): Promise<{ valid: boolean; email?: string }> {
    try {
      const user = await User.findOne({
        where: {
          passwordResetToken: token,
        },
      });

      if (!user || !user.passwordResetExpires || new Date() > user.passwordResetExpires) {
        return { valid: false };
      }

      return {
        valid: true,
        email: user.email,
      };
    } catch (error) {
      logger.error('Token validation error:', error);
      return { valid: false };
    }
  }
}

export default new PasswordResetService();
