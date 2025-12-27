// Shared input validation utilities for edge functions

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Message content limits
export const MESSAGE_MAX_LENGTH = 5000;
export const MESSAGE_MIN_LENGTH = 1;

// Bio/text field limits
export const BIO_MAX_LENGTH = 2000;
export const NAME_MAX_LENGTH = 100;

export function isValidUUID(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

export function isValidAmount(value: unknown, min = 0, max = 100000): value is number {
  return typeof value === 'number' && 
         !isNaN(value) && 
         isFinite(value) && 
         value >= min && 
         value <= max;
}

export function isValidISODate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

export function isValidPackageId(value: unknown, validPackages: string[]): value is string {
  return typeof value === 'string' && validPackages.includes(value);
}

export function isValidString(value: unknown, minLength = 1, maxLength = 10000): value is string {
  return typeof value === 'string' && 
         value.length >= minLength && 
         value.length <= maxLength;
}

/**
 * Validates message content with length limits
 */
export function isValidMessageContent(value: unknown): value is string {
  return typeof value === 'string' && 
         value.trim().length >= MESSAGE_MIN_LENGTH && 
         value.length <= MESSAGE_MAX_LENGTH;
}

// Validation error helper
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateRequired(value: unknown, fieldName: string): void {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${fieldName} is required`);
  }
}

export function validateUUID(value: unknown, fieldName: string): string {
  validateRequired(value, fieldName);
  if (!isValidUUID(value)) {
    throw new ValidationError(`${fieldName} must be a valid UUID`);
  }
  return value;
}

export function validateAmount(value: unknown, fieldName: string, min = 0, max = 100000): number {
  validateRequired(value, fieldName);
  if (!isValidAmount(value, min, max)) {
    throw new ValidationError(`${fieldName} must be a number between ${min} and ${max}`);
  }
  return value;
}

export function validateISODate(value: unknown, fieldName: string): string {
  if (value === undefined || value === null) return '';
  if (!isValidISODate(value)) {
    throw new ValidationError(`${fieldName} must be a valid ISO date`);
  }
  return value;
}

export function validatePackageId(value: unknown, fieldName: string, validPackages: string[]): string {
  validateRequired(value, fieldName);
  if (!isValidPackageId(value, validPackages)) {
    throw new ValidationError(`${fieldName} must be one of: ${validPackages.join(', ')}`);
  }
  return value;
}

/**
 * Validates message content with length enforcement
 */
export function validateMessageContent(value: unknown, fieldName: string): string {
  validateRequired(value, fieldName);
  if (!isValidMessageContent(value)) {
    throw new ValidationError(`${fieldName} must be between ${MESSAGE_MIN_LENGTH} and ${MESSAGE_MAX_LENGTH} characters`);
  }
  return (value as string).trim();
}
