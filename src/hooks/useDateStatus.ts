import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DateStatusOptions {
  dateId: string | undefined;
  checkInterval?: number; // Time in milliseconds (default 3000ms = 3s)
}

/**
 * Simulates Realtime updates by polling the database.
 * Use this to track date status (Pending -> Active -> Completed) 
 * without paying for Supabase Replication.
 */
export const useDateStatus = ({ dateId, checkInterval = 3000 }: DateStatusOptions) => {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dateId) return;

    // Function to check status
    const checkStatus = async () => {
      const { data, error } = await supabase
        .from("video_dates")
        .select("status")
        .eq("id", dateId)
        .single();

      if (error) {
        console.error("Error checking status:", error);
        return;
      }

      if (data) {
        setStatus(data.status);
        // Only show loading on the very first fetch, not on every poll
        if (loading) setLoading(false);
        
        // Optimization: If the date is 'completed' or 'cancelled', stop polling to save resources
        if (data.status === "completed" || data.status === "cancelled") {
          clearInterval(intervalId);
        }
      }
    };

    // Run immediately on load
    checkStatus();

    // Set up the polling interval
    const intervalId = setInterval(checkStatus, checkInterval);

    // Cleanup function
    return () => {
      clearInterval(intervalId);
    };
  }, [dateId, checkInterval, loading]);

  return { status, loading };
};