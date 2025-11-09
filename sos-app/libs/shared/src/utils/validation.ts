/**
 * Validation helper functions
 *
 * @packageDocumentation
 */

import type { Location } from '../types/common';

/**
 * Validation result
 */
export interface ValidationResult {
  /** Is valid */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
}

/**
 * Validate email address format
 *
 * @param email - Email address to validate
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = validateEmail('user@example.com');
 * if (result.valid) {
 *   console.log('Valid email');
 * }
 * ```
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true };
}

/**
 * Validate phone number in international format
 *
 * @param phone - Phone number to validate
 * @returns Validation result
 *
 * @example
 * ```typescript
 * validatePhone('+1234567890'); // Valid
 * validatePhone('1234567890');  // Invalid (missing +)
 * ```
 */
export function validatePhone(phone: string): ValidationResult {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Phone number is required' };
  }

  // E.164 format: +[country code][number] (max 15 digits)
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phone)) {
    return { valid: false, error: 'Invalid phone format. Use international format: +1234567890' };
  }

  return { valid: true };
}

/**
 * Validate UUID format (RFC 4122)
 *
 * @param uuid - UUID to validate
 * @returns Validation result
 */
export function validateUUID(uuid: string): ValidationResult {
  if (!uuid || typeof uuid !== 'string') {
    return { valid: false, error: 'UUID is required' };
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uuid)) {
    return { valid: false, error: 'Invalid UUID format' };
  }

  return { valid: true };
}

/**
 * Validate location coordinates
 *
 * @param location - Location object to validate
 * @returns Validation result
 *
 * @example
 * ```typescript
 * validateLocation({
 *   latitude: 37.7749,
 *   longitude: -122.4194,
 *   accuracy: 10
 * });
 * ```
 */
export function validateLocation(location: Partial<Location>): ValidationResult {
  if (!location) {
    return { valid: false, error: 'Location is required' };
  }

  const { latitude, longitude, accuracy } = location;

  if (typeof latitude !== 'number') {
    return { valid: false, error: 'Latitude is required and must be a number' };
  }

  if (latitude < -90 || latitude > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90' };
  }

  if (typeof longitude !== 'number') {
    return { valid: false, error: 'Longitude is required and must be a number' };
  }

  if (longitude < -180 || longitude > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180' };
  }

  if (typeof accuracy !== 'number') {
    return { valid: false, error: 'Accuracy is required and must be a number' };
  }

  if (accuracy < 0) {
    return { valid: false, error: 'Accuracy must be a positive number' };
  }

  // Optional fields
  if (location.altitude !== undefined && typeof location.altitude !== 'number') {
    return { valid: false, error: 'Altitude must be a number' };
  }

  if (location.speed !== undefined && (typeof location.speed !== 'number' || location.speed < 0)) {
    return { valid: false, error: 'Speed must be a positive number' };
  }

  if (location.heading !== undefined) {
    if (typeof location.heading !== 'number' || location.heading < 0 || location.heading > 360) {
      return { valid: false, error: 'Heading must be between 0 and 360' };
    }
  }

  return { valid: true };
}

/**
 * Validate password strength
 *
 * @param password - Password to validate
 * @param minLength - Minimum password length (default: 8)
 * @returns Validation result
 */
export function validatePassword(password: string, minLength = 8): ValidationResult {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < minLength) {
    return { valid: false, error: `Password must be at least ${minLength} characters long` };
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }

  // Check for at least one digit
  if (!/\d/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }

  // Check for at least one special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character' };
  }

  return { valid: true };
}

/**
 * Validate URL format
 *
 * @param url - URL to validate
 * @returns Validation result
 */
export function validateURL(url: string): ValidationResult {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  try {
    new URL(url);
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validate date string (ISO 8601 format)
 *
 * @param dateString - Date string to validate
 * @returns Validation result
 */
export function validateDateString(dateString: string): ValidationResult {
  if (!dateString || typeof dateString !== 'string') {
    return { valid: false, error: 'Date is required' };
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Invalid date format. Use ISO 8601 format' };
  }

  return { valid: true };
}

/**
 * Validate required string field
 *
 * @param value - Value to validate
 * @param fieldName - Field name for error message
 * @param minLength - Minimum length
 * @param maxLength - Maximum length
 * @returns Validation result
 */
export function validateRequiredString(
  value: string,
  fieldName: string,
  minLength = 1,
  maxLength = 255
): ValidationResult {
  if (!value || typeof value !== 'string') {
    return { valid: false, error: `${fieldName} is required` };
  }

  const trimmed = value.trim();
  if (trimmed.length < minLength) {
    return { valid: false, error: `${fieldName} must be at least ${minLength} characters` };
  }

  if (trimmed.length > maxLength) {
    return { valid: false, error: `${fieldName} must not exceed ${maxLength} characters` };
  }

  return { valid: true };
}

/**
 * Validate numeric range
 *
 * @param value - Value to validate
 * @param fieldName - Field name for error message
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Validation result
 */
export function validateNumericRange(
  value: number,
  fieldName: string,
  min: number,
  max: number
): ValidationResult {
  if (typeof value !== 'number' || isNaN(value)) {
    return { valid: false, error: `${fieldName} must be a number` };
  }

  if (value < min || value > max) {
    return { valid: false, error: `${fieldName} must be between ${min} and ${max}` };
  }

  return { valid: true };
}

/**
 * Sanitize string input (remove dangerous characters)
 *
 * @param input - Input string to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');

  // Remove script tags and content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Check if value is empty (null, undefined, empty string, empty array)
 *
 * @param value - Value to check
 * @returns True if empty
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === 'string') {
    return value.trim().length === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }

  return false;
}
