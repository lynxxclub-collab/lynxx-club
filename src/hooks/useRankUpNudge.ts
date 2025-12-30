import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface RankInfo {
  currentRank: number | null;
  currentCredits: number;
  nextRankCredits: number;
  creditsToNextRank: number;
}

interface NudgeState {
  shouldShow: boolean;
  message: string | null;
  creditsNeeded: number;
  targetRank: number | null;
}

// Generate a session ID that persists for the browser session
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('leaderboard_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    sessionStorage.setItem('leaderboard_session_id', sessionId);
  }
  return sessionId;
};

export function useRankUpNudge(creatorId: string, creatorName: string) {
  const { user } = useAuth();
  const [nudgeState, setNudgeState] = useState<NudgeState>({
    shouldShow: false,
    message: null,
    creditsNeeded: 0,
    targetRank: null
  });
  const [dismissed, setDismissed] = useState(false);

  const checkNudge = useCallback(async () => {
    if (!user || !creatorId) return;

    try {
      // Get user's rank info
      const { data, error } = await supabase.rpc('get_user_rank_info', {
        p_user_id: user.id,
        p_creator_id: creatorId
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        setNudgeState({ shouldShow: false, message: null, creditsNeeded: 0, targetRank: null });
        return;
      }

      const rankInfo = data[0] as {
        current_rank: number | null;
        current_credits: number;
        next_rank_credits: number;
        credits_to_next_rank: number;
      };

      const creditsToNext = Number(rankInfo.credits_to_next_rank);
      const currentRank = rankInfo.current_rank;

      // Only show nudge if within 100 credits of next rank and not already #1
      if (creditsToNext > 0 && creditsToNext <= 100 && currentRank !== 1) {
        // Check if we've already shown this nudge in this session
        const sessionId = getSessionId();
        
        const { data: existingNudge } = await supabase
          .from('leaderboard_nudges')
          .select('id')
          .eq('user_id', user.id)
          .eq('creator_id', creatorId)
          .eq('session_id', sessionId)
          .eq('nudge_type', 'rank_up')
          .single();

        if (!existingNudge) {
          // Determine target rank and message
          let targetRank = currentRank ? currentRank - 1 : 10;
          let message = '';

          if (targetRank === 1) {
            message = `You're ${creditsToNext} credits away from #1 on ${creatorName}'s leaderboard! 👑`;
          } else if (targetRank <= 3) {
            message = `You're ${creditsToNext} credits away from Top 3 on ${creatorName}'s leaderboard! 💎`;
          } else if (targetRank <= 10) {
            message = `You're ${creditsToNext} credits away from Top ${targetRank} on ${creatorName}'s leaderboard!`;
          } else {
            // Close to entering top 10
            message = `You're ${creditsToNext} credits away from the Top 10 on ${creatorName}'s leaderboard!`;
            targetRank = 10;
          }

          setNudgeState({
            shouldShow: true,
            message,
            creditsNeeded: creditsToNext,
            targetRank
          });
        }
      } else {
        setNudgeState({ shouldShow: false, message: null, creditsNeeded: 0, targetRank: null });
      }
    } catch (err) {
      console.error('Error checking rank nudge:', err);
    }
  }, [user, creatorId, creatorName]);

  useEffect(() => {
    checkNudge();
  }, [checkNudge]);

  const dismissNudge = useCallback(async () => {
    if (!user || !creatorId) return;

    setDismissed(true);
    setNudgeState(prev => ({ ...prev, shouldShow: false }));

    // Record that we've shown this nudge
    try {
      const sessionId = getSessionId();
      await supabase.from('leaderboard_nudges').insert({
        user_id: user.id,
        creator_id: creatorId,
        session_id: sessionId,
        nudge_type: 'rank_up'
      });
    } catch (err) {
      // Ignore duplicate errors
    }
  }, [user, creatorId]);

  return {
    shouldShow: nudgeState.shouldShow && !dismissed,
    message: nudgeState.message,
    creditsNeeded: nudgeState.creditsNeeded,
    targetRank: nudgeState.targetRank,
    dismissNudge
  };
}
