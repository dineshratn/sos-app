import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  encrypt,
  decrypt,
  encryptObject,
  decryptObject,
  hashData,
  generateSecureToken,
  verifyEncryptedData,
  maskSensitiveData,
  redactPHI,
} from '../../utils/encryption';

describe('Encryption Utility', () => {
  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt text correctly', () => {
      const plaintext = 'Sensitive medical information';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should return null for null input', () => {
      expect(encrypt(null)).toBeNull();
      expect(decrypt(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(encrypt(undefined)).toBeNull();
      expect(decrypt(undefined)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(encrypt('')).toBeNull();
      expect(decrypt('')).toBeNull();
    });

    it('should produce different encrypted values for same plaintext', () => {
      const plaintext = 'Sensitive data';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      // Different IVs should produce different encrypted outputs
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to the same value
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });

    it('should handle special characters', () => {
      const plaintext = 'Test@#$%^&*()_+{}[]|:;"<>,.?/~`';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle Unicode characters', () => {
      const plaintext = '测试 тест परीक्षा テスト 🏥';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle long text', () => {
      const plaintext = 'A'.repeat(10000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('encryptObject and decryptObject', () => {
    it('should encrypt and decrypt object fields', () => {
      const obj = {
        name: 'John Doe',
        ssn: '123-45-6789',
        diagnosis: 'Diabetes',
        publicField: 'Not encrypted',
      };

      const encrypted = encryptObject(obj, ['ssn', 'diagnosis']);
      expect(encrypted.name).toBe('John Doe');
      expect(encrypted.publicField).toBe('Not encrypted');
      expect(encrypted.ssn).not.toBe('123-45-6789');
      expect(encrypted.diagnosis).not.toBe('Diabetes');

      const decrypted = decryptObject(encrypted, ['ssn', 'diagnosis']);
      expect(decrypted.ssn).toBe('123-45-6789');
      expect(decrypted.diagnosis).toBe('Diabetes');
    });

    it('should handle null fields in object', () => {
      const obj = {
        name: 'John Doe',
        ssn: null,
        diagnosis: undefined,
      };

      const encrypted = encryptObject(obj, ['ssn', 'diagnosis']);
      expect(encrypted.ssn).toBeNull();

      const decrypted = decryptObject(encrypted, ['ssn', 'diagnosis']);
      expect(decrypted.ssn).toBeNull();
    });
  });

  describe('hashData', () => {
    it('should generate consistent hash for same input', () => {
      const data = 'test@example.com';
      const hash1 = hashData(data);
      const hash2 = hashData(data);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different inputs', () => {
      const hash1 = hashData('test1@example.com');
      const hash2 = hashData('test2@example.com');

      expect(hash1).not.toBe(hash2);
    });

    it('should generate 64-character hex string (SHA-256)', () => {
      const hash = hashData('test');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate token of correct length', () => {
      const token = generateSecureToken(32);
      expect(token).toHaveLength(64); // 32 bytes = 64 hex characters
    });

    it('should generate different tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();

      expect(token1).not.toBe(token2);
    });

    it('should generate token with custom length', () => {
      const token = generateSecureToken(16);
      expect(token).toHaveLength(32); // 16 bytes = 32 hex characters
    });

    it('should only contain hexadecimal characters', () => {
      const token = generateSecureToken();
      expect(token).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('verifyEncryptedData', () => {
    it('should verify valid encrypted data', () => {
      const plaintext = 'Sensitive information';
      const encrypted = encrypt(plaintext);

      expect(verifyEncryptedData(encrypted!)).toBe(true);
    });

    it('should reject invalid JSON', () => {
      const invalid = 'not valid json';
      expect(verifyEncryptedData(invalid)).toBe(false);
    });

    it('should reject incomplete encrypted data', () => {
      const incomplete = JSON.stringify({
        encrypted: 'abc',
        iv: 'def',
        // missing authTag
      });

      expect(verifyEncryptedData(incomplete)).toBe(false);
    });

    it('should reject tampered data', () => {
      const plaintext = 'Original data';
      const encrypted = encrypt(plaintext);
      const parsed = JSON.parse(encrypted!);

      // Tamper with the encrypted data
      parsed.encrypted = 'tampered';
      const tampered = JSON.stringify(parsed);

      expect(verifyEncryptedData(tampered)).toBe(false);
    });
  });

  describe('maskSensitiveData', () => {
    it('should mask data correctly', () => {
      const data = '1234567890';
      const masked = maskSensitiveData(data);

      expect(masked).toBe('1234******');
    });

    it('should mask with custom visible characters', () => {
      const data = '1234567890';
      const masked = maskSensitiveData(data, 2);

      expect(masked).toBe('12********');
    });

    it('should handle short data', () => {
      const data = '123';
      const masked = maskSensitiveData(data, 4);

      expect(masked).toBe('***');
    });

    it('should handle null and undefined', () => {
      expect(maskSensitiveData(null)).toBe('***');
      expect(maskSensitiveData(undefined)).toBe('***');
    });

    it('should handle empty string', () => {
      expect(maskSensitiveData('')).toBe('***');
    });
  });

  describe('redactPHI', () => {
    it('should redact PHI fields', () => {
      const obj = {
        name: 'John Doe',
        ssn: '123-45-6789',
        diagnosis: 'Diabetes',
        publicField: 'Not sensitive',
      };

      const redacted = redactPHI(obj, ['ssn', 'diagnosis']);

      expect(redacted.name).toBe('John Doe');
      expect(redacted.publicField).toBe('Not sensitive');
      expect(redacted.ssn).toBe('[REDACTED]');
      expect(redacted.diagnosis).toBe('[REDACTED]');
    });

    it('should handle null and undefined fields', () => {
      const obj = {
        name: 'John Doe',
        ssn: null,
        diagnosis: undefined,
      };

      const redacted = redactPHI(obj, ['ssn', 'diagnosis']);

      expect(redacted.name).toBe('John Doe');
      expect(redacted.ssn).toBeNull();
      expect(redacted.diagnosis).toBeUndefined();
    });
  });

  describe('Security Tests', () => {
    it('should not expose encryption keys in output', () => {
      const plaintext = 'Sensitive data';
      const encrypted = encrypt(plaintext);

      expect(encrypted).not.toContain(process.env.ENCRYPTION_SECRET_KEY || '');
    });

    it('should use authentication tag (GCM mode)', () => {
      const plaintext = 'Sensitive data';
      const encrypted = encrypt(plaintext);
      const parsed = JSON.parse(encrypted!);

      expect(parsed.authTag).toBeDefined();
      expect(parsed.authTag).toHaveLength(32); // 16 bytes = 32 hex characters
    });

    it('should fail decryption with tampered authentication tag', () => {
      const plaintext = 'Sensitive data';
      const encrypted = encrypt(plaintext);
      const parsed = JSON.parse(encrypted!);

      // Tamper with auth tag
      parsed.authTag = 'a'.repeat(32);
      const tampered = JSON.stringify(parsed);

      expect(() => decrypt(tampered)).toThrow();
    });

    it('should use unique IV for each encryption', () => {
      const plaintext = 'Sensitive data';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      const parsed1 = JSON.parse(encrypted1!);
      const parsed2 = JSON.parse(encrypted2!);

      expect(parsed1.iv).not.toBe(parsed2.iv);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long strings', () => {
      const longText = 'A'.repeat(100000);
      const encrypted = encrypt(longText);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(longText);
    });

    it('should handle numeric strings', () => {
      const numeric = '1234567890';
      const encrypted = encrypt(numeric);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(numeric);
    });

    it('should handle whitespace', () => {
      const whitespace = '   \n\t\r   ';
      const encrypted = encrypt(whitespace);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(whitespace);
    });
  });
});
