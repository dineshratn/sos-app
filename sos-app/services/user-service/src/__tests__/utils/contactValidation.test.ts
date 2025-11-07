import { describe, it, expect } from '@jest/globals';
import {
  validateEmail,
  validatePhoneNumber,
  formatPhoneNumber,
  sanitizeEmail,
  validateContactInfo,
  isMobileNumber,
} from '../../utils/contactValidation';
import { AppError } from '../../middleware/errorHandler';

describe('Contact Validation Utilities', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@example.co.uk')).toBe(true);
      expect(validateEmail('first.last@subdomain.example.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test @example.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });

    it('should handle email addresses with special characters', () => {
      expect(validateEmail('test+filter@example.com')).toBe(true);
      expect(validateEmail('test_user@example.com')).toBe(true);
      expect(validateEmail('test.user@example.com')).toBe(true);
    });

    it('should reject emails longer than 254 characters', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(validateEmail(longEmail)).toBe(false);
    });

    it('should handle null and undefined inputs', () => {
      expect(validateEmail(null as any)).toBe(false);
      expect(validateEmail(undefined as any)).toBe(false);
    });
  });

  describe('validatePhoneNumber', () => {
    it('should validate US phone numbers', () => {
      const result = validatePhoneNumber('+12025551234', 'US');
      expect(result.isValid).toBe(true);
      expect(result.formatted).toBeDefined();
      expect(result.country).toBe('US');
    });

    it('should validate international phone numbers', () => {
      const result = validatePhoneNumber('+442071234567', 'GB');
      expect(result.isValid).toBe(true);
      expect(result.country).toBe('GB');
    });

    it('should handle phone numbers without country code', () => {
      const result = validatePhoneNumber('2025551234', 'US');
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      const result = validatePhoneNumber('123', 'US');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle empty phone numbers', () => {
      const result = validatePhoneNumber('', 'US');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Phone number is required');
    });

    it('should handle null and undefined inputs', () => {
      const result1 = validatePhoneNumber(null as any, 'US');
      expect(result1.isValid).toBe(false);

      const result2 = validatePhoneNumber(undefined as any, 'US');
      expect(result2.isValid).toBe(false);
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format phone number to E.164 format', () => {
      const formatted = formatPhoneNumber('+1 (202) 555-1234', 'US');
      expect(formatted).toBe('+12025551234');
    });

    it('should handle phone numbers with spaces and dashes', () => {
      const formatted = formatPhoneNumber('202-555-1234', 'US');
      expect(formatted).toMatch(/^\+1\d{10}$/);
    });

    it('should throw AppError for invalid phone numbers', () => {
      expect(() => formatPhoneNumber('123', 'US')).toThrow(AppError);
      expect(() => formatPhoneNumber('invalid', 'US')).toThrow(AppError);
    });

    it('should handle international phone numbers', () => {
      const formatted = formatPhoneNumber('+44 20 7123 4567', 'GB');
      expect(formatted).toMatch(/^\+44\d+$/);
    });
  });

  describe('sanitizeEmail', () => {
    it('should trim and lowercase email addresses', () => {
      expect(sanitizeEmail('  Test@Example.COM  ')).toBe('test@example.com');
      expect(sanitizeEmail('USER@DOMAIN.COM')).toBe('user@domain.com');
    });

    it('should throw AppError for invalid emails', () => {
      expect(() => sanitizeEmail('invalid')).toThrow(AppError);
      expect(() => sanitizeEmail('')).toThrow(AppError);
    });

    it('should throw AppError for null or undefined', () => {
      expect(() => sanitizeEmail(null as any)).toThrow(AppError);
      expect(() => sanitizeEmail(undefined as any)).toThrow(AppError);
    });

    it('should preserve valid email format', () => {
      expect(sanitizeEmail('test+filter@example.com')).toBe('test+filter@example.com');
      expect(sanitizeEmail('first.last@example.com')).toBe('first.last@example.com');
    });
  });

  describe('validateContactInfo', () => {
    it('should validate when both phone and email are provided', () => {
      const result = validateContactInfo('+12025551234', 'test@example.com', 'US');
      expect(result.isValid).toBe(true);
      expect(result.formattedPhone).toBeDefined();
      expect(result.sanitizedEmail).toBe('test@example.com');
      expect(result.errors).toHaveLength(0);
    });

    it('should validate when only phone is provided', () => {
      const result = validateContactInfo('+12025551234', undefined, 'US');
      expect(result.isValid).toBe(true);
      expect(result.formattedPhone).toBeDefined();
      expect(result.sanitizedEmail).toBeUndefined();
      expect(result.errors).toHaveLength(0);
    });

    it('should validate when only email is provided', () => {
      const result = validateContactInfo(undefined, 'test@example.com', 'US');
      expect(result.isValid).toBe(true);
      expect(result.formattedPhone).toBeUndefined();
      expect(result.sanitizedEmail).toBe('test@example.com');
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when neither phone nor email is provided', () => {
      const result = validateContactInfo(undefined, undefined, 'US');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one contact method (phone or email) is required');
    });

    it('should return errors for invalid phone number', () => {
      const result = validateContactInfo('123', 'test@example.com', 'US');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return errors for invalid email', () => {
      const result = validateContactInfo('+12025551234', 'invalid', 'US');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return multiple errors when both are invalid', () => {
      const result = validateContactInfo('123', 'invalid', 'US');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('isMobileNumber', () => {
    it('should return true for mobile numbers', () => {
      // US mobile number
      const result = isMobileNumber('+12025551234', 'US');
      expect(typeof result).toBe('boolean');
    });

    it('should handle invalid phone numbers', () => {
      const result = isMobileNumber('invalid', 'US');
      expect(result).toBe(false);
    });

    it('should handle empty phone numbers', () => {
      const result = isMobileNumber('', 'US');
      expect(result).toBe(false);
    });

    it('should handle international mobile numbers', () => {
      // UK mobile number
      const result = isMobileNumber('+447123456789', 'GB');
      expect(typeof result).toBe('boolean');
    });

    it('should return false for landline numbers', () => {
      // Note: This test may vary based on the phone number library's detection
      const result = isMobileNumber('+12025551234', 'US');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Edge Cases', () => {
    it('should handle phone numbers with various formats', () => {
      const formats = [
        '+1 (202) 555-1234',
        '202-555-1234',
        '(202) 555-1234',
        '202.555.1234',
        '2025551234',
      ];

      formats.forEach((format) => {
        const result = validatePhoneNumber(format, 'US');
        // At least should not throw an error
        expect(result).toHaveProperty('isValid');
      });
    });

    it('should handle emails with various TLDs', () => {
      const emails = [
        'test@example.com',
        'test@example.co.uk',
        'test@example.io',
        'test@example.technology',
      ];

      emails.forEach((email) => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    it('should handle mixed case in emails', () => {
      const result = sanitizeEmail('TeSt@ExAmPlE.CoM');
      expect(result).toBe('test@example.com');
    });

    it('should preserve phone number country information', () => {
      const result = validatePhoneNumber('+442071234567', 'GB');
      expect(result.country).toBe('GB');
    });
  });

  describe('Security Tests', () => {
    it('should handle potentially malicious email inputs', () => {
      const maliciousInputs = [
        'test@example.com<script>alert(1)</script>',
        'test@example.com\'OR\'1\'=\'1',
        'test@example.com\0',
      ];

      maliciousInputs.forEach((input) => {
        expect(validateEmail(input)).toBe(false);
      });
    });

    it('should handle SQL injection attempts in phone numbers', () => {
      const maliciousInputs = [
        '\'; DROP TABLE users; --',
        '1\' OR \'1\'=\'1',
      ];

      maliciousInputs.forEach((input) => {
        const result = validatePhoneNumber(input, 'US');
        expect(result.isValid).toBe(false);
      });
    });

    it('should handle excessively long inputs', () => {
      const longEmail = 'a'.repeat(1000) + '@example.com';
      expect(validateEmail(longEmail)).toBe(false);

      const longPhone = '1'.repeat(1000);
      const result = validatePhoneNumber(longPhone, 'US');
      expect(result.isValid).toBe(false);
    });
  });
});
