// File: src/hooks/useSpotCounts.ts
// Real-time hook for tracking available seeker and earner spots

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SpotCounts {
  seekerSpotsRemaining: number;
  earnerSpotsRemaining: number;
  seekerSpotsTotal: number;
  earnerSpotsTotal: number;
  loading: boolean;
}

const SEEKER_TOTAL = 100;
const EARNER_TOTAL = 50;

export function useSpotCounts(): SpotCounts {
  const [seekerCount, setSeekerCount] = useState(0);
  const [earnerCount, setEarnerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCounts = async () => {
    try {
      // Count seekers (users with user_type 'seeker')
      const { count: seekerTotal, error: seekerError } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("user_type", "seeker");

      if (seekerError) throw seekerError;

      // Count earners (users with user_type 'earner')
      const { count: earnerTotal, error: earnerError } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("user_type", "earner");

      if (earnerError) throw earnerError;

      setSeekerCount(seekerTotal || 0);
      setEarnerCount(earnerTotal || 0);
    } catch (error) {
      console.error("Error fetching spot counts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchCounts();

    // Subscribe to real-time changes on profiles table
    const channel = supabase
      .channel("spot-counts")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          console.log("Profile change detected:", payload);
          // Refetch counts whenever a profile changes
          fetchCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    seekerSpotsRemaining: Math.max(0, SEEKER_TOTAL - seekerCount),
    earnerSpotsRemaining: Math.max(0, EARNER_TOTAL - earnerCount),
    seekerSpotsTotal: SEEKER_TOTAL,
    earnerSpotsTotal: EARNER_TOTAL,
    loading,
  };
}
