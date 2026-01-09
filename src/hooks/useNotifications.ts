import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// =============================================================================
// TYPES
// =============================================================================
export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  related_id: string | null;
  related_type: string | null;
  read_at: string | null;
  created_at: string;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
}

// =============================================================================
// CONSTANTS
// =============================================================================
const NOTIFICATION_LIMIT = 50;
const REALTIME_SUBSCRIPTION_DELAY_MS = 1000;

// =============================================================================
// AUDIO UTILITIES
// =============================================================================
let audioContext: AudioContext | null = null;

/**
 * Play a subtle notification sound using Web Audio API.
 * Reuses AudioContext to avoid creating multiple contexts.
 */
const playNotificationSound = (): void => {
  try {
    // Lazy initialize AudioContext (required for mobile browsers)
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      audioContext = new AudioContextClass();
    }

    // Resume context if suspended (required after user interaction on some browsers)
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Two-tone notification sound
    const now = audioContext.currentTime;
    oscillator.frequency.setValueAtTime(880, now);
    oscillator.frequency.setValueAtTime(1320, now + 0.1);

    // Fade out
    gainNode.gain.setValueAtTime(0.1, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    oscillator.start(now);
    oscillator.stop(now + 0.3);
  } catch {
    // Silently fail if audio not supported or blocked
  }
};

// =============================================================================
// HOOK
// =============================================================================
export function useNotifications(): UseNotificationsReturn {
  const { user } = useAuth();

  // State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs for tracking
  const prevUnreadCountRef = useRef(0);
  const isMountedRef = useRef(true);
  const fetchingRef = useRef(false);

  // User ID for dependencies (stable reference)
  const userId = user?.id ?? null;

  // ===========================================================================
  // FETCH NOTIFICATIONS
  // ===========================================================================
  const fetchNotifications = useCallback(async (): Promise<void> => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    // Prevent concurrent fetches
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("notifications")
        .select("id, user_id, type, title, message, related_id, related_type, read_at, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(NOTIFICATION_LIMIT);

      if (!isMountedRef.current) return;

      if (fetchError) {
        console.error("[useNotifications] Fetch error:", fetchError);
        setError(fetchError.message);
        return;
      }

      const notificationData = (data || []) as Notification[];
      const newUnreadCount = notificationData.filter((n) => !n.read_at).length;

      setNotifications(notificationData);
      setUnreadCount(newUnreadCount);
      prevUnreadCountRef.current = newUnreadCount;
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error("[useNotifications] Unexpected error:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch notifications");
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        fetchingRef.current = false;
      }
    }
  }, [userId]);

  // ===========================================================================
  // MARK AS READ (SINGLE)
  // ===========================================================================
  const markAsRead = useCallback(async (notificationId: string): Promise<void> => {
    if (!userId) return;

    // Optimistic update
    const previousNotifications = notifications;
    const previousUnreadCount = unreadCount;

    const notification = notifications.find((n) => n.id === notificationId);
    if (!notification || notification.read_at) return; // Already read

    const readAt = new Date().toISOString();

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read_at: readAt } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      const { error: updateError } = await supabase
        .from("notifications")
        .update({ read_at: readAt })
        .eq("id", notificationId)
        .eq("user_id", userId);

      if (updateError) {
        // Rollback on error
        console.error("[useNotifications] Mark as read error:", updateError);
        setNotifications(previousNotifications);
        setUnreadCount(previousUnreadCount);
      }
    } catch (err) {
      // Rollback on error
      console.error("[useNotifications] Mark as read unexpected error:", err);
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
    }
  }, [userId, notifications, unreadCount]);

  // ===========================================================================
  // MARK ALL AS READ
  // ===========================================================================
  const markAllAsRead = useCallback(async (): Promise<void> => {
    if (!userId || unreadCount === 0) return;

    // Optimistic update
    const previousNotifications = notifications;
    const previousUnreadCount = unreadCount;

    const readAt = new Date().toISOString();

    setNotifications((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: readAt }))
    );
    setUnreadCount(0);

    try {
      const { error: updateError } = await supabase
        .from("notifications")
        .update({ read_at: readAt })
        .eq("user_id", userId)
        .is("read_at", null);

      if (updateError) {
        // Rollback on error
        console.error("[useNotifications] Mark all as read error:", updateError);
        setNotifications(previousNotifications);
        setUnreadCount(previousUnreadCount);
      }
    } catch (err) {
      // Rollback on error
      console.error("[useNotifications] Mark all as read unexpected error:", err);
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
    }
  }, [userId, notifications, unreadCount]);

  // ===========================================================================
  // INITIAL FETCH
  // ===========================================================================
  useEffect(() => {
    isMountedRef.current = true;
    fetchNotifications();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchNotifications]);

  // ===========================================================================
  // REALTIME SUBSCRIPTION
  // ===========================================================================
  useEffect(() => {
    if (!userId) return;

    // Delay subscription to let initial fetch complete
    const timeoutId = setTimeout(() => {
      if (!isMountedRef.current) return;

      const channelName = `user-notifications-${userId}`;

      const channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (!isMountedRef.current) return;

            const newNotification = payload.new as Notification;

            // Validate the notification belongs to this user
            if (newNotification.user_id !== userId) return;

            setNotifications((prev) => {
              // Check for duplicates
              if (prev.some((n) => n.id === newNotification.id)) {
                return prev;
              }
              return [newNotification, ...prev].slice(0, NOTIFICATION_LIMIT);
            });

            setUnreadCount((prev) => {
              const newCount = prev + 1;

              // Play sound only when count increases
              if (newCount > prevUnreadCountRef.current) {
                playNotificationSound();
              }

              prevUnreadCountRef.current = newCount;
              return newCount;
            });
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (!isMountedRef.current) return;

            const updatedNotification = payload.new as Notification;

            // Validate the notification belongs to this user
            if (updatedNotification.user_id !== userId) return;

            setNotifications((prev) =>
              prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
            );

            // Recalculate unread count if read_at changed
            if (payload.old && !(payload.old as Notification).read_at && updatedNotification.read_at) {
              setUnreadCount((prev) => {
                const newCount = Math.max(0, prev - 1);
                prevUnreadCountRef.current = newCount;
                return newCount;
              });
            }
          }
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR") {
            console.error("[useNotifications] Realtime subscription error");
          }
        });

      // Store channel reference for cleanup
      return () => {
        supabase.removeChannel(channel);
      };
    }, REALTIME_SUBSCRIPTION_DELAY_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [userId]);

  // ===========================================================================
  // RETURN VALUE (MEMOIZED)
  // ===========================================================================
  return useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      error,
      markAsRead,
      markAllAsRead,
      refetch: fetchNotifications,
    }),
    [notifications, unreadCount, loading, error, markAsRead, markAllAsRead, fetchNotifications]
  );
}
