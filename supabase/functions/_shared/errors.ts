// Shared error handling utilities for edge functions
// Maps internal errors to safe, user-friendly messages

// Error categories for client responses
export type ErrorCategory = 
  | 'invalid_input'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'insufficient_credits'
  | 'already_processed'
  | 'rate_limited'
  | 'payment_failed'
  | 'server_error';

// Safe error messages for each category
const ERROR_MESSAGES: Record<ErrorCategory, string> = {
  invalid_input: 'The provided input is invalid',
  unauthorized: 'Authentication required',
  forbidden: 'You do not have permission to perform this action',
  not_found: 'The requested resource was not found',
  insufficient_credits: 'Insufficient credits for this operation',
  already_processed: 'This request has already been processed',
  rate_limited: 'Too many requests. Please try again later',
  payment_failed: 'Payment could not be processed',
  server_error: 'Unable to process request',
};

/**
 * Creates a safe error response that doesn't expose internal details.
 * Logs the full error server-side for debugging.
 */
export function createErrorResponse(
  error: unknown,
  category: ErrorCategory,
  corsHeaders: Record<string, string>,
  statusCode = 400
): Response {
  // Log full error details server-side only
  console.error(`[ERROR:${category}]`, error);
  
  // Return safe message to client
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: ERROR_MESSAGES[category],
      code: category
    }),
    { 
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Maps known error patterns to appropriate categories.
 * Use this when you want automatic categorization.
 */
export function categorizeError(error: unknown): ErrorCategory {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  
  if (message.includes('unauthorized') || message.includes('authentication')) {
    return 'unauthorized';
  }
  if (message.includes('forbidden') || message.includes('permission')) {
    return 'forbidden';
  }
  if (message.includes('not found')) {
    return 'not_found';
  }
  if (message.includes('insufficient') || message.includes('credits')) {
    return 'insufficient_credits';
  }
  if (message.includes('already') || message.includes('processed')) {
    return 'already_processed';
  }
  if (message.includes('uuid') || message.includes('invalid') || message.includes('required')) {
    return 'invalid_input';
  }
  if (message.includes('payment') || message.includes('stripe')) {
    return 'payment_failed';
  }
  
  return 'server_error';
}

/**
 * Creates an auto-categorized error response
 */
export function createAutoErrorResponse(
  error: unknown,
  corsHeaders: Record<string, string>
): Response {
  const category = categorizeError(error);
  const statusCode = category === 'unauthorized' ? 401 
    : category === 'forbidden' ? 403 
    : category === 'not_found' ? 404 
    : category === 'server_error' ? 500 
    : 400;
    
  return createErrorResponse(error, category, corsHeaders, statusCode);
}
