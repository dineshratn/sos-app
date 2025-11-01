/**
 * Unit Tests for MFA Feature (Tasks 37-39)
 */

import mfaService from '../../src/services/mfa.service';
import User from '../../src/models/User';
import speakeasy from 'speakeasy';

// Mock dependencies
jest.mock('../../src/models/User');
jest.mock('../../src/utils/logger');
jest.mock('qrcode');
jest.mock('speakeasy');

describe('MFA Feature', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('enrollMFA (Task 37)', () => {
    it('should generate TOTP secret and QR code', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        mfaEnabled: false,
        mfaSecret: null,
        save: jest.fn().mockResolvedValue(true),
      };

      const mockSecret = {
        base32: 'JBSWY3DPEHPK3PXP',
        otpauth_url: 'otpauth://totp/SOS%20App:test@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SOS%20App',
      };

      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);
      (speakeasy.generateSecret as jest.Mock).mockReturnValue(mockSecret);

      const QRCode = require('qrcode');
      QRCode.toDataURL = jest.fn().mockResolvedValue('data:image/png;base64,ABC123');

      // Act
      const result = await mfaService.enrollMFA('user-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(result.qrCode).toBe('data:image/png;base64,ABC123');
      expect(result.manualEntryKey).toBe('JBSWY3DPEHPK3PXP');
      expect(mockUser.mfaSecret).toBe('JBSWY3DPEHPK3PXP');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should reject if MFA already enabled', async () => {
      // Arrange
      const mockUser = {
        mfaEnabled: true,
      };

      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

      // Act & Assert
      await expect(mfaService.enrollMFA('user-123')).rejects.toThrow(
        'MFA is already enabled'
      );
    });

    it('should reject if user not found', async () => {
      // Arrange
      (User.findByPk as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(mfaService.enrollMFA('user-123')).rejects.toThrow('User not found');
    });

    it('should generate secret with correct parameters', async () => {
      // Arrange
      const mockUser = {
        email: 'test@example.com',
        mfaEnabled: false,
        save: jest.fn().mockResolvedValue(true),
      };

      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);
      (speakeasy.generateSecret as jest.Mock).mockReturnValue({
        base32: 'SECRET',
        otpauth_url: 'otpauth://...',
      });

      const QRCode = require('qrcode');
      QRCode.toDataURL = jest.fn().mockResolvedValue('data:image/png;base64,ABC');

      // Act
      await mfaService.enrollMFA('user-123');

      // Assert
      expect(speakeasy.generateSecret).toHaveBeenCalledWith({
        name: 'SOS App (test@example.com)',
        issuer: 'SOS App',
        length: 32,
      });
    });
  });

  describe('verifyAndEnableMFA (Task 38)', () => {
    it('should enable MFA with valid TOTP code', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        mfaSecret: 'JBSWY3DPEHPK3PXP',
        mfaEnabled: false,
        save: jest.fn().mockResolvedValue(true),
      };

      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      // Act
      const result = await mfaService.verifyAndEnableMFA('user-123', '123456');

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully enabled');
      expect(mockUser.mfaEnabled).toBe(true);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should reject invalid TOTP code', async () => {
      // Arrange
      const mockUser = {
        mfaSecret: 'JBSWY3DPEHPK3PXP',
        mfaEnabled: false,
      };

      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      // Act & Assert
      await expect(mfaService.verifyAndEnableMFA('user-123', '000000')).rejects.toThrow(
        'Invalid verification code'
      );
    });

    it('should reject if MFA not initiated', async () => {
      // Arrange
      const mockUser = {
        mfaSecret: null,
        mfaEnabled: false,
      };

      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

      // Act & Assert
      await expect(mfaService.verifyAndEnableMFA('user-123', '123456')).rejects.toThrow(
        'MFA enrollment not initiated'
      );
    });

    it('should verify TOTP with correct parameters', async () => {
      // Arrange
      const mockUser = {
        mfaSecret: 'JBSWY3DPEHPK3PXP',
        mfaEnabled: false,
        save: jest.fn().mockResolvedValue(true),
      };

      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      // Act
      await mfaService.verifyAndEnableMFA('user-123', '123456');

      // Assert
      expect(speakeasy.totp.verify).toHaveBeenCalledWith({
        secret: 'JBSWY3DPEHPK3PXP',
        encoding: 'base32',
        token: '123456',
        window: 2,
      });
    });
  });

  describe('verifyMFALogin (Task 39)', () => {
    it('should verify TOTP code during login', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        mfaSecret: 'JBSWY3DPEHPK3PXP',
        mfaEnabled: true,
      };

      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      // Act
      const result = await mfaService.verifyMFALogin('user-123', '123456');

      // Assert
      expect(result).toBe(true);
      expect(speakeasy.totp.verify).toHaveBeenCalledWith({
        secret: 'JBSWY3DPEHPK3PXP',
        encoding: 'base32',
        token: '123456',
        window: 2,
      });
    });

    it('should return false for invalid TOTP code', async () => {
      // Arrange
      const mockUser = {
        mfaSecret: 'JBSWY3DPEHPK3PXP',
        mfaEnabled: true,
      };

      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      // Act
      const result = await mfaService.verifyMFALogin('user-123', '000000');

      // Assert
      expect(result).toBe(false);
    });

    it('should reject if MFA not enabled', async () => {
      // Arrange
      const mockUser = {
        mfaEnabled: false,
      };

      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

      // Act & Assert
      await expect(mfaService.verifyMFALogin('user-123', '123456')).rejects.toThrow(
        'MFA is not enabled'
      );
    });

    it('should reject if user not found', async () => {
      // Arrange
      (User.findByPk as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(mfaService.verifyMFALogin('user-123', '123456')).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('disableMFA', () => {
    it('should disable MFA with valid TOTP code', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        mfaSecret: 'JBSWY3DPEHPK3PXP',
        mfaEnabled: true,
        save: jest.fn().mockResolvedValue(true),
      };

      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      // Act
      const result = await mfaService.disableMFA('user-123', '123456');

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('disabled');
      expect(mockUser.mfaEnabled).toBe(false);
      expect(mockUser.mfaSecret).toBeUndefined();
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should reject invalid TOTP code', async () => {
      // Arrange
      const mockUser = {
        mfaSecret: 'JBSWY3DPEHPK3PXP',
        mfaEnabled: true,
      };

      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      // Act & Assert
      await expect(mfaService.disableMFA('user-123', '000000')).rejects.toThrow(
        'Invalid verification code'
      );
    });

    it('should reject if MFA not enabled', async () => {
      // Arrange
      const mockUser = {
        mfaEnabled: false,
      };

      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

      // Act & Assert
      await expect(mfaService.disableMFA('user-123', '123456')).rejects.toThrow(
        'MFA is not enabled'
      );
    });
  });
});
