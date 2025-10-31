/**
 * Date and time utility functions
 *
 * @packageDocumentation
 */

import type { Timestamp, Duration } from '../types/common';

/**
 * Get current timestamp in ISO 8601 format
 *
 * @returns Current timestamp
 */
export function now(): Timestamp {
  return new Date().toISOString();
}

/**
 * Format date to ISO 8601 string
 *
 * @param date - Date to format
 * @returns ISO 8601 formatted string
 */
export function toISOString(date: Date): Timestamp {
  return date.toISOString();
}

/**
 * Parse ISO 8601 string to Date
 *
 * @param timestamp - ISO 8601 timestamp
 * @returns Date object
 */
export function parseTimestamp(timestamp: Timestamp): Date {
  return new Date(timestamp);
}

/**
 * Check if timestamp is valid
 *
 * @param timestamp - Timestamp to validate
 * @returns True if valid
 */
export function isValidTimestamp(timestamp: Timestamp): boolean {
  const date = new Date(timestamp);
  return !isNaN(date.getTime());
}

/**
 * Add duration to a date
 *
 * @param date - Base date
 * @param duration - Duration to add
 * @returns New date with duration added
 */
export function addDuration(date: Date, duration: Duration): Date {
  const result = new Date(date);
  let milliseconds = 0;

  if (duration.milliseconds) milliseconds += duration.milliseconds;
  if (duration.seconds) milliseconds += duration.seconds * 1000;
  if (duration.minutes) milliseconds += duration.minutes * 60 * 1000;
  if (duration.hours) milliseconds += duration.hours * 60 * 60 * 1000;
  if (duration.days) milliseconds += duration.days * 24 * 60 * 60 * 1000;

  result.setTime(result.getTime() + milliseconds);
  return result;
}

/**
 * Subtract duration from a date
 *
 * @param date - Base date
 * @param duration - Duration to subtract
 * @returns New date with duration subtracted
 */
export function subtractDuration(date: Date, duration: Duration): Date {
  const result = new Date(date);
  let milliseconds = 0;

  if (duration.milliseconds) milliseconds += duration.milliseconds;
  if (duration.seconds) milliseconds += duration.seconds * 1000;
  if (duration.minutes) milliseconds += duration.minutes * 60 * 1000;
  if (duration.hours) milliseconds += duration.hours * 60 * 60 * 1000;
  if (duration.days) milliseconds += duration.days * 24 * 60 * 60 * 1000;

  result.setTime(result.getTime() - milliseconds);
  return result;
}

/**
 * Calculate duration between two dates
 *
 * @param start - Start date
 * @param end - End date
 * @returns Duration object
 */
export function getDuration(start: Date, end: Date): Duration {
  const milliseconds = end.getTime() - start.getTime();

  return {
    milliseconds,
    seconds: Math.floor(milliseconds / 1000),
    minutes: Math.floor(milliseconds / (1000 * 60)),
    hours: Math.floor(milliseconds / (1000 * 60 * 60)),
    days: Math.floor(milliseconds / (1000 * 60 * 60 * 24)),
  };
}

/**
 * Format duration as human-readable string
 *
 * @param duration - Duration to format
 * @returns Formatted string (e.g., "2 hours 30 minutes")
 */
export function formatDuration(duration: Duration): string {
  const parts: string[] = [];

  if (duration.days && duration.days > 0) {
    parts.push(`${duration.days} day${duration.days !== 1 ? 's' : ''}`);
  }

  const hours = duration.hours ? duration.hours % 24 : 0;
  if (hours > 0) {
    parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  }

  const minutes = duration.minutes ? duration.minutes % 60 : 0;
  if (minutes > 0) {
    parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  }

  const seconds = duration.seconds ? duration.seconds % 60 : 0;
  if (parts.length === 0 && seconds > 0) {
    parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
  }

  return parts.join(' ') || '0 seconds';
}

/**
 * Check if date is in the past
 *
 * @param date - Date to check
 * @returns True if date is in the past
 */
export function isPast(date: Date): boolean {
  return date.getTime() < Date.now();
}

/**
 * Check if date is in the future
 *
 * @param date - Date to check
 * @returns True if date is in the future
 */
export function isFuture(date: Date): boolean {
  return date.getTime() > Date.now();
}

/**
 * Check if date is today
 *
 * @param date - Date to check
 * @returns True if date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Get start of day
 *
 * @param date - Date
 * @returns Start of day (00:00:00.000)
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get end of day
 *
 * @param date - Date
 * @returns End of day (23:59:59.999)
 */
export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Format date for display (locale-aware)
 *
 * @param date - Date to format
 * @param locale - Locale string (default: 'en-US')
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDate(
  date: Date,
  locale = 'en-US',
  options?: Intl.DateTimeFormatOptions
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  return date.toLocaleDateString(locale, options || defaultOptions);
}

/**
 * Format time for display (locale-aware)
 *
 * @param date - Date to format
 * @param locale - Locale string (default: 'en-US')
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted time string
 */
export function formatTime(
  date: Date,
  locale = 'en-US',
  options?: Intl.DateTimeFormatOptions
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  };

  return date.toLocaleTimeString(locale, options || defaultOptions);
}

/**
 * Format datetime for display (locale-aware)
 *
 * @param date - Date to format
 * @param locale - Locale string (default: 'en-US')
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted datetime string
 */
export function formatDateTime(
  date: Date,
  locale = 'en-US',
  options?: Intl.DateTimeFormatOptions
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };

  return date.toLocaleString(locale, options || defaultOptions);
}

/**
 * Get relative time string (e.g., "2 hours ago", "in 5 minutes")
 *
 * @param date - Date to compare
 * @param baseDate - Base date (default: now)
 * @returns Relative time string
 */
export function getRelativeTime(date: Date, baseDate: Date = new Date()): string {
  const duration = getDuration(date, baseDate);
  const milliseconds = duration.milliseconds ?? 0;

  const isPastTime = milliseconds < 0;
  const absMilliseconds = Math.abs(milliseconds);

  const seconds = Math.floor(absMilliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  let value: number;
  let unit: string;

  if (years > 0) {
    value = years;
    unit = 'year';
  } else if (months > 0) {
    value = months;
    unit = 'month';
  } else if (days > 0) {
    value = days;
    unit = 'day';
  } else if (hours > 0) {
    value = hours;
    unit = 'hour';
  } else if (minutes > 0) {
    value = minutes;
    unit = 'minute';
  } else {
    value = seconds;
    unit = 'second';
  }

  const plural = value !== 1 ? 's' : '';
  const timeString = `${value} ${unit}${plural}`;

  return isPastTime ? `${timeString} ago` : `in ${timeString}`;
}

/**
 * Sleep for specified duration
 *
 * @param milliseconds - Duration to sleep in milliseconds
 * @returns Promise that resolves after duration
 */
export function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Create timeout promise
 *
 * @param milliseconds - Timeout duration
 * @param message - Error message
 * @returns Promise that rejects after timeout
 */
export function timeout(milliseconds: number, message = 'Operation timed out'): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), milliseconds);
  });
}

/**
 * Race promise with timeout
 *
 * @param promise - Promise to race
 * @param milliseconds - Timeout duration
 * @param message - Timeout error message
 * @returns Promise result or timeout error
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  milliseconds: number,
  message?: string
): Promise<T> {
  return Promise.race([promise, timeout(milliseconds, message)]);
}
