import User, { AuthProvider } from '../../src/models/User';
import { hashPassword } from '../../src/utils/password';

describe('User Model', () => {
  const mockUserData = {
    email: 'test@example.com',
    passwordHash: '$2b$10$hashedpassword',
    authProvider: AuthProvider.LOCAL,
    firstName: 'John',
    lastName: 'Doe',
  };

  describe('Instance methods', () => {
    describe('isAccountLocked', () => {
      it('should return false when accountLockedUntil is null', () => {
        const user = User.build(mockUserData);
        user.accountLockedUntil = undefined;

        expect(user.isAccountLocked()).toBe(false);
      });

      it('should return true when accountLockedUntil is in the future', () => {
        const user = User.build(mockUserData);
        user.accountLockedUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

        expect(user.isAccountLocked()).toBe(true);
      });

      it('should return false when accountLockedUntil is in the past', () => {
        const user = User.build(mockUserData);
        user.accountLockedUntil = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago

        expect(user.isAccountLocked()).toBe(false);
      });
    });

    describe('incrementFailedLoginAttempts', () => {
      it('should increment failed login attempts', () => {
        const user = User.build(mockUserData);
        user.failedLoginAttempts = 0;

        user.incrementFailedLoginAttempts();

        expect(user.failedLoginAttempts).toBe(1);
      });

      it('should lock account after 5 failed attempts', () => {
        const user = User.build(mockUserData);
        user.failedLoginAttempts = 4;

        user.incrementFailedLoginAttempts();

        expect(user.failedLoginAttempts).toBe(5);
        expect(user.accountLockedUntil).toBeDefined();
        expect(user.accountLockedUntil).toBeInstanceOf(Date);
      });

      it('should set lock expiry to 15 minutes from now', () => {
        const user = User.build(mockUserData);
        user.failedLoginAttempts = 4;
        const now = Date.now();

        user.incrementFailedLoginAttempts();

        const lockExpiry = user.accountLockedUntil!.getTime();
        const expectedLockTime = now + 15 * 60 * 1000;

        // Allow 1 second tolerance for test execution time
        expect(lockExpiry).toBeGreaterThan(expectedLockTime - 1000);
        expect(lockExpiry).toBeLessThan(expectedLockTime + 1000);
      });
    });

    describe('resetFailedLoginAttempts', () => {
      it('should reset failed attempts to 0', () => {
        const user = User.build(mockUserData);
        user.failedLoginAttempts = 3;

        user.resetFailedLoginAttempts();

        expect(user.failedLoginAttempts).toBe(0);
      });

      it('should clear accountLockedUntil', () => {
        const user = User.build(mockUserData);
        user.failedLoginAttempts = 5;
        user.accountLockedUntil = new Date(Date.now() + 15 * 60 * 1000);

        user.resetFailedLoginAttempts();

        expect(user.failedLoginAttempts).toBe(0);
        expect(user.accountLockedUntil).toBeUndefined();
      });
    });

    describe('updateLastLogin', () => {
      it('should set lastLoginAt to current time', () => {
        const user = User.build(mockUserData);
        const before = Date.now();

        user.updateLastLogin();

        const after = Date.now();
        const lastLogin = user.lastLoginAt!.getTime();

        expect(lastLogin).toBeGreaterThanOrEqual(before);
        expect(lastLogin).toBeLessThanOrEqual(after);
      });
    });

    describe('toSafeObject', () => {
      it('should return user without sensitive data', () => {
        const user = User.build({
          ...mockUserData,
          id: 'user-123',
          mfaSecret: 'secret-key',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const safeObject = user.toSafeObject();

        expect(safeObject.id).toBe('user-123');
        expect(safeObject.email).toBe(mockUserData.email);
        expect(safeObject.firstName).toBe(mockUserData.firstName);
        expect(safeObject.lastName).toBe(mockUserData.lastName);

        // Sensitive fields should not be included
        expect(safeObject).not.toHaveProperty('passwordHash');
        expect(safeObject).not.toHaveProperty('mfaSecret');
      });

      it('should include public fields', () => {
        const user = User.build({
          ...mockUserData,
          id: 'user-123',
          phoneNumber: '+1234567890',
          mfaEnabled: true,
          emailVerified: true,
          phoneVerified: false,
          lastLoginAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const safeObject = user.toSafeObject();

        expect(safeObject).toHaveProperty('id');
        expect(safeObject).toHaveProperty('email');
        expect(safeObject).toHaveProperty('phoneNumber');
        expect(safeObject).toHaveProperty('authProvider');
        expect(safeObject).toHaveProperty('firstName');
        expect(safeObject).toHaveProperty('lastName');
        expect(safeObject).toHaveProperty('mfaEnabled');
        expect(safeObject).toHaveProperty('emailVerified');
        expect(safeObject).toHaveProperty('phoneVerified');
        expect(safeObject).toHaveProperty('lastLoginAt');
        expect(safeObject).toHaveProperty('createdAt');
        expect(safeObject).toHaveProperty('updatedAt');
      });
    });
  });

  describe('Authentication provider logic', () => {
    it('should allow local auth with password', () => {
      const user = User.build({
        email: 'local@example.com',
        passwordHash: 'hashed-password',
        authProvider: AuthProvider.LOCAL,
      });

      expect(user.authProvider).toBe(AuthProvider.LOCAL);
      expect(user.passwordHash).toBeDefined();
    });

    it('should allow Google OAuth without password', () => {
      const user = User.build({
        email: 'google@example.com',
        authProvider: AuthProvider.GOOGLE,
        providerId: 'google-user-id',
      });

      expect(user.authProvider).toBe(AuthProvider.GOOGLE);
      expect(user.providerId).toBe('google-user-id');
      expect(user.passwordHash).toBeUndefined();
    });

    it('should allow Apple OAuth without password', () => {
      const user = User.build({
        email: 'apple@example.com',
        authProvider: AuthProvider.APPLE,
        providerId: 'apple-user-id',
      });

      expect(user.authProvider).toBe(AuthProvider.APPLE);
      expect(user.providerId).toBe('apple-user-id');
      expect(user.passwordHash).toBeUndefined();
    });
  });

  describe('MFA support', () => {
    it('should default mfaEnabled to false', () => {
      const user = User.build(mockUserData);

      expect(user.mfaEnabled).toBe(false);
    });

    it('should allow enabling MFA', () => {
      const user = User.build({
        ...mockUserData,
        mfaEnabled: true,
        mfaSecret: 'totp-secret',
      });

      expect(user.mfaEnabled).toBe(true);
      expect(user.mfaSecret).toBe('totp-secret');
    });
  });

  describe('Email and phone verification', () => {
    it('should default verification flags to false', () => {
      const user = User.build(mockUserData);

      expect(user.emailVerified).toBe(false);
      expect(user.phoneVerified).toBe(false);
    });

    it('should track verification status separately', () => {
      const user = User.build({
        ...mockUserData,
        phoneNumber: '+1234567890',
        emailVerified: true,
        phoneVerified: false,
      });

      expect(user.emailVerified).toBe(true);
      expect(user.phoneVerified).toBe(false);
    });
  });
});
