/**
 * String manipulation utility functions
 *
 * @packageDocumentation
 */

/**
 * Capitalize first letter of string
 *
 * @param str - String to capitalize
 * @returns Capitalized string
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Capitalize first letter of each word
 *
 * @param str - String to capitalize
 * @returns Title-cased string
 */
export function titleCase(str: string): string {
  if (!str) return '';
  return str
    .split(' ')
    .map((word) => capitalize(word))
    .join(' ');
}

/**
 * Convert string to camelCase
 *
 * @param str - String to convert
 * @returns camelCase string
 */
export function toCamelCase(str: string): string {
  if (!str) return '';
  return str
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
    .replace(/^(.)/, (char) => char.toLowerCase());
}

/**
 * Convert string to PascalCase
 *
 * @param str - String to convert
 * @returns PascalCase string
 */
export function toPascalCase(str: string): string {
  if (!str) return '';
  const camel = toCamelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

/**
 * Convert string to snake_case
 *
 * @param str - String to convert
 * @returns snake_case string
 */
export function toSnakeCase(str: string): string {
  if (!str) return '';
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/[-\s]+/g, '_');
}

/**
 * Convert string to kebab-case
 *
 * @param str - String to convert
 * @returns kebab-case string
 */
export function toKebabCase(str: string): string {
  if (!str) return '';
  return str
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '')
    .replace(/[_\s]+/g, '-');
}

/**
 * Truncate string to specified length
 *
 * @param str - String to truncate
 * @param maxLength - Maximum length
 * @param suffix - Suffix to add (default: '...')
 * @returns Truncated string
 */
export function truncate(str: string, maxLength: number, suffix = '...'): string {
  if (!str || str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Remove extra whitespace from string
 *
 * @param str - String to clean
 * @returns Cleaned string
 */
export function removeExtraWhitespace(str: string): string {
  if (!str) return '';
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Mask sensitive string (e.g., email, phone)
 *
 * @param str - String to mask
 * @param visibleStart - Number of visible characters at start
 * @param visibleEnd - Number of visible characters at end
 * @param maskChar - Character to use for masking
 * @returns Masked string
 */
export function maskString(
  str: string,
  visibleStart = 2,
  visibleEnd = 2,
  maskChar = '*'
): string {
  if (!str || str.length <= visibleStart + visibleEnd) return str;

  const start = str.slice(0, visibleStart);
  const end = str.slice(-visibleEnd);
  const maskLength = str.length - visibleStart - visibleEnd;

  return start + maskChar.repeat(maskLength) + end;
}

/**
 * Mask email address
 *
 * @param email - Email to mask
 * @returns Masked email (e.g., "j***n@example.com")
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;

  const parts = email.split('@');
  if (parts.length !== 2) return email;

  const [localPart, domain] = parts as [string, string];
  const maskedLocal = maskString(localPart, 1, 1);

  return `${maskedLocal}@${domain}`;
}

/**
 * Mask phone number
 *
 * @param phone - Phone number to mask
 * @returns Masked phone (e.g., "+1***567890")
 */
export function maskPhone(phone: string): string {
  if (!phone) return '';
  return maskString(phone, 2, 4);
}

/**
 * Generate random string
 *
 * @param length - Length of string
 * @param charset - Character set to use
 * @returns Random string
 */
export function randomString(
  length: number,
  charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

/**
 * Generate URL-safe random string
 *
 * @param length - Length of string
 * @returns URL-safe random string
 */
export function randomUrlSafeString(length: number): string {
  return randomString(length, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_');
}

/**
 * Slugify string (make URL-friendly)
 *
 * @param str - String to slugify
 * @returns Slugified string
 */
export function slugify(str: string): string {
  if (!str) return '';

  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Escape HTML special characters
 *
 * @param str - String to escape
 * @returns Escaped string
 */
export function escapeHtml(str: string): string {
  if (!str) return '';

  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  return str.replace(/[&<>"']/g, (char) => htmlEscapes[char] ?? char);
}

/**
 * Unescape HTML entities
 *
 * @param str - String to unescape
 * @returns Unescaped string
 */
export function unescapeHtml(str: string): string {
  if (!str) return '';

  const htmlUnescapes: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
  };

  return str.replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => htmlUnescapes[entity] ?? entity);
}

/**
 * Extract initials from name
 *
 * @param name - Full name
 * @param maxInitials - Maximum number of initials
 * @returns Initials (e.g., "John Doe" -> "JD")
 */
export function getInitials(name: string, maxInitials = 2): string {
  if (!name) return '';

  const words = name.trim().split(/\s+/);
  const initials = words
    .slice(0, maxInitials)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');

  return initials;
}

/**
 * Parse query string to object
 *
 * @param queryString - Query string (with or without leading '?')
 * @returns Parsed object
 */
export function parseQueryString(queryString: string): Record<string, string> {
  if (!queryString) return {};

  const cleaned = queryString.startsWith('?') ? queryString.slice(1) : queryString;
  const params = new URLSearchParams(cleaned);
  const result: Record<string, string> = {};

  params.forEach((value, key) => {
    result[key] = value;
  });

  return result;
}

/**
 * Convert object to query string
 *
 * @param obj - Object to convert
 * @returns Query string
 */
export function toQueryString(obj: Record<string, unknown>): string {
  const params = new URLSearchParams();

  Object.entries(obj).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      params.append(key, String(value));
    }
  });

  return params.toString();
}

/**
 * Check if string is valid JSON
 *
 * @param str - String to check
 * @returns True if valid JSON
 */
export function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safe JSON parse with default value
 *
 * @param str - String to parse
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed object or default value
 */
export function safeJsonParse<T>(str: string, defaultValue: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Format number with thousands separator
 *
 * @param num - Number to format
 * @param separator - Separator character (default: ',')
 * @returns Formatted string
 */
export function formatNumber(num: number, separator = ','): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

/**
 * Format bytes to human-readable string
 *
 * @param bytes - Number of bytes
 * @param decimals - Number of decimal places
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Generate excerpt from text
 *
 * @param text - Text to excerpt
 * @param maxLength - Maximum length
 * @param suffix - Suffix to add
 * @returns Excerpt
 */
export function excerpt(text: string, maxLength = 100, suffix = '...'): string {
  if (!text || text.length <= maxLength) return text;

  // Try to break at word boundary
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > 0) {
    return truncated.slice(0, lastSpace) + suffix;
  }

  return truncated + suffix;
}
