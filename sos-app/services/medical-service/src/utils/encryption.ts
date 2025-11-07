import crypto from 'crypto';
import config from '../config';
import logger from './logger';
import { AppError } from '../middleware/errorHandler';

/**
 * Field-level encryption utility for HIPAA compliance
 * Uses AES-256-GCM encryption with authentication
 *
 * In production, use AWS KMS, Azure Key Vault, or HashiCorp Vault
 * for key management instead of environment variables
 */

export interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
  keyId: string;
}

/**
 * Encrypt sensitive data using AES-256-GCM
 * @param plaintext - The data to encrypt
 * @returns Encrypted data with IV and auth tag
 */
export function encrypt(plaintext: string | null | undefined): string | null {
  if (plaintext === null || plaintext === undefined || plaintext === '') {
    return null;
  }

  try {
    // Generate a random initialization vector
    const iv = crypto.randomBytes(config.encryption.ivLength);

    // Ensure the key is 32 bytes for AES-256
    const key = crypto
      .createHash('sha256')
      .update(config.encryption.secretKey)
      .digest();

    // Create cipher
    const cipher = crypto.createCipheriv(config.encryption.algorithm, key, iv);

    // Encrypt the data
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get the authentication tag
    const authTag = cipher.getAuthTag();

    // Combine all parts into a single string for storage
    const encryptedData: EncryptedData = {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      keyId: config.encryption.keyId,
    };

    return JSON.stringify(encryptedData);
  } catch (error) {
    logger.error('Encryption error:', error);
    throw new AppError('Failed to encrypt data', 500, 'ENCRYPTION_ERROR');
  }
}

/**
 * Decrypt sensitive data using AES-256-GCM
 * @param encryptedText - The encrypted data string
 * @returns Decrypted plaintext
 */
export function decrypt(encryptedText: string | null | undefined): string | null {
  if (encryptedText === null || encryptedText === undefined || encryptedText === '') {
    return null;
  }

  try {
    // Parse the encrypted data
    const encryptedData: EncryptedData = JSON.parse(encryptedText);

    // Ensure the key is 32 bytes for AES-256
    const key = crypto
      .createHash('sha256')
      .update(config.encryption.secretKey)
      .digest();

    // Convert hex strings back to buffers
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');

    // Create decipher
    const decipher = crypto.createDecipheriv(config.encryption.algorithm, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt the data
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    logger.error('Decryption error:', error);
    throw new AppError('Failed to decrypt data', 500, 'DECRYPTION_ERROR');
  }
}

/**
 * Encrypt an object's sensitive fields
 * @param obj - Object with sensitive fields
 * @param fields - Array of field names to encrypt
 * @returns Object with encrypted fields
 */
export function encryptObject<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const encrypted = { ...obj };

  for (const field of fields) {
    if (encrypted[field] !== null && encrypted[field] !== undefined) {
      encrypted[field] = encrypt(String(encrypted[field])) as any;
    }
  }

  return encrypted;
}

/**
 * Decrypt an object's sensitive fields
 * @param obj - Object with encrypted fields
 * @param fields - Array of field names to decrypt
 * @returns Object with decrypted fields
 */
export function decryptObject<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const decrypted = { ...obj };

  for (const field of fields) {
    if (decrypted[field] !== null && decrypted[field] !== undefined) {
      decrypted[field] = decrypt(String(decrypted[field])) as any;
    }
  }

  return decrypted;
}

/**
 * Generate a secure hash for sensitive data
 * Useful for searching encrypted data without decryption
 * @param data - Data to hash
 * @returns SHA-256 hash
 */
export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate a secure random token
 * @param length - Length of the token in bytes (default 32)
 * @returns Hex-encoded random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Verify encrypted data integrity
 * @param encryptedText - Encrypted data to verify
 * @returns true if data is valid, false otherwise
 */
export function verifyEncryptedData(encryptedText: string): boolean {
  try {
    const encryptedData: EncryptedData = JSON.parse(encryptedText);

    // Check all required fields are present
    if (
      !encryptedData.encrypted ||
      !encryptedData.iv ||
      !encryptedData.authTag ||
      !encryptedData.keyId
    ) {
      return false;
    }

    // Verify the key ID matches current configuration
    if (encryptedData.keyId !== config.encryption.keyId) {
      logger.warn('Encrypted data uses different key ID', {
        expected: config.encryption.keyId,
        actual: encryptedData.keyId,
      });
    }

    // Try to decrypt to verify integrity
    decrypt(encryptedText);
    return true;
  } catch (error) {
    logger.error('Invalid encrypted data:', error);
    return false;
  }
}

/**
 * Rotate encryption key for data
 * Used when migrating to a new encryption key
 * @param encryptedText - Data encrypted with old key
 * @param oldKey - Old encryption key
 * @returns Data encrypted with new key
 */
export function rotateEncryptionKey(
  encryptedText: string,
  oldKey: string
): string | null {
  try {
    // Temporarily use old key to decrypt
    const originalKey = config.encryption.secretKey;
    (config.encryption as any).secretKey = oldKey;

    const decrypted = decrypt(encryptedText);

    // Restore new key and re-encrypt
    (config.encryption as any).secretKey = originalKey;
    const reencrypted = encrypt(decrypted || '');

    logger.info('Successfully rotated encryption key');
    return reencrypted;
  } catch (error) {
    logger.error('Key rotation failed:', error);
    throw new AppError('Failed to rotate encryption key', 500, 'KEY_ROTATION_ERROR');
  }
}

/**
 * Mask sensitive data for logging (HIPAA compliance)
 * @param data - Sensitive data to mask
 * @param visibleChars - Number of characters to show (default 4)
 * @returns Masked string
 */
export function maskSensitiveData(
  data: string | null | undefined,
  visibleChars: number = 4
): string {
  if (!data || data.length === 0) {
    return '***';
  }

  if (data.length <= visibleChars) {
    return '*'.repeat(data.length);
  }

  const visible = data.substring(0, visibleChars);
  const masked = '*'.repeat(data.length - visibleChars);
  return `${visible}${masked}`;
}

/**
 * Redact PHI (Protected Health Information) from objects for logging
 * @param obj - Object that may contain PHI
 * @param phiFields - Fields that contain PHI
 * @returns Object with PHI fields redacted
 */
export function redactPHI<T extends Record<string, any>>(
  obj: T,
  phiFields: (keyof T)[]
): T {
  const redacted = { ...obj };

  for (const field of phiFields) {
    if (redacted[field] !== null && redacted[field] !== undefined) {
      redacted[field] = '[REDACTED]' as any;
    }
  }

  return redacted;
}

export default {
  encrypt,
  decrypt,
  encryptObject,
  decryptObject,
  hashData,
  generateSecureToken,
  verifyEncryptedData,
  rotateEncryptionKey,
  maskSensitiveData,
  redactPHI,
};
