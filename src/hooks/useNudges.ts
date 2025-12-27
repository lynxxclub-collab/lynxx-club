import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import type { NudgeType } from '@/components/messages/ChatNudge';

interface NudgeState {
  activeNudge: NudgeType | null;
  shownNudges: Set<NudgeType>;
}

interface UseNudgesProps {
  conversationId: string | null;
  messageCount: number;
  hasUnlockedImage: boolean;
  hasUnlockedVideo: boolean;
  isCreatorOnline?: boolean;
  lastMessageTime?: Date;
}

export function useNudges({
  conversationId,
  messageCount,
  hasUnlockedImage,
  hasUnlockedVideo,
  isCreatorOnline = false,
  lastMessageTime
}: UseNudgesProps) {
  const { user, profile } = useAuth();
  const { wallet } = useWallet();
  const [state, setState] = useState<NudgeState>({
    activeNudge: null,
    shownNudges: new Set()
  });

  const isSeeker = profile?.user_type === 'seeker';
  const creditBalance = wallet?.credit_balance || 0;
  const LOW_CREDITS_THRESHOLD = 10;

  // Check nudge eligibility
  useEffect(() => {
    if (!isSeeker || !conversationId) {
      setState(prev => ({ ...prev, activeNudge: null }));
      return;
    }

    // Priority order for nudges
    let newNudge: NudgeType | null = null;

    // Low credits - highest priority
    if (creditBalance <= LOW_CREDITS_THRESHOLD && !state.shownNudges.has('low_credits')) {
      newNudge = 'low_credits';
    }
    // Image unlock - after 3+ text messages, no image purchased
    else if (messageCount >= 3 && !hasUnlockedImage && !state.shownNudges.has('image_unlock')) {
      newNudge = 'image_unlock';
    }
    // Video unlock - after image, no video purchased
    else if (hasUnlockedImage && !hasUnlockedVideo && !state.shownNudges.has('video_unlock')) {
      newNudge = 'video_unlock';
    }
    // Online availability - creator online, 2+ min pause
    else if (
      isCreatorOnline && 
      lastMessageTime && 
      Date.now() - lastMessageTime.getTime() > 2 * 60 * 1000 &&
      !hasUnlockedVideo &&
      !state.shownNudges.has('online_availability')
    ) {
      newNudge = 'online_availability';
    }

    setState(prev => ({ ...prev, activeNudge: newNudge }));
  }, [isSeeker, conversationId, messageCount, hasUnlockedImage, hasUnlockedVideo, isCreatorOnline, lastMessageTime, creditBalance, state.shownNudges]);

  // Record nudge shown
  const recordNudgeShown = useCallback(async (nudgeType: NudgeType) => {
    if (!user || !conversationId) return;

    try {
      await supabase.from('nudge_events').insert({
        conversation_id: conversationId,
        user_id: user.id,
        nudge_type: nudgeType
      });
    } catch (error) {
      console.error('Failed to record nudge shown:', error);
    }
  }, [user, conversationId]);

  // Record nudge clicked
  const recordNudgeClicked = useCallback(async (nudgeType: NudgeType) => {
    if (!user || !conversationId) return;

    try {
      await supabase
        .from('nudge_events')
        .update({ clicked_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .eq('nudge_type', nudgeType)
        .is('clicked_at', null)
        .order('shown_at', { ascending: false })
        .limit(1);
    } catch (error) {
      console.error('Failed to record nudge click:', error);
    }
  }, [user, conversationId]);

  // Dismiss nudge
  const dismissNudge = useCallback(async (nudgeType: NudgeType) => {
    setState(prev => ({
      activeNudge: null,
      shownNudges: new Set([...prev.shownNudges, nudgeType])
    }));

    if (!user || !conversationId) return;

    try {
      await supabase
        .from('nudge_events')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .eq('nudge_type', nudgeType)
        .is('dismissed_at', null)
        .order('shown_at', { ascending: false })
        .limit(1);
    } catch (error) {
      console.error('Failed to record nudge dismiss:', error);
    }
  }, [user, conversationId]);

  // Mark nudge as converted (purchase made)
  const recordNudgePurchase = useCallback(async (nudgeType: NudgeType) => {
    if (!user || !conversationId) return;

    try {
      await supabase
        .from('nudge_events')
        .update({ purchased_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .eq('nudge_type', nudgeType)
        .is('purchased_at', null)
        .order('shown_at', { ascending: false })
        .limit(1);
    } catch (error) {
      console.error('Failed to record nudge purchase:', error);
    }
  }, [user, conversationId]);

  // When active nudge changes, record it
  useEffect(() => {
    if (state.activeNudge && !state.shownNudges.has(state.activeNudge)) {
      recordNudgeShown(state.activeNudge);
      setState(prev => ({
        ...prev,
        shownNudges: new Set([...prev.shownNudges, state.activeNudge!])
      }));
    }
  }, [state.activeNudge, state.shownNudges, recordNudgeShown]);

  return {
    activeNudge: state.activeNudge,
    dismissNudge,
    recordNudgeClicked,
    recordNudgePurchase
  };
}
