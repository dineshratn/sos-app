"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEmail = validateEmail;
exports.validatePhoneNumber = validatePhoneNumber;
exports.formatPhoneNumber = formatPhoneNumber;
exports.sanitizeEmail = sanitizeEmail;
exports.validateContactInfo = validateContactInfo;
exports.isMobileNumber = isMobileNumber;
const libphonenumber_js_1 = require("libphonenumber-js");
const errorHandler_1 = require("../middleware/errorHandler");
/**
 * Contact Validation Utility
 *
 * Validates phone numbers and email addresses for emergency contacts
 */
/**
 * Email validation regex (RFC 5322 simplified)
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
/**
 * Validate email address format
 */
function validateEmail(email) {
    if (!email || typeof email !== 'string') {
        return false;
    }
    // Trim and lowercase
    email = email.trim().toLowerCase();
    // Check length
    if (email.length > 254) {
        return false;
    }
    // Test against regex
    return EMAIL_REGEX.test(email);
}
/**
 * Validate phone number format using libphonenumber-js
 * Supports international phone numbers
 */
function validatePhoneNumber(phoneNumber, defaultCountry = 'US') {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
        return {
            isValid: false,
            error: 'Phone number is required',
        };
    }
    try {
        // Basic validation
        if (!(0, libphonenumber_js_1.isValidPhoneNumber)(phoneNumber, defaultCountry)) {
            return {
                isValid: false,
                error: 'Invalid phone number format',
            };
        }
        // Parse phone number
        const parsed = (0, libphonenumber_js_1.parsePhoneNumber)(phoneNumber, defaultCountry);
        if (!parsed) {
            return {
                isValid: false,
                error: 'Could not parse phone number',
            };
        }
        // Return parsed information
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
            error: error instanceof Error ? error.message : 'Phone validation error',
        };
    }
}
/**
 * Format phone number to E.164 format (+1234567890)
 */
function formatPhoneNumber(phoneNumber, defaultCountry = 'US') {
    try {
        const parsed = (0, libphonenumber_js_1.parsePhoneNumber)(phoneNumber, defaultCountry);
        if (!parsed) {
            throw new Error('Invalid phone number');
        }
        return parsed.format('E.164');
    }
    catch (error) {
        throw new errorHandler_1.AppError(`Invalid phone number format: ${error instanceof Error ? error.message : 'Unknown error'}`, 400, 'INVALID_PHONE_NUMBER');
    }
}
/**
 * Sanitize and format email address
 */
function sanitizeEmail(email) {
    if (!email || typeof email !== 'string') {
        throw new errorHandler_1.AppError('Email is required', 400, 'EMAIL_REQUIRED');
    }
    // Trim and lowercase
    email = email.trim().toLowerCase();
    // Validate
    if (!validateEmail(email)) {
        throw new errorHandler_1.AppError('Invalid email format', 400, 'INVALID_EMAIL');
    }
    return email;
}
/**
 * Validate contact information (phone and/or email)
 * At least one must be provided
 */
function validateContactInfo(phoneNumber, email, defaultCountry = 'US') {
    const errors = [];
    let formattedPhone;
    let sanitizedEmail;
    // At least one contact method must be provided
    if (!phoneNumber && !email) {
        errors.push('At least one contact method (phone or email) is required');
    }
    // Validate phone if provided
    if (phoneNumber) {
        const phoneValidation = validatePhoneNumber(phoneNumber, defaultCountry);
        if (!phoneValidation.isValid) {
            errors.push(phoneValidation.error || 'Invalid phone number');
        }
        else {
            formattedPhone = phoneValidation.formatted;
        }
    }
    // Validate email if provided
    if (email) {
        try {
            sanitizedEmail = sanitizeEmail(email);
        }
        catch (error) {
            errors.push(error instanceof errorHandler_1.AppError ? error.message : 'Invalid email');
        }
    }
    return {
        isValid: errors.length === 0,
        formattedPhone,
        sanitizedEmail,
        errors,
    };
}
/**
 * Check if phone number is mobile
 * This is important for SMS notifications
 */
function isMobileNumber(phoneNumber, defaultCountry = 'US') {
    try {
        const parsed = (0, libphonenumber_js_1.parsePhoneNumber)(phoneNumber, defaultCountry);
        if (!parsed) {
            return false;
        }
        const type = parsed.getType();
        return type === 'MOBILE' || type === 'FIXED_LINE_OR_MOBILE';
    }
    catch (error) {
        return false;
    }
}
exports.default = {
    validateEmail,
    validatePhoneNumber,
    formatPhoneNumber,
    sanitizeEmail,
    validateContactInfo,
    isMobileNumber,
};
//# sourceMappingURL=contactValidation.js.map