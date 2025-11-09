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
export declare function encrypt(plaintext: string | null | undefined): string | null;
/**
 * Decrypt sensitive data using AES-256-GCM
 * @param encryptedText - The encrypted data string
 * @returns Decrypted plaintext
 */
export declare function decrypt(encryptedText: string | null | undefined): string | null;
/**
 * Encrypt an object's sensitive fields
 * @param obj - Object with sensitive fields
 * @param fields - Array of field names to encrypt
 * @returns Object with encrypted fields
 */
export declare function encryptObject<T extends Record<string, any>>(obj: T, fields: (keyof T)[]): T;
/**
 * Decrypt an object's sensitive fields
 * @param obj - Object with encrypted fields
 * @param fields - Array of field names to decrypt
 * @returns Object with decrypted fields
 */
export declare function decryptObject<T extends Record<string, any>>(obj: T, fields: (keyof T)[]): T;
/**
 * Generate a secure hash for sensitive data
 * Useful for searching encrypted data without decryption
 * @param data - Data to hash
 * @returns SHA-256 hash
 */
export declare function hashData(data: string): string;
/**
 * Generate a secure random token
 * @param length - Length of the token in bytes (default 32)
 * @returns Hex-encoded random token
 */
export declare function generateSecureToken(length?: number): string;
/**
 * Verify encrypted data integrity
 * @param encryptedText - Encrypted data to verify
 * @returns true if data is valid, false otherwise
 */
export declare function verifyEncryptedData(encryptedText: string): boolean;
/**
 * Rotate encryption key for data
 * Used when migrating to a new encryption key
 * @param encryptedText - Data encrypted with old key
 * @param oldKey - Old encryption key
 * @returns Data encrypted with new key
 */
export declare function rotateEncryptionKey(encryptedText: string, oldKey: string): string | null;
/**
 * Mask sensitive data for logging (HIPAA compliance)
 * @param data - Sensitive data to mask
 * @param visibleChars - Number of characters to show (default 4)
 * @returns Masked string
 */
export declare function maskSensitiveData(data: string | null | undefined, visibleChars?: number): string;
/**
 * Redact PHI (Protected Health Information) from objects for logging
 * @param obj - Object that may contain PHI
 * @param phiFields - Fields that contain PHI
 * @returns Object with PHI fields redacted
 */
export declare function redactPHI<T extends Record<string, any>>(obj: T, phiFields: (keyof T)[]): T;
declare const _default: {
    encrypt: typeof encrypt;
    decrypt: typeof decrypt;
    encryptObject: typeof encryptObject;
    decryptObject: typeof decryptObject;
    hashData: typeof hashData;
    generateSecureToken: typeof generateSecureToken;
    verifyEncryptedData: typeof verifyEncryptedData;
    rotateEncryptionKey: typeof rotateEncryptionKey;
    maskSensitiveData: typeof maskSensitiveData;
    redactPHI: typeof redactPHI;
};
export default _default;
//# sourceMappingURL=encryption.d.ts.map