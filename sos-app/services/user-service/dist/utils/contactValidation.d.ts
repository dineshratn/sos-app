import { CountryCode } from 'libphonenumber-js';
/**
 * Validate email address format
 */
export declare function validateEmail(email: string): boolean;
/**
 * Validate phone number format using libphonenumber-js
 * Supports international phone numbers
 */
export declare function validatePhoneNumber(phoneNumber: string, defaultCountry?: CountryCode): {
    isValid: boolean;
    formatted?: string;
    country?: string;
    type?: string;
    error?: string;
};
/**
 * Format phone number to E.164 format (+1234567890)
 */
export declare function formatPhoneNumber(phoneNumber: string, defaultCountry?: CountryCode): string;
/**
 * Sanitize and format email address
 */
export declare function sanitizeEmail(email: string): string;
/**
 * Validate contact information (phone and/or email)
 * At least one must be provided
 */
export declare function validateContactInfo(phoneNumber?: string, email?: string, defaultCountry?: CountryCode): {
    isValid: boolean;
    formattedPhone?: string;
    sanitizedEmail?: string;
    errors: string[];
};
/**
 * Check if phone number is mobile
 * This is important for SMS notifications
 */
export declare function isMobileNumber(phoneNumber: string, defaultCountry?: CountryCode): boolean;
declare const _default: {
    validateEmail: typeof validateEmail;
    validatePhoneNumber: typeof validatePhoneNumber;
    formatPhoneNumber: typeof formatPhoneNumber;
    sanitizeEmail: typeof sanitizeEmail;
    validateContactInfo: typeof validateContactInfo;
    isMobileNumber: typeof isMobileNumber;
};
export default _default;
//# sourceMappingURL=contactValidation.d.ts.map