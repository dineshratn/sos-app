import { parsePhoneNumber, isValidPhoneNumber, CountryCode } from 'libphonenumber-js';
import { AppError } from '../middleware/errorHandler';

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
export function validateEmail(email: string): boolean {
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
export function validatePhoneNumber(
  phoneNumber: string,
  defaultCountry: CountryCode = 'US'
): {
  isValid: boolean;
  formatted?: string;
  country?: string;
  type?: string;
  error?: string;
} {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return {
      isValid: false,
      error: 'Phone number is required',
    };
  }

  try {
    // Basic validation
    if (!isValidPhoneNumber(phoneNumber, defaultCountry)) {
      return {
        isValid: false,
        error: 'Invalid phone number format',
      };
    }

    // Parse phone number
    const parsed = parsePhoneNumber(phoneNumber, defaultCountry);

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
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Phone validation error',
    };
  }
}

/**
 * Format phone number to E.164 format (+1234567890)
 */
export function formatPhoneNumber(
  phoneNumber: string,
  defaultCountry: CountryCode = 'US'
): string {
  try {
    const parsed = parsePhoneNumber(phoneNumber, defaultCountry);
    if (!parsed) {
      throw new Error('Invalid phone number');
    }
    return parsed.format('E.164');
  } catch (error) {
    throw new AppError(
      `Invalid phone number format: ${error instanceof Error ? error.message : 'Unknown error'}`,
      400,
      'INVALID_PHONE_NUMBER'
    );
  }
}

/**
 * Sanitize and format email address
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    throw new AppError('Email is required', 400, 'EMAIL_REQUIRED');
  }

  // Trim and lowercase
  email = email.trim().toLowerCase();

  // Validate
  if (!validateEmail(email)) {
    throw new AppError('Invalid email format', 400, 'INVALID_EMAIL');
  }

  return email;
}

/**
 * Validate contact information (phone and/or email)
 * At least one must be provided
 */
export function validateContactInfo(
  phoneNumber?: string,
  email?: string,
  defaultCountry: CountryCode = 'US'
): {
  isValid: boolean;
  formattedPhone?: string;
  sanitizedEmail?: string;
  errors: string[];
} {
  const errors: string[] = [];
  let formattedPhone: string | undefined;
  let sanitizedEmail: string | undefined;

  // At least one contact method must be provided
  if (!phoneNumber && !email) {
    errors.push('At least one contact method (phone or email) is required');
  }

  // Validate phone if provided
  if (phoneNumber) {
    const phoneValidation = validatePhoneNumber(phoneNumber, defaultCountry);
    if (!phoneValidation.isValid) {
      errors.push(phoneValidation.error || 'Invalid phone number');
    } else {
      formattedPhone = phoneValidation.formatted;
    }
  }

  // Validate email if provided
  if (email) {
    try {
      sanitizedEmail = sanitizeEmail(email);
    } catch (error) {
      errors.push(error instanceof AppError ? error.message : 'Invalid email');
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
export function isMobileNumber(
  phoneNumber: string,
  defaultCountry: CountryCode = 'US'
): boolean {
  try {
    const parsed = parsePhoneNumber(phoneNumber, defaultCountry);
    if (!parsed) {
      return false;
    }
    const type = parsed.getType();
    return type === 'MOBILE' || type === 'FIXED_LINE_OR_MOBILE';
  } catch (error) {
    return false;
  }
}

export default {
  validateEmail,
  validatePhoneNumber,
  formatPhoneNumber,
  sanitizeEmail,
  validateContactInfo,
  isMobileNumber,
};
