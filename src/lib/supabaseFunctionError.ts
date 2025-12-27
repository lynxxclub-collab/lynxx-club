/**
 * Reusable helper functions for parsing Supabase edge function errors.
 * Extracts the actual error message from nested JSON bodies and provides
 * user-friendly error messages across the app.
 */

// Safe JSON parser that doesn't throw
function safeJsonParse(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// Type for Supabase function invoke error
interface FunctionInvokeError {
  message?: string;
  context?: {
    response?: {
      body?: string;
    };
    body?: string;
  };
}

// Type for the response from supabase.functions.invoke
interface FunctionInvokeResult<T = unknown> {
  data: T | null;
  error: FunctionInvokeError | null;
}

/**
 * Extracts a user-friendly error message from a Supabase function invoke error.
 * 
 * @param error - The error object from supabase.functions.invoke
 * @param fallbackMessage - Default message if no specific error found
 * @returns The extracted error message
 */
export function parseFunctionError(
  error: FunctionInvokeError | null | undefined,
  fallbackMessage = 'An unexpected error occurred'
): string {
  if (!error) return fallbackMessage;

  // Try to extract the JSON body from the error context
  const rawBody = error.context?.response?.body ?? error.context?.body;
  const parsed = safeJsonParse(rawBody);
  
  // Check for error field in parsed body
  if (parsed) {
    if (typeof parsed.error === 'string') return parsed.error;
    if (typeof parsed.message === 'string') return parsed.message;
  }

  // Fall back to the error's message, but filter out generic messages
  if (error.message && !error.message.includes('non-2xx status code')) {
    return error.message;
  }

  return fallbackMessage;
}

/**
 * Checks if the response data contains an error (some edge functions return 
 * success: false with an error message in the data)
 */
export function extractDataError(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  
  const d = data as Record<string, unknown>;
  
  // Check for error in data payload
  if ('error' in d && typeof d.error === 'string') {
    return d.error;
  }
  
  // Check for success: false pattern
  if ('success' in d && d.success === false && 'error' in d) {
    return typeof d.error === 'string' ? d.error : 'Operation failed';
  }
  
  return null;
}

/**
 * Combined helper that handles both error types:
 * 1. HTTP-level errors (error object from invoke)
 * 2. Application-level errors (success: false in data)
 * 
 * @returns Error message string if there's an error, null otherwise
 */
export function getFunctionErrorMessage<T>(
  result: FunctionInvokeResult<T>,
  fallbackMessage = 'An unexpected error occurred'
): string | null {
  // First check for HTTP-level error
  if (result.error) {
    return parseFunctionError(result.error, fallbackMessage);
  }
  
  // Then check for application-level error in data
  const dataError = extractDataError(result.data);
  if (dataError) {
    return dataError;
  }
  
  return null; // No error found
}
