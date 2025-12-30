import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isOnPage } from "@/lib/queryConfig";

// Pages where presence tracking is needed
const PRESENCE_PAGES = ['/browse', '/messages', '/dashboard'];

export function usePresence(userId: string | undefined) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isActiveRef = useRef(false);

  useEffect(() => {
    if (!userId) return;

    // Only activate presence on pages that need it
    if (!isOnPage(PRESENCE_PAGES)) {
      return;
    }

    // Delay subscription to reduce initial load
    const timeout = setTimeout(() => {
      if (isActiveRef.current) return; // Already subscribed
      isActiveRef.current = true;

      channelRef.current = supabase.channel('online-users', {
        config: { presence: { key: userId } }
      });

      channelRef.current
        .on('presence', { event: 'sync' }, () => {
          const state = channelRef.current?.presenceState() || {};
          const online = new Set(Object.keys(state));
          setOnlineUsers(online);
        })
        .on('presence', { event: 'join' }, ({ key }) => {
          setOnlineUsers(prev => new Set(prev).add(key));
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          setOnlineUsers(prev => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channelRef.current?.track({
              user_id: userId,
              online_at: new Date().toISOString()
            });
          }
        });
    }, 2000); // 2 second delay to let critical content load first

    return () => {
      clearTimeout(timeout);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        isActiveRef.current = false;
      }
    };
  }, [userId]);

  const isUserOnline = useCallback((id: string) => onlineUsers.has(id), [onlineUsers]);

  return { onlineUsers, isUserOnline };
}
