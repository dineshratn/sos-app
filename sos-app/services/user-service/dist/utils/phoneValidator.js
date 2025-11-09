"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.arePhoneNumbersSame = exports.formatPhoneNumber = exports.validatePhoneNumber = void 0;
const libphonenumber_js_1 = require("libphonenumber-js");
/**
 * Validate phone number format
 * @param phoneNumber Phone number to validate
 * @param defaultCountry Default country code (e.g., 'US')
 * @returns Object with validation result
 */
const validatePhoneNumber = (phoneNumber, defaultCountry = 'US') => {
    try {
        if (!phoneNumber || phoneNumber.trim().length === 0) {
            return {
                isValid: false,
                message: 'Phone number is required',
            };
        }
        // Check if phone number is valid
        if (!(0, libphonenumber_js_1.isValidPhoneNumber)(phoneNumber, defaultCountry)) {
            return {
                isValid: false,
                message: 'Invalid phone number format',
            };
        }
        // Parse phone number
        const parsed = (0, libphonenumber_js_1.parsePhoneNumber)(phoneNumber, defaultCountry);
        return {
            isValid: true,
            formatted: parsed.formatInternational(),
            country: parsed.country,
            type: parsed.getType(),
        };
    }
    catch (error) {
        return {
            isValid: false,
            message: 'Invalid phone number',
        };
    }
};
exports.validatePhoneNumber = validatePhoneNumber;
/**
 * Format phone number to E.164 format
 * @param phoneNumber Phone number to format
 * @param defaultCountry Default country code
 * @returns Formatted phone number or null
 */
const formatPhoneNumber = (phoneNumber, defaultCountry = 'US') => {
    try {
        const parsed = (0, libphonenumber_js_1.parsePhoneNumber)(phoneNumber, defaultCountry);
        return parsed.format('E.164');
    }
    catch (error) {
        return null;
    }
};
exports.formatPhoneNumber = formatPhoneNumber;
/**
 * Check if two phone numbers are the same
 * @param phone1 First phone number
 * @param phone2 Second phone number
 * @returns True if numbers are the same
 */
const arePhoneNumbersSame = (phone1, phone2) => {
    const formatted1 = (0, exports.formatPhoneNumber)(phone1);
    const formatted2 = (0, exports.formatPhoneNumber)(phone2);
    if (!formatted1 || !formatted2)
        return false;
    return formatted1 === formatted2;
};
exports.arePhoneNumbersSame = arePhoneNumbersSame;
//# sourceMappingURL=phoneValidator.js.map