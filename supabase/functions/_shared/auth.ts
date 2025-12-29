import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Role types matching your backend auth utilities
type UserRole = "admin" | "moderator" | "earner" | "seeker";

interface Profile {
  id: string;
  email: string;
  name: string | null;
  date_of_birth: string | null;
  gender: "male" | "female" | "non_binary" | "other" | null;
  gender_preference: ("male" | "female" | "non_binary" | "other")[] | null;
  location_city: string | null;
  location_state: string | null;
  bio: string | null;
  profile_photos: string[];
  user_type: "seeker" | "earner" | null;
  credit_balance: number;
  earnings_balance: number;
  pending_balance: number;
  video_30min_rate: number;
  video_60min_rate: number;
  average_rating: number;
  total_ratings: number;
  account_status: string;
  onboarding_step: number;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  created_at: string | null;
  paused_date: string | null;
  exit_reason: string | null;
  reactivation_eligible_date: string | null;
  alumni_access_expires: string | null;
  reactivation_count: number;
  last_reactivated_at: string | null;
  verification_status: string | null;
  verification_submitted_at: string | null;
  verification_attempts: number;
  verified_at: string | null;
  height: string | null;
  hobbies: string[] | null;
  interests: string[] | null;
}

interface AuthContextType {
  // Core state
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: UserRole[];
  loading: boolean;

  // Auth methods
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;

  // Profile methods
  refreshProfile: () => Promise<void>;

  // Role checks (matching backend auth utilities)
  isAdmin: boolean;
  isModerator: boolean;
  isAdminOrModerator: boolean;
  isEarner: boolean;
  isSeeker: boolean;
  hasRole: (role: UserRole) => boolean;

  // API helpers for Edge Functions
  getAuthHeaders: () => Record<string, string>;
  callEdgeFunction: <T = unknown>(
    functionName: string,
    options?: EdgeFunctionOptions,
  ) => Promise<EdgeFunctionResponse<T>>;
}

interface EdgeFunctionOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: Record<string, unknown>;
}

interface EdgeFunctionResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user profile
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    return data as Profile | null;
  }, []);

  // Fetch user roles from user_roles table
  const fetchRoles = useCallback(async (userId: string): Promise<UserRole[]> => {
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);

    if (error) {
      console.error("Error fetching roles:", error);
      return [];
    }
    return (data || []).map((r) => r.role as UserRole);
  }, []);

  // Refresh profile and roles
  const refreshProfile = useCallback(async () => {
    if (user) {
      const [profileData, userRoles] = await Promise.all([fetchProfile(user.id), fetchRoles(user.id)]);
      setProfile(profileData);
      setRoles(userRoles);
    }
  }, [user, fetchProfile, fetchRoles]);

  // Initialize auth state
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        // Use setTimeout to avoid Supabase auth deadlock
        setTimeout(async () => {
          const [profileData, userRoles] = await Promise.all([
            fetchProfile(newSession.user.id),
            fetchRoles(newSession.user.id),
          ]);
          setProfile(profileData);
          setRoles(userRoles);
        }, 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
      setLoading(false);
    });

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        const [profileData, userRoles] = await Promise.all([
          fetchProfile(initialSession.user.id),
          fetchRoles(initialSession.user.id),
        ]);
        setProfile(profileData);
        setRoles(userRoles);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, fetchRoles]);

  // Auth methods
  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/onboarding`,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  };

  // Role checks (matching backend verifyAdminRole, verifyModeratorRole, etc.)
  const hasRole = useCallback((role: UserRole) => roles.includes(role), [roles]);
  const isAdmin = roles.includes("admin");
  const isModerator = roles.includes("moderator");
  const isAdminOrModerator = isAdmin || isModerator;
  const isEarner = profile?.user_type === "earner";
  const isSeeker = profile?.user_type === "seeker";

  // Get auth headers for Edge Function calls
  const getAuthHeaders = useCallback((): Record<string, string> => {
    if (!session?.access_token) {
      return {};
    }
    return {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    };
  }, [session]);

  // Call Edge Function with auth headers
  const callEdgeFunction = useCallback(
    async <T = unknown,>(functionName: string, options: EdgeFunctionOptions = {}): Promise<EdgeFunctionResponse<T>> => {
      const { method = "POST", body } = options;

      if (!session?.access_token) {
        return {
          data: null,
          error: "Authentication required",
          success: false,
        };
      }

      try {
        const { data, error } = await supabase.functions.invoke(functionName, {
          body,
          headers: getAuthHeaders(),
          method,
        });

        if (error) {
          return {
            data: null,
            error: error.message,
            success: false,
          };
        }

        // Handle standard response format from your Edge Functions
        if (data && typeof data === "object" && "success" in data) {
          return {
            data: data as T,
            error: data.error || null,
            success: data.success,
          };
        }

        return {
          data: data as T,
          error: null,
          success: true,
        };
      } catch (err) {
        console.error(`Error calling ${functionName}:`, err);
        return {
          data: null,
          error: err instanceof Error ? err.message : "An unexpected error occurred",
          success: false,
        };
      }
    },
    [session, getAuthHeaders],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        resetPassword,
        updatePassword,
        refreshProfile,
        isAdmin,
        isModerator,
        isAdminOrModerator,
        isEarner,
        isSeeker,
        hasRole,
        getAuthHeaders,
        callEdgeFunction,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Convenience hooks
export function useIsAuthenticated() {
  const { user, loading } = useAuth();
  return { isAuthenticated: !!user, loading };
}

export function useProfile() {
  const { profile, loading, refreshProfile } = useAuth();
  return { profile, loading, refreshProfile };
}

export function useRoles() {
  const { roles, isAdmin, isModerator, isAdminOrModerator, isEarner, isSeeker, hasRole } = useAuth();
  return { roles, isAdmin, isModerator, isAdminOrModerator, isEarner, isSeeker, hasRole };
}

export function useEdgeFunctions() {
  const { callEdgeFunction, getAuthHeaders } = useAuth();
  return { callEdgeFunction, getAuthHeaders };
}
