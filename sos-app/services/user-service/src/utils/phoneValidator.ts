import { parsePhoneNumber, CountryCode, isValidPhoneNumber } from 'libphonenumber-js';

/**
 * Validate phone number format
 * @param phoneNumber Phone number to validate
 * @param defaultCountry Default country code (e.g., 'US')
 * @returns Object with validation result
 */
export const validatePhoneNumber = (
  phoneNumber: string,
  defaultCountry: CountryCode = 'US'
): {
  isValid: boolean;
  formatted?: string;
  country?: string;
  type?: string;
  message?: string;
} => {
  try {
    if (!phoneNumber || phoneNumber.trim().length === 0) {
      return {
        isValid: false,
        message: 'Phone number is required',
      };
    }

    // Check if phone number is valid
    if (!isValidPhoneNumber(phoneNumber, defaultCountry)) {
      return {
        isValid: false,
        message: 'Invalid phone number format',
      };
    }

    // Parse phone number
    const parsed = parsePhoneNumber(phoneNumber, defaultCountry);

    return {
      isValid: true,
      formatted: parsed.formatInternational(),
      country: parsed.country,
      type: parsed.getType(),
    };
  } catch (error) {
    return {
      isValid: false,
      message: 'Invalid phone number',
    };
  }
};

/**
 * Format phone number to E.164 format
 * @param phoneNumber Phone number to format
 * @param defaultCountry Default country code
 * @returns Formatted phone number or null
 */
export const formatPhoneNumber = (
  phoneNumber: string,
  defaultCountry: CountryCode = 'US'
): string | null => {
  try {
    const parsed = parsePhoneNumber(phoneNumber, defaultCountry);
    return parsed.format('E.164');
  } catch (error) {
    return null;
  }
};

/**
 * Check if two phone numbers are the same
 * @param phone1 First phone number
 * @param phone2 Second phone number
 * @returns True if numbers are the same
 */
export const arePhoneNumbersSame = (phone1: string, phone2: string): boolean => {
  const formatted1 = formatPhoneNumber(phone1);
  const formatted2 = formatPhoneNumber(phone2);

  if (!formatted1 || !formatted2) return false;

  return formatted1 === formatted2;
};
