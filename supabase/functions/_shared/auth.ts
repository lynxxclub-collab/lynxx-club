import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_RE.test(value);
}

function getEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) {
    console.error(`[auth] Missing required env var: ${name}`);
  }
  return v;
}

// Verify that the request has a valid JWT and return the user
export async function verifyAuth(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");

  if (!authHeader) {
    console.warn("[auth] Missing Authorization header");
    return { user: null, error: "Missing Authorization header" };
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    console.warn("[auth] Malformed Authorization header");
    return { user: null, error: "Malformed Authorization header" };
  }

  const token = match[1]?.trim();
  if (!token) {
    console.warn("[auth] Empty Bearer token");
    return { user: null, error: "Empty Bearer token" };
  }

  const supabaseUrl = getEnv("SUPABASE_URL");
  const supabaseAnonKey = getEnv("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    // Fail closed; do not throw (prevents random 500s from `!`).
    return { user: null, error: "Server auth misconfigured" };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    console.warn("[auth] Invalid token", { message: error?.message });
    return { user: null, error: error?.message || "Invalid token" };
  }

  return { user, error: null, supabase };
}

// Verify user has admin role
// UPDATED: Now queries the 'profiles' table (matching our SQL Migration)
export async function verifyAdminRole(userId: string) {
  // IMPORTANT: This function uses SERVICE ROLE (bypasses RLS).
  // Callers must only pass a userId derived from verified auth (e.g., verifyAuth().user.id).
  if (!userId || !isUuid(userId)) {
    console.warn("[auth] verifyAdminRole called with invalid userId; refusing", { userId });
    return false;
  }

  const supabaseUrl = getEnv("SUPABASE_URL");
  const supabaseServiceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[auth] Service role misconfigured; refusing admin check");
    return false;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (error) {
    console.error("[auth] Error checking admin role:", error);
    return false;
  }

  return !!data;
}

// Get user profile
// UPDATED: Ensures we fetch from the correct 'profiles' table
export async function getUserProfile(userId: string) {
  // IMPORTANT: This function uses SERVICE ROLE (bypasses RLS).
  // Callers must only pass a userId derived from verified auth (e.g., verifyAuth().user.id).
  if (!userId || !isUuid(userId)) {
    console.warn("[auth] getUserProfile called with invalid userId; refusing", { userId });
    return null;
  }

  const supabaseUrl = getEnv("SUPABASE_URL");
  const supabaseServiceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[auth] Service role misconfigured; refusing profile read");
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[auth] Error fetching profile:", error);
    return null;
  }

  return data;
}
