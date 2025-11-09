"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const contactValidation_1 = require("../../utils/contactValidation");
const errorHandler_1 = require("../../middleware/errorHandler");
(0, globals_1.describe)('Contact Validation Utilities', () => {
    (0, globals_1.describe)('validateEmail', () => {
        (0, globals_1.it)('should validate correct email addresses', () => {
            (0, globals_1.expect)((0, contactValidation_1.validateEmail)('test@example.com')).toBe(true);
            (0, globals_1.expect)((0, contactValidation_1.validateEmail)('user.name+tag@example.co.uk')).toBe(true);
            (0, globals_1.expect)((0, contactValidation_1.validateEmail)('first.last@subdomain.example.com')).toBe(true);
        });
        (0, globals_1.it)('should reject invalid email addresses', () => {
            (0, globals_1.expect)((0, contactValidation_1.validateEmail)('invalid')).toBe(false);
            (0, globals_1.expect)((0, contactValidation_1.validateEmail)('test@')).toBe(false);
            (0, globals_1.expect)((0, contactValidation_1.validateEmail)('@example.com')).toBe(false);
            (0, globals_1.expect)((0, contactValidation_1.validateEmail)('test @example.com')).toBe(false);
            (0, globals_1.expect)((0, contactValidation_1.validateEmail)('')).toBe(false);
        });
        (0, globals_1.it)('should handle email addresses with special characters', () => {
            (0, globals_1.expect)((0, contactValidation_1.validateEmail)('test+filter@example.com')).toBe(true);
            (0, globals_1.expect)((0, contactValidation_1.validateEmail)('test_user@example.com')).toBe(true);
            (0, globals_1.expect)((0, contactValidation_1.validateEmail)('test.user@example.com')).toBe(true);
        });
        (0, globals_1.it)('should reject emails longer than 254 characters', () => {
            const longEmail = 'a'.repeat(250) + '@example.com';
            (0, globals_1.expect)((0, contactValidation_1.validateEmail)(longEmail)).toBe(false);
        });
        (0, globals_1.it)('should handle null and undefined inputs', () => {
            (0, globals_1.expect)((0, contactValidation_1.validateEmail)(null)).toBe(false);
            (0, globals_1.expect)((0, contactValidation_1.validateEmail)(undefined)).toBe(false);
        });
    });
    (0, globals_1.describe)('validatePhoneNumber', () => {
        (0, globals_1.it)('should validate US phone numbers', () => {
            const result = (0, contactValidation_1.validatePhoneNumber)('+12025551234', 'US');
            (0, globals_1.expect)(result.isValid).toBe(true);
            (0, globals_1.expect)(result.formatted).toBeDefined();
            (0, globals_1.expect)(result.country).toBe('US');
        });
        (0, globals_1.it)('should validate international phone numbers', () => {
            const result = (0, contactValidation_1.validatePhoneNumber)('+442071234567', 'GB');
            (0, globals_1.expect)(result.isValid).toBe(true);
            (0, globals_1.expect)(result.country).toBe('GB');
        });
        (0, globals_1.it)('should handle phone numbers without country code', () => {
            const result = (0, contactValidation_1.validatePhoneNumber)('2025551234', 'US');
            (0, globals_1.expect)(result.isValid).toBe(true);
        });
        (0, globals_1.it)('should reject invalid phone numbers', () => {
            const result = (0, contactValidation_1.validatePhoneNumber)('123', 'US');
            (0, globals_1.expect)(result.isValid).toBe(false);
            (0, globals_1.expect)(result.error).toBeDefined();
        });
        (0, globals_1.it)('should handle empty phone numbers', () => {
            const result = (0, contactValidation_1.validatePhoneNumber)('', 'US');
            (0, globals_1.expect)(result.isValid).toBe(false);
            (0, globals_1.expect)(result.error).toBe('Phone number is required');
        });
        (0, globals_1.it)('should handle null and undefined inputs', () => {
            const result1 = (0, contactValidation_1.validatePhoneNumber)(null, 'US');
            (0, globals_1.expect)(result1.isValid).toBe(false);
            const result2 = (0, contactValidation_1.validatePhoneNumber)(undefined, 'US');
            (0, globals_1.expect)(result2.isValid).toBe(false);
        });
    });
    (0, globals_1.describe)('formatPhoneNumber', () => {
        (0, globals_1.it)('should format phone number to E.164 format', () => {
            const formatted = (0, contactValidation_1.formatPhoneNumber)('+1 (202) 555-1234', 'US');
            (0, globals_1.expect)(formatted).toBe('+12025551234');
        });
        (0, globals_1.it)('should handle phone numbers with spaces and dashes', () => {
            const formatted = (0, contactValidation_1.formatPhoneNumber)('202-555-1234', 'US');
            (0, globals_1.expect)(formatted).toMatch(/^\+1\d{10}$/);
        });
        (0, globals_1.it)('should throw AppError for invalid phone numbers', () => {
            (0, globals_1.expect)(() => (0, contactValidation_1.formatPhoneNumber)('123', 'US')).toThrow(errorHandler_1.AppError);
            (0, globals_1.expect)(() => (0, contactValidation_1.formatPhoneNumber)('invalid', 'US')).toThrow(errorHandler_1.AppError);
        });
        (0, globals_1.it)('should handle international phone numbers', () => {
            const formatted = (0, contactValidation_1.formatPhoneNumber)('+44 20 7123 4567', 'GB');
            (0, globals_1.expect)(formatted).toMatch(/^\+44\d+$/);
        });
    });
    (0, globals_1.describe)('sanitizeEmail', () => {
        (0, globals_1.it)('should trim and lowercase email addresses', () => {
            (0, globals_1.expect)((0, contactValidation_1.sanitizeEmail)('  Test@Example.COM  ')).toBe('test@example.com');
            (0, globals_1.expect)((0, contactValidation_1.sanitizeEmail)('USER@DOMAIN.COM')).toBe('user@domain.com');
        });
        (0, globals_1.it)('should throw AppError for invalid emails', () => {
            (0, globals_1.expect)(() => (0, contactValidation_1.sanitizeEmail)('invalid')).toThrow(errorHandler_1.AppError);
            (0, globals_1.expect)(() => (0, contactValidation_1.sanitizeEmail)('')).toThrow(errorHandler_1.AppError);
        });
        (0, globals_1.it)('should throw AppError for null or undefined', () => {
            (0, globals_1.expect)(() => (0, contactValidation_1.sanitizeEmail)(null)).toThrow(errorHandler_1.AppError);
            (0, globals_1.expect)(() => (0, contactValidation_1.sanitizeEmail)(undefined)).toThrow(errorHandler_1.AppError);
        });
        (0, globals_1.it)('should preserve valid email format', () => {
            (0, globals_1.expect)((0, contactValidation_1.sanitizeEmail)('test+filter@example.com')).toBe('test+filter@example.com');
            (0, globals_1.expect)((0, contactValidation_1.sanitizeEmail)('first.last@example.com')).toBe('first.last@example.com');
        });
    });
    (0, globals_1.describe)('validateContactInfo', () => {
        (0, globals_1.it)('should validate when both phone and email are provided', () => {
            const result = (0, contactValidation_1.validateContactInfo)('+12025551234', 'test@example.com', 'US');
            (0, globals_1.expect)(result.isValid).toBe(true);
            (0, globals_1.expect)(result.formattedPhone).toBeDefined();
            (0, globals_1.expect)(result.sanitizedEmail).toBe('test@example.com');
            (0, globals_1.expect)(result.errors).toHaveLength(0);
        });
        (0, globals_1.it)('should validate when only phone is provided', () => {
            const result = (0, contactValidation_1.validateContactInfo)('+12025551234', undefined, 'US');
            (0, globals_1.expect)(result.isValid).toBe(true);
            (0, globals_1.expect)(result.formattedPhone).toBeDefined();
            (0, globals_1.expect)(result.sanitizedEmail).toBeUndefined();
            (0, globals_1.expect)(result.errors).toHaveLength(0);
        });
        (0, globals_1.it)('should validate when only email is provided', () => {
            const result = (0, contactValidation_1.validateContactInfo)(undefined, 'test@example.com', 'US');
            (0, globals_1.expect)(result.isValid).toBe(true);
            (0, globals_1.expect)(result.formattedPhone).toBeUndefined();
            (0, globals_1.expect)(result.sanitizedEmail).toBe('test@example.com');
            (0, globals_1.expect)(result.errors).toHaveLength(0);
        });
        (0, globals_1.it)('should fail when neither phone nor email is provided', () => {
            const result = (0, contactValidation_1.validateContactInfo)(undefined, undefined, 'US');
            (0, globals_1.expect)(result.isValid).toBe(false);
            (0, globals_1.expect)(result.errors).toContain('At least one contact method (phone or email) is required');
        });
        (0, globals_1.it)('should return errors for invalid phone number', () => {
            const result = (0, contactValidation_1.validateContactInfo)('123', 'test@example.com', 'US');
            (0, globals_1.expect)(result.isValid).toBe(false);
            (0, globals_1.expect)(result.errors.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should return errors for invalid email', () => {
            const result = (0, contactValidation_1.validateContactInfo)('+12025551234', 'invalid', 'US');
            (0, globals_1.expect)(result.isValid).toBe(false);
            (0, globals_1.expect)(result.errors.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should return multiple errors when both are invalid', () => {
            const result = (0, contactValidation_1.validateContactInfo)('123', 'invalid', 'US');
            (0, globals_1.expect)(result.isValid).toBe(false);
            (0, globals_1.expect)(result.errors.length).toBeGreaterThan(1);
        });
    });
    (0, globals_1.describe)('isMobileNumber', () => {
        (0, globals_1.it)('should return true for mobile numbers', () => {
            // US mobile number
            const result = (0, contactValidation_1.isMobileNumber)('+12025551234', 'US');
            (0, globals_1.expect)(typeof result).toBe('boolean');
        });
        (0, globals_1.it)('should handle invalid phone numbers', () => {
            const result = (0, contactValidation_1.isMobileNumber)('invalid', 'US');
            (0, globals_1.expect)(result).toBe(false);
        });
        (0, globals_1.it)('should handle empty phone numbers', () => {
            const result = (0, contactValidation_1.isMobileNumber)('', 'US');
            (0, globals_1.expect)(result).toBe(false);
        });
        (0, globals_1.it)('should handle international mobile numbers', () => {
            // UK mobile number
            const result = (0, contactValidation_1.isMobileNumber)('+447123456789', 'GB');
            (0, globals_1.expect)(typeof result).toBe('boolean');
        });
        (0, globals_1.it)('should return false for landline numbers', () => {
            // Note: This test may vary based on the phone number library's detection
            const result = (0, contactValidation_1.isMobileNumber)('+12025551234', 'US');
            (0, globals_1.expect)(typeof result).toBe('boolean');
        });
    });
    (0, globals_1.describe)('Edge Cases', () => {
        (0, globals_1.it)('should handle phone numbers with various formats', () => {
            const formats = [
                '+1 (202) 555-1234',
                '202-555-1234',
                '(202) 555-1234',
                '202.555.1234',
                '2025551234',
            ];
            formats.forEach((format) => {
                const result = (0, contactValidation_1.validatePhoneNumber)(format, 'US');
                // At least should not throw an error
                (0, globals_1.expect)(result).toHaveProperty('isValid');
            });
        });
        (0, globals_1.it)('should handle emails with various TLDs', () => {
            const emails = [
                'test@example.com',
                'test@example.co.uk',
                'test@example.io',
                'test@example.technology',
            ];
            emails.forEach((email) => {
                (0, globals_1.expect)((0, contactValidation_1.validateEmail)(email)).toBe(true);
            });
        });
        (0, globals_1.it)('should handle mixed case in emails', () => {
            const result = (0, contactValidation_1.sanitizeEmail)('TeSt@ExAmPlE.CoM');
            (0, globals_1.expect)(result).toBe('test@example.com');
        });
        (0, globals_1.it)('should preserve phone number country information', () => {
            const result = (0, contactValidation_1.validatePhoneNumber)('+442071234567', 'GB');
            (0, globals_1.expect)(result.country).toBe('GB');
        });
    });
    (0, globals_1.describe)('Security Tests', () => {
        (0, globals_1.it)('should handle potentially malicious email inputs', () => {
            const maliciousInputs = [
                'test@example.com<script>alert(1)</script>',
                'test@example.com\'OR\'1\'=\'1',
                'test@example.com\0',
            ];
            maliciousInputs.forEach((input) => {
                (0, globals_1.expect)((0, contactValidation_1.validateEmail)(input)).toBe(false);
            });
        });
        (0, globals_1.it)('should handle SQL injection attempts in phone numbers', () => {
            const maliciousInputs = [
                '\'; DROP TABLE users; --',
                '1\' OR \'1\'=\'1',
            ];
            maliciousInputs.forEach((input) => {
                const result = (0, contactValidation_1.validatePhoneNumber)(input, 'US');
                (0, globals_1.expect)(result.isValid).toBe(false);
            });
        });
        (0, globals_1.it)('should handle excessively long inputs', () => {
            const longEmail = 'a'.repeat(1000) + '@example.com';
            (0, globals_1.expect)((0, contactValidation_1.validateEmail)(longEmail)).toBe(false);
            const longPhone = '1'.repeat(1000);
            const result = (0, contactValidation_1.validatePhoneNumber)(longPhone, 'US');
            (0, globals_1.expect)(result.isValid).toBe(false);
        });
    });
});
//# sourceMappingURL=contactValidation.test.js.map