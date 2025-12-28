// Shared authentication and authorization utilities for edge functions

import { createClient, SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Verifies user authentication from request headers
 * Returns the authenticated user or null if not authenticated
 */
export async function verifyAuth(req: Request): Promise<{ user: User | null; error: string | null }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { user: null, error: "Authorization header is required" };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

  if (authError || !user) {
    console.error("Auth verification failed:", authError?.message);
    return { user: null, error: "Invalid or expired authentication token" };
  }

  return { user, error: null };
}

/**
 * Checks if the user has the admin role using the has_role database function
 * This is server-side verification - never trust client-side role checks
 */
export async function verifyAdminRole(userId: string): Promise<boolean> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Use the has_role database function for secure role verification
  const { data, error } = await supabase
    .rpc('has_role', { _user_id: userId, _role: 'admin' });

  if (error) {
    console.error("Error verifying admin role:", error.message);
    return false;
  }

  return data === true;
}

/**
 * Checks if the user has the moderator role
 */
export async function verifyModeratorRole(userId: string): Promise<boolean> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .rpc('has_role', { _user_id: userId, _role: 'moderator' });

  if (error) {
    console.error("Error verifying moderator role:", error.message);
    return false;
  }

  return data === true;
}

/**
 * Checks if the user has admin or moderator role (either qualifies)
 */
export async function verifyAdminOrModeratorRole(userId: string): Promise<boolean> {
  const isAdmin = await verifyAdminRole(userId);
  if (isAdmin) return true;
  
  return await verifyModeratorRole(userId);
}

/**
 * Creates a response for unauthorized access
 */
export function createUnauthorizedResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: "Authentication required",
      code: "unauthorized"
    }),
    { 
      status: 401, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    }
  );
}

/**
 * Creates a response for forbidden access (authenticated but not authorized)
 */
export function createForbiddenResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: "You do not have permission to perform this action",
      code: "forbidden"
    }),
    { 
      status: 403, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    }
  );
}
