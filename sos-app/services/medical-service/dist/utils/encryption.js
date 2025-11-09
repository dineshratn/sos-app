"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.encryptObject = encryptObject;
exports.decryptObject = decryptObject;
exports.hashData = hashData;
exports.generateSecureToken = generateSecureToken;
exports.verifyEncryptedData = verifyEncryptedData;
exports.rotateEncryptionKey = rotateEncryptionKey;
exports.maskSensitiveData = maskSensitiveData;
exports.redactPHI = redactPHI;
const crypto_1 = __importDefault(require("crypto"));
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("./logger"));
const errorHandler_1 = require("../middleware/errorHandler");
/**
 * Encrypt sensitive data using AES-256-GCM
 * @param plaintext - The data to encrypt
 * @returns Encrypted data with IV and auth tag
 */
function encrypt(plaintext) {
    if (plaintext === null || plaintext === undefined || plaintext === '') {
        return null;
    }
    try {
        // Generate a random initialization vector
        const iv = crypto_1.default.randomBytes(config_1.default.encryption.ivLength);
        // Ensure the key is 32 bytes for AES-256
        const key = crypto_1.default
            .createHash('sha256')
            .update(config_1.default.encryption.secretKey)
            .digest();
        // Create cipher
        const cipher = crypto_1.default.createCipheriv(config_1.default.encryption.algorithm, key, iv);
        // Encrypt the data
        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        // Get the authentication tag (CipherGCM method)
        const authTag = cipher.getAuthTag();
        // Combine all parts into a single string for storage
        const encryptedData = {
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex'),
            keyId: config_1.default.encryption.keyId,
        };
        return JSON.stringify(encryptedData);
    }
    catch (error) {
        logger_1.default.error('Encryption error:', error);
        throw new errorHandler_1.AppError('Failed to encrypt data', 500, 'ENCRYPTION_ERROR');
    }
}
/**
 * Decrypt sensitive data using AES-256-GCM
 * @param encryptedText - The encrypted data string
 * @returns Decrypted plaintext
 */
function decrypt(encryptedText) {
    if (encryptedText === null || encryptedText === undefined || encryptedText === '') {
        return null;
    }
    try {
        // Parse the encrypted data
        const encryptedData = JSON.parse(encryptedText);
        // Ensure the key is 32 bytes for AES-256
        const key = crypto_1.default
            .createHash('sha256')
            .update(config_1.default.encryption.secretKey)
            .digest();
        // Convert hex strings back to buffers
        const iv = Buffer.from(encryptedData.iv, 'hex');
        const authTag = Buffer.from(encryptedData.authTag, 'hex');
        // Create decipher
        const decipher = crypto_1.default.createDecipheriv(config_1.default.encryption.algorithm, key, iv);
        decipher.setAuthTag(authTag);
        // Decrypt the data
        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    catch (error) {
        logger_1.default.error('Decryption error:', error);
        throw new errorHandler_1.AppError('Failed to decrypt data', 500, 'DECRYPTION_ERROR');
    }
}
/**
 * Encrypt an object's sensitive fields
 * @param obj - Object with sensitive fields
 * @param fields - Array of field names to encrypt
 * @returns Object with encrypted fields
 */
function encryptObject(obj, fields) {
    const encrypted = { ...obj };
    for (const field of fields) {
        if (encrypted[field] !== null && encrypted[field] !== undefined) {
            encrypted[field] = encrypt(String(encrypted[field]));
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
function decryptObject(obj, fields) {
    const decrypted = { ...obj };
    for (const field of fields) {
        if (decrypted[field] !== null && decrypted[field] !== undefined) {
            decrypted[field] = decrypt(String(decrypted[field]));
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
function hashData(data) {
    return crypto_1.default.createHash('sha256').update(data).digest('hex');
}
/**
 * Generate a secure random token
 * @param length - Length of the token in bytes (default 32)
 * @returns Hex-encoded random token
 */
function generateSecureToken(length = 32) {
    return crypto_1.default.randomBytes(length).toString('hex');
}
/**
 * Verify encrypted data integrity
 * @param encryptedText - Encrypted data to verify
 * @returns true if data is valid, false otherwise
 */
function verifyEncryptedData(encryptedText) {
    try {
        const encryptedData = JSON.parse(encryptedText);
        // Check all required fields are present
        if (!encryptedData.encrypted ||
            !encryptedData.iv ||
            !encryptedData.authTag ||
            !encryptedData.keyId) {
            return false;
        }
        // Verify the key ID matches current configuration
        if (encryptedData.keyId !== config_1.default.encryption.keyId) {
            logger_1.default.warn('Encrypted data uses different key ID', {
                expected: config_1.default.encryption.keyId,
                actual: encryptedData.keyId,
            });
        }
        // Try to decrypt to verify integrity
        decrypt(encryptedText);
        return true;
    }
    catch (error) {
        logger_1.default.error('Invalid encrypted data:', error);
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
function rotateEncryptionKey(encryptedText, oldKey) {
    try {
        // Temporarily use old key to decrypt
        const originalKey = config_1.default.encryption.secretKey;
        config_1.default.encryption.secretKey = oldKey;
        const decrypted = decrypt(encryptedText);
        // Restore new key and re-encrypt
        config_1.default.encryption.secretKey = originalKey;
        const reencrypted = encrypt(decrypted || '');
        logger_1.default.info('Successfully rotated encryption key');
        return reencrypted;
    }
    catch (error) {
        logger_1.default.error('Key rotation failed:', error);
        throw new errorHandler_1.AppError('Failed to rotate encryption key', 500, 'KEY_ROTATION_ERROR');
    }
}
/**
 * Mask sensitive data for logging (HIPAA compliance)
 * @param data - Sensitive data to mask
 * @param visibleChars - Number of characters to show (default 4)
 * @returns Masked string
 */
function maskSensitiveData(data, visibleChars = 4) {
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
function redactPHI(obj, phiFields) {
    const redacted = { ...obj };
    for (const field of phiFields) {
        if (redacted[field] !== null && redacted[field] !== undefined) {
            redacted[field] = '[REDACTED]';
        }
    }
    return redacted;
}
exports.default = {
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
//# sourceMappingURL=encryption.js.map