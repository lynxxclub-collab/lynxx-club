/**
 * Input sanitization utilities for safe database queries
 */

// UUID regex pattern for validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates that a string is a valid UUID format
 */
export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Sanitizes a search string for use in ILIKE queries
 * Escapes special SQL characters that could cause injection
 */
export function sanitizeSearchTerm(term: string): string {
  if (!term) return '';
  
  // Remove or escape special SQL pattern characters
  // % and _ are wildcards in LIKE/ILIKE, escape them
  // Also remove potential SQL injection characters
  return term
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/%/g, '\\%')    // Escape percent signs
    .replace(/_/g, '\\_')    // Escape underscores
    .trim()
    .slice(0, 100);          // Limit length to prevent abuse
}

/**
 * Builds a safe ILIKE filter string for Supabase .or() queries
 * Uses sanitized input to prevent SQL injection
 */
export function buildSearchFilter(searchTerm: string, fields: string[]): string {
  const sanitized = sanitizeSearchTerm(searchTerm);
  if (!sanitized) return '';
  
  return fields
    .map(field => `${field}.ilike.%${sanitized}%`)
    .join(',');
}

/**
 * Validates and returns a UUID, or null if invalid
 */
export function validateUUID(value: string): string | null {
  return isValidUUID(value) ? value : null;
}
