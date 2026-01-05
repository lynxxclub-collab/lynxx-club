import React, { createContext, useContext, useEffect, useState, startTransition } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  // credit_balance moved to wallets table - use useWallet() hook instead
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
  // Verification fields
  verification_status: string | null;
  verification_submitted_at: string | null;
  verification_attempts: number;
  verified_at: string | null;
  // New profile fields
  height: string | null;
  hobbies: string[] | null;
  interests: string[] | null;
  // Notification preferences
  email_notifications_enabled: boolean;
  notify_new_message: boolean;
  notify_video_booking: boolean;
  notify_likes: boolean;
  notify_payouts: boolean;
  // Gift animation preferences
  mute_gift_animations: boolean;
  premium_animation_limit: number;
  // Leaderboard settings
  leaderboard_enabled: boolean;
  show_daily_leaderboard: boolean;
  // Gifting onboarding
  gifting_onboarding_completed: boolean;
  gifting_onboarding_completed_at: string | null;
  auto_thank_you_enabled: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

import { User, Session } from "@supabase/supabase-js";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    return data as Profile | null;
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    // Get session first without blocking render
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Fetch profile in a non-blocking transition after initial render
      if (session?.user) {
        startTransition(() => {
          fetchProfile(session.user.id).then(setProfile);
        });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Use startTransition to not block UI updates
        startTransition(() => {
          fetchProfile(session.user.id).then(setProfile);
        });
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string, rememberMe: boolean = true) => {
    // If not remembering, mark session as temporary so it clears on browser close
    if (!rememberMe) {
      sessionStorage.setItem("supabase_session_temporary", "true");
    } else {
      sessionStorage.removeItem("supabase_session_temporary");
    }

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
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        refreshProfile,
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
