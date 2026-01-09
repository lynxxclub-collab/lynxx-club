import {
  createClient,
  SupabaseClient,
  User,
} from "https://esm.sh/@supabase/supabase-js@2";

// 1. Centralized Environment Variable Loading and Service Role Client Initialization
// This section ensures critical environment variables are available and
// initializes a single Supabase client for service role operations.

/**
 * Retrieves an environment variable or throws an error if it's not set.
 * This ensures critical configurations are present at startup, failing fast
 * if any are missing to prevent subsequent runtime issues.
 * @param name The name of the environment variable.
 * @returns The value of the environment variable.
 * @throws {Error} If the environment variable is not set.
 */
function getEnvOrThrow(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`[Configuration Error] Missing required environment variable: ${name}`);
  }
  return value;
}

// Load critical environment variables once at the module level.
// This ensures that if any of these are missing, the process fails early during initialization.
const SUPABASE_URL = getEnvOrThrow("SUPABASE_URL");
const SUPABASE_ANON_KEY = getEnvOrThrow("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = getEnvOrThrow("SUPABASE_SERVICE_ROLE_KEY");

/**
 * A singleton Supabase client configured with the service role key.
 * This client bypasses Row Level Security (RLS) and should be used with extreme caution
 * only for operations that absolutely require elevated privileges (e.g., admin checks,
 * fetching sensitive profile data for backend logic).
 * It's initialized once to improve efficiency, as the service key is static.
 */
const supabaseServiceRoleClient: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false, // Not relevant for service role operations
      persistSession: false, // Not relevant for service role operations
    },
    // No Authorization header needed here; the service key grants direct access.
  },
);

// 2. Utility Functions

/** Regular expression for validating UUIDs. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Checks if a given string is a valid UUID.
 * @param value The string to test.
 * @returns True if the string is a valid UUID, false otherwise.
 */
function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

// 3. Type Definitions for improved clarity and type safety

/**
 * Represents a user profile object stored in the 'profiles' table.
 * Extend this interface with all fields present in your 'profiles' table.
 */
export type UserProfile = {
  id: string;
  role: string; // e.g., 'admin', 'user'
  // Add other profile fields here as needed, e.g.:
  // username: string;
  // avatar_url: string;
  [key: string]: any; // Allow for additional properties not explicitly defined
} | null; // Can be null if profile not found

/**
 * Defines the structured result returned by the `verifyAuth` function.
 */
export type AuthVerificationResult = {
  user: User | null; // The Supabase User object if authenticated, else null
  error: string | null; // A descriptive error message if authentication fails
  supabase?: SupabaseClient; // An optional Supabase client instance configured with the user's token, only present on successful authentication.
};

// 4. Core Authentication Logic

/**
 * Verifies the JWT provided in the Authorization header of an incoming request.
 * It dynamically creates a new Supabase client for each request, configured with
 * the user's token. This ensures that any subsequent database operations using
 * the returned `supabase` client instance will correctly apply Row Level Security (RLS)
 * policies based on the authenticated user.
 *
 * @param req The incoming Deno Request object from the client.
 * @returns A `Promise` resolving to an `AuthVerificationResult` object,
 *          containing the authenticated `user`, an `error` message if any,
 *          and an optional `supabase` client instance for user-scoped operations.
 */
export async function verifyAuth(req: Request): Promise<AuthVerificationResult> {
  // Robust check for Authorization header, accounting for potential casing differences.
  const authHeader = req.headers.get("Authorization") ??
    req.headers.get("authorization");

  if (!authHeader) {
    console.warn("[Auth] Missing Authorization header in request.");
    return { user: null, error: "Authentication required: Missing Authorization header." };
  }

  // Expects a 'Bearer' token scheme.
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    console.warn("[Auth] Malformed Authorization header: Does not match 'Bearer <token>' format.");
    return { user: null, error: "Authentication required: Malformed Authorization header." };
  }

  const token = match[1]?.trim();
  if (!token) {
    console.warn("[Auth] Empty Bearer token found in Authorization header.");
    return { user: null, error: "Authentication required: Empty token provided." };
  }

  // Create a new Supabase client instance specific to this request and user token.
  // This client is crucial for ensuring RLS policies are enforced for user-driven actions.
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false, // Not necessary for a one-off token verification
      persistSession: false, // Sessions are typically managed client-side for single requests
    },
    global: {
      headers: { Authorization: `Bearer ${token}` }, // Binds the token to this client
    },
  });

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    // Log detailed error internally for debugging, but provide a generic message to the client for security.
    console.warn("[Auth] Token verification failed.", {
      message: error?.message,
      status: error?.status,
      // Consider adding request IP or other non-sensitive identifiers for context if needed.
    });
    return { user: null, error: error?.message || "Authentication failed: Invalid or expired token." };
  }

  // Authentication successful. Return the user and the RLS-aware Supabase client.
  return { user, error: null, supabase };
}

// 5. Role-Based Access Control and Profile Fetching (Service Role Operations)

/**
 * Verifies if a specific user possesses the 'admin' role by querying the 'profiles' table.
 * IMPORTANT: This function utilizes the pre-initialized `supabaseServiceRoleClient`,
 * which bypasses Row Level Security (RLS). Therefore, the `userId` passed to this
 * function MUST originate from a trusted, previously verified source (e.g.,
 * `verifyAuth().user.id`) to prevent unauthorized access.
 *
 * @param userId The unique ID of the user to check, typically a UUID.
 * @returns A `Promise` resolving to `true` if the user has the 'admin' role,
 *          `false` otherwise (e.g., user not found, not admin, or on error).
 */
export async function verifyAdminRole(userId: string): Promise<boolean> {
  if (!userId || !isUuid(userId)) {
    console.warn("[Auth] `verifyAdminRole` called with an invalid or missing userId. Refusing check.", { userId });
    return false;
  }

  // Use the efficient, pre-initialized service role client.
  const { data, error } = await supabaseServiceRoleClient
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .eq("role", "admin") // Filter directly for the 'admin' role
    .maybeSingle(); // Expects zero or one matching row

  if (error) {
    console.error("[Auth] Error checking admin role with service role client:", error);
    return false;
  }

  // 'data' will be an object if a profile with the 'admin' role was found, otherwise null.
  return !!data; // Converts truthy/falsy to boolean true/false
}

/**
 * Fetches a user's complete profile from the 'profiles' table.
 * IMPORTANT: Similar to `verifyAdminRole`, this function uses the
 * `supabaseServiceRoleClient` (bypassing RLS). Ensure `userId` is from
 * a trusted source to maintain security.
 *
 * @param userId The unique ID of the user whose profile to fetch.
 * @returns A `Promise` resolving to the `UserProfile` object if found,
 *          or `null` if the profile doesn't exist or an error occurs.
 */
export async function getUserProfile(userId: string): Promise<UserProfile> {
  if (!userId || !isUuid(userId)) {
    console.warn("[Auth] `getUserProfile` called with an invalid or missing userId. Refusing fetch.", { userId });
    return null;
  }

  // Use the efficient, pre-initialized service role client.
  const { data, error } = await supabaseServiceRoleClient
    .from("profiles")
    .select("*") // Select all columns for the profile
    .eq("id", userId)
    .maybeSingle(); // Expects zero or one matching row

  if (error) {
    console.error("[Auth] Error fetching user profile with service role client:", error);
    return null;
  }

  // 'data' will be the profile object (UserProfile type) or null if not found.
  return data as UserProfile;
}
