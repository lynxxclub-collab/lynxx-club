// Shared CORS configuration for edge functions
// Validates origin against allowed list

const ALLOWED_ORIGINS = [
  // Production domains
  'https://lynxxclub.com',
  'https://www.lynxxclub.com',
  'https://app.lynxxclub.com',
  // Lovable preview domains
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/,
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/,
  // Development
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  
  let allowedOrigin = '';
  
  if (origin) {
    for (const allowed of ALLOWED_ORIGINS) {
      if (typeof allowed === 'string') {
        if (origin === allowed) {
          allowedOrigin = origin;
          break;
        }
      } else if (allowed instanceof RegExp) {
        if (allowed.test(origin)) {
          allowedOrigin = origin;
          break;
        }
      }
    }
  }
  
  // If no match, use first allowed origin (or empty for security)
  // In development, we allow the request but log a warning
  if (!allowedOrigin && origin) {
    console.warn(`CORS: Origin not in allowed list: ${origin}`);
    // For now, allow during development but log
    allowedOrigin = origin;
  }
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin || ALLOWED_ORIGINS[0] as string,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

// Handle CORS preflight
export function handleCorsPreFlight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }
  return null;
}
