import {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
  generateRandomPassword,
} from '../../src/utils/password';

describe('Password Utilities', () => {
  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty password', async () => {
      const password = '';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password and hash', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      const isMatch = await comparePassword(password, hash);

      expect(isMatch).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword456!';
      const hash = await hashPassword(password);
      const isMatch = await comparePassword(wrongPassword, hash);

      expect(isMatch).toBe(false);
    });

    it('should handle empty password comparison', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      const isMatch = await comparePassword('', hash);

      expect(isMatch).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should accept strong password', () => {
      const password = 'SecurePass123!';
      const result = validatePasswordStrength(password);

      expect(result.isValid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should reject password shorter than 8 characters', () => {
      const password = 'Pass1!';
      const result = validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('at least 8 characters');
    });

    it('should reject password without uppercase letter', () => {
      const password = 'password123!';
      const result = validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('uppercase letter');
    });

    it('should reject password without lowercase letter', () => {
      const password = 'PASSWORD123!';
      const result = validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('lowercase letter');
    });

    it('should reject password without number', () => {
      const password = 'Password!';
      const result = validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('number');
    });

    it('should reject password without special character', () => {
      const password = 'Password123';
      const result = validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('special character');
    });

    it('should accept password with all requirements', () => {
      const passwords = [
        'SecurePass123!',
        'MyP@ssw0rd',
        'C0mpl3x!ty',
        'Test@1234',
      ];

      passwords.forEach((password) => {
        const result = validatePasswordStrength(password);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('generateRandomPassword', () => {
    it('should generate password of default length', () => {
      const password = generateRandomPassword();

      expect(password.length).toBe(12);
    });

    it('should generate password of specified length', () => {
      const length = 16;
      const password = generateRandomPassword(length);

      expect(password.length).toBe(length);
    });

    it('should generate password that meets strength requirements', () => {
      const password = generateRandomPassword();
      const validation = validatePasswordStrength(password);

      expect(validation.isValid).toBe(true);
    });

    it('should generate different passwords each time', () => {
      const password1 = generateRandomPassword();
      const password2 = generateRandomPassword();
      const password3 = generateRandomPassword();

      expect(password1).not.toBe(password2);
      expect(password2).not.toBe(password3);
      expect(password1).not.toBe(password3);
    });

    it('should contain uppercase letter', () => {
      const password = generateRandomPassword();

      expect(/[A-Z]/.test(password)).toBe(true);
    });

    it('should contain lowercase letter', () => {
      const password = generateRandomPassword();

      expect(/[a-z]/.test(password)).toBe(true);
    });

    it('should contain number', () => {
      const password = generateRandomPassword();

      expect(/[0-9]/.test(password)).toBe(true);
    });

    it('should contain special character', () => {
      const password = generateRandomPassword();

      expect(/[!@#$%^&*()_+\-=\[\]{}]/.test(password)).toBe(true);
    });
  });
});
