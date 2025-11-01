/**
 * Unit Tests for Password Reset Feature (Tasks 35-36)
 */

import authService from '../../src/services/auth.service';
import User from '../../src/models/User';
import Session from '../../src/models/Session';
import redisService from '../../src/services/redis.service';
import crypto from 'crypto';

// Mock dependencies
jest.mock('../../src/models/User');
jest.mock('../../src/models/Session');
jest.mock('../../src/services/redis.service');
jest.mock('../../src/utils/logger');

describe('Password Reset Feature', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestPasswordReset (Task 35)', () => {
    it('should generate reset token and return success for existing user', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordResetToken: null,
        passwordResetExpires: null,
        save: jest.fn().mockResolvedValue(true),
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      // Act
      const result = await authService.requestPasswordReset('test@example.com');

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('password reset link has been sent');
      expect(mockUser.passwordResetToken).toBeTruthy();
      expect(mockUser.passwordResetExpires).toBeTruthy();
      expect(mockUser.save).toHaveBeenCalled();
      expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
    });

    it('should return success even for non-existent user (security)', async () => {
      // Arrange
      (User.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await authService.requestPasswordReset('nonexistent@example.com');

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('password reset link has been sent');
    });

    it('should hash the reset token before storing', async () => {
      // Arrange
      const mockUser = {
        email: 'test@example.com',
        passwordResetToken: null,
        save: jest.fn().mockResolvedValue(true),
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      // Act
      await authService.requestPasswordReset('test@example.com');

      // Assert
      // Token should be 64 characters (SHA-256 hex digest)
      expect(mockUser.passwordResetToken).toHaveLength(64);
    });

    it('should set token expiration to 1 hour', async () => {
      // Arrange
      const mockUser = {
        email: 'test@example.com',
        passwordResetToken: null,
        passwordResetExpires: null,
        save: jest.fn().mockResolvedValue(true),
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      const now = new Date();

      // Act
      await authService.requestPasswordReset('test@example.com');

      // Assert
      const expiresAt = mockUser.passwordResetExpires;
      const timeDiff = expiresAt.getTime() - now.getTime();
      const oneHour = 60 * 60 * 1000;
      expect(timeDiff).toBeGreaterThanOrEqual(oneHour - 1000); // Allow 1s tolerance
      expect(timeDiff).toBeLessThanOrEqual(oneHour + 1000);
    });
  });

  describe('resetPassword (Task 36)', () => {
    it('should reset password with valid token', async () => {
      // Arrange
      const plainToken = 'test-token-123';
      const hashedToken = crypto.createHash('sha256').update(plainToken).digest('hex');

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordResetToken: hashedToken,
        passwordResetExpires: new Date(Date.now() + 3600000), // 1 hour from now
        passwordHash: 'old-hash',
        save: jest.fn().mockResolvedValue(true),
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (Session.findAll as jest.Mock).mockResolvedValue([]);
      (Session.destroy as jest.Mock).mockResolvedValue(1);

      // Act
      const result = await authService.resetPassword(plainToken, 'NewPassword@123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('reset successfully');
      expect(mockUser.passwordHash).not.toBe('old-hash');
      expect(mockUser.passwordResetToken).toBeUndefined();
      expect(mockUser.passwordResetExpires).toBeUndefined();
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      // Arrange
      (User.findOne as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        authService.resetPassword('invalid-token', 'NewPassword@123')
      ).rejects.toThrow('Invalid or expired password reset token');
    });

    it('should reject expired token', async () => {
      // Arrange
      const plainToken = 'test-token-123';
      const hashedToken = crypto.createHash('sha256').update(plainToken).digest('hex');

      const mockUser = {
        passwordResetToken: hashedToken,
        passwordResetExpires: new Date(Date.now() - 1000), // Expired
        save: jest.fn().mockResolvedValue(true),
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        authService.resetPassword(plainToken, 'NewPassword@123')
      ).rejects.toThrow('expired');
    });

    it('should reject weak passwords', async () => {
      // Arrange
      const plainToken = 'test-token-123';
      const hashedToken = crypto.createHash('sha256').update(plainToken).digest('hex');

      const mockUser = {
        passwordResetToken: hashedToken,
        passwordResetExpires: new Date(Date.now() + 3600000),
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        authService.resetPassword(plainToken, 'weak')
      ).rejects.toThrow();
    });

    it('should invalidate all existing sessions', async () => {
      // Arrange
      const plainToken = 'test-token-123';
      const hashedToken = crypto.createHash('sha256').update(plainToken).digest('hex');

      const mockUser = {
        id: 'user-123',
        passwordResetToken: hashedToken,
        passwordResetExpires: new Date(Date.now() + 3600000),
        save: jest.fn().mockResolvedValue(true),
      };

      const mockSessions = [
        { id: 'session-1', refreshToken: 'token1' },
        { id: 'session-2', refreshToken: 'token2' },
      ];

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (Session.findAll as jest.Mock).mockResolvedValue(mockSessions);
      (Session.destroy as jest.Mock).mockResolvedValue(2);
      (redisService.blacklistToken as jest.Mock).mockResolvedValue(true);
      (redisService.deleteSession as jest.Mock).mockResolvedValue(true);

      // Mock JWT utility
      jest.mock('../../src/utils/jwt', () => ({
        getTokenExpiryTime: jest.fn().mockReturnValue(3600),
      }));

      // Act
      await authService.resetPassword(plainToken, 'NewPassword@123');

      // Assert
      expect(Session.findAll).toHaveBeenCalledWith({ where: { userId: 'user-123' } });
      expect(Session.destroy).toHaveBeenCalledWith({ where: { userId: 'user-123' } });
    });
  });
});
