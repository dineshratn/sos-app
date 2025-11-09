import { CountryCode } from 'libphonenumber-js';
/**
 * Validate phone number format
 * @param phoneNumber Phone number to validate
 * @param defaultCountry Default country code (e.g., 'US')
 * @returns Object with validation result
 */
export declare const validatePhoneNumber: (phoneNumber: string, defaultCountry?: CountryCode) => {
    isValid: boolean;
    formatted?: string;
    country?: string;
    type?: string;
    message?: string;
};
/**
 * Format phone number to E.164 format
 * @param phoneNumber Phone number to format
 * @param defaultCountry Default country code
 * @returns Formatted phone number or null
 */
export declare const formatPhoneNumber: (phoneNumber: string, defaultCountry?: CountryCode) => string | null;
/**
 * Check if two phone numbers are the same
 * @param phone1 First phone number
 * @param phone2 Second phone number
 * @returns True if numbers are the same
 */
export declare const arePhoneNumbersSame: (phone1: string, phone2: string) => boolean;
//# sourceMappingURL=phoneValidator.d.ts.map