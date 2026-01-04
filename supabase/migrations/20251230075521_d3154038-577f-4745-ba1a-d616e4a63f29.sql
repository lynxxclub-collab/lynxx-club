-- =============================================================================
-- LEADERBOARD SETTINGS + CREATOR MODERATION (EARNERS ONLY)
-- =============================================================================

-- 1) Add leaderboard settings to profiles (safe defaults + NOT NULL)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS leaderboard_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_daily_leaderboard BOOLEAN NOT NULL DEFAULT true;

-- Backfill safety (in case columns existed nullable)
UPDATE public.profiles
SET
  leaderboard_enabled = COALESCE(leaderboard_enabled, true),
  show_daily_leaderboard = COALESCE(show_daily_leaderboard, true)
WHERE leaderboard_enabled IS NULL OR show_daily_leaderboard IS NULL;


-- =============================================================================
-- 2) hidden_gifters: creator moderation list (EARNER/CREATOR owns these rows)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.hidden_gifters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL,
  gifter_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(creator_id, gifter_id)
);

ALTER TABLE public.hidden_gifters ENABLE ROW LEVEL SECURITY;

-- Only the CREATOR (earner) can view/manage their hidden list
DROP POLICY IF EXISTS "Creators can view their hidden gifters" ON public.hidden_gifters;
CREATE POLICY "Creators can view their hidden gifters"
ON public.hidden_gifters FOR SELECT
TO authenticated
USING (
  auth.uid() = creator_id
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.user_type = 'earner'
      AND p.account_status = 'active'
      AND p.verification_status = 'verified'
  )
);

DROP POLICY IF EXISTS "Creators can hide gifters" ON public.hidden_gifters;
CREATE POLICY "Creators can hide gifters"
ON public.hidden_gifters FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = creator_id
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.user_type = 'earner'
      AND p.account_status = 'active'
      AND p.verification_status = 'verified'
  )
);

DROP POLICY IF EXISTS "Creators can unhide gifters" ON public.hidden_gifters;
CREATE POLICY "Creators can unhide gifters"
ON public.hidden_gifters FOR DELETE
TO authenticated
USING (
  auth.uid() = creator_id
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.user_type = 'earner'
      AND p.account_status = 'active'
      AND p.verification_status = 'verified'
  )
);


-- =============================================================================
-- 3) leaderboard_nudges: per-user session tracking (any user can log their own)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.leaderboard_nudges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  nudge_type TEXT NOT NULL DEFAULT 'rank_up',
  session_id TEXT NOT NULL,
  shown_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, creator_id, session_id, nudge_type)
);

ALTER TABLE public.leaderboard_nudges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own nudges" ON public.leaderboard_nudges;
CREATE POLICY "Users can view their own nudges"
ON public.leaderboard_nudges FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own nudges" ON public.leaderboard_nudges;
CREATE POLICY "Users can insert their own nudges"
ON public.leaderboard_nudges FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);


-- =============================================================================
-- 4) Helper: check creator leaderboard settings (used by functions)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.creator_leaderboard_is_enabled(p_creator_id uuid, p_window text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (p.user_type = 'earner')
    AND (COALESCE(p.leaderboard_enabled, true) = true)
    AND (
      p_window <> 'daily'
      OR COALESCE(p.show_daily_leaderboard, true) = true
    )
  FROM public.profiles p
  WHERE p.id = p_creator_id
    AND p.account_status = 'active'
    AND p.verification_status = 'verified';
$$;


-- =============================================================================
-- 5) Top gifters (DAILY) - respects creator settings + hidden list
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_top_gifters_daily(p_creator_id UUID, p_limit INT DEFAULT 10)
RETURNS TABLE (
  rank INT,
  gifter_id UUID,
  gifter_name TEXT,
  gifter_photo TEXT,
  total_credits BIGINT,
  last_gift_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH enabled AS (
    SELECT public.creator_leaderboard_is_enabled(p_creator_id, 'daily') AS ok
  ),
  ranked AS (
    SELECT 
      gt.sender_id as gifter_id,
      p.name as gifter_name,
      p.profile_photos[1] as gifter_photo,
      SUM(gt.credits_spent)::BIGINT as total_credits,
      MAX(gt.created_at) as last_gift_at
    FROM gift_transactions gt
    JOIN profiles p ON p.id = gt.sender_id
    WHERE gt.recipient_id = p_creator_id
      AND gt.created_at >= NOW() - INTERVAL '24 hours'
      AND NOT EXISTS (
        SELECT 1 FROM hidden_gifters hg 
        WHERE hg.creator_id = p_creator_id AND hg.gifter_id = gt.sender_id
      )
    GROUP BY gt.sender_id, p.name, p.profile_photos
  )
  SELECT 
    ROW_NUMBER() OVER (ORDER BY total_credits DESC, last_gift_at DESC, gifter_name ASC)::INT as rank,
    r.gifter_id, r.gifter_name, r.gifter_photo, r.total_credits, r.last_gift_at
  FROM ranked r
  WHERE (SELECT ok FROM enabled) = true
  LIMIT p_limit;
$$;


-- =============================================================================
-- 6) Top gifters (WEEKLY) - respects creator settings + hidden list
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_top_gifters_weekly(p_creator_id UUID, p_limit INT DEFAULT 10)
RETURNS TABLE (
  rank INT,
  gifter_id UUID,
  gifter_name TEXT,
  gifter_photo TEXT,
  total_credits BIGINT,
  last_gift_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH enabled AS (
    SELECT public.creator_leaderboard_is_enabled(p_creator_id, 'weekly') AS ok
  ),
  ranked AS (
    SELECT 
      gt.sender_id as gifter_id,
      p.name as gifter_name,
      p.profile_photos[1] as gifter_photo,
      SUM(gt.credits_spent)::BIGINT as total_credits,
      MAX(gt.created_at) as last_gift_at
    FROM gift_transactions gt
    JOIN profiles p ON p.id = gt.sender_id
    WHERE gt.recipient_id = p_creator_id
      AND gt.created_at >= NOW() - INTERVAL '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM hidden_gifters hg 
        WHERE hg.creator_id = p_creator_id AND hg.gifter_id = gt.sender_id
      )
    GROUP BY gt.sender_id, p.name, p.profile_photos
  )
  SELECT 
    ROW_NUMBER() OVER (ORDER BY total_credits DESC, last_gift_at DESC, gifter_name ASC)::INT as rank,
    r.gifter_id, r.gifter_name, r.gifter_photo, r.total_credits, r.last_gift_at
  FROM ranked r
  WHERE (SELECT ok FROM enabled) = true
  LIMIT p_limit;
$$;


-- =============================================================================
-- 7) Top gifters (ALL TIME) - respects creator settings + hidden list
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_top_gifters_alltime(p_creator_id UUID, p_limit INT DEFAULT 10)
RETURNS TABLE (
  rank INT,
  gifter_id UUID,
  gifter_name TEXT,
  gifter_photo TEXT,
  total_credits BIGINT,
  last_gift_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH enabled AS (
    SELECT public.creator_leaderboard_is_enabled(p_creator_id, 'alltime') AS ok
  ),
  ranked AS (
    SELECT 
      gt.sender_id as gifter_id,
      p.name as gifter_name,
      p.profile_photos[1] as gifter_photo,
      SUM(gt.credits_spent)::BIGINT as total_credits,
      MAX(gt.created_at) as last_gift_at
    FROM gift_transactions gt
    JOIN profiles p ON p.id = gt.sender_id
    WHERE gt.recipient_id = p_creator_id
      AND NOT EXISTS (
        SELECT 1 FROM hidden_gifters hg 
        WHERE hg.creator_id = p_creator_id AND hg.gifter_id = gt.sender_id
      )
    GROUP BY gt.sender_id, p.name, p.profile_photos
  )
  SELECT 
    ROW_NUMBER() OVER (ORDER BY total_credits DESC, last_gift_at DESC, gifter_name ASC)::INT as rank,
    r.gifter_id, r.gifter_name, r.gifter_photo, r.total_credits, r.last_gift_at
  FROM ranked r
  WHERE (SELECT ok FROM enabled) = true
  LIMIT p_limit;
$$;


-- =============================================================================
-- 8) Rank info (weekly) - consistent hidden list + creator settings
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_user_rank_info(p_user_id UUID, p_creator_id UUID)
RETURNS TABLE (
  current_rank INT,
  current_credits BIGINT,
  next_rank_credits BIGINT,
  credits_to_next_rank BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_credits BIGINT := 0;
  v_user_rank INT;
  v_next_credits BIGINT;
  v_enabled BOOLEAN;
BEGIN
  -- Respect creator settings (weekly)
  SELECT public.creator_leaderboard_is_enabled(p_creator_id, 'weekly') INTO v_enabled;
  IF COALESCE(v_enabled, false) = false THEN
    RETURN QUERY SELECT NULL::INT, 0::BIGINT, 0::BIGINT, 0::BIGINT;
    RETURN;
  END IF;

  -- User's weekly credits (exclude if hidden)
  SELECT COALESCE(SUM(gt.credits_spent), 0)::BIGINT INTO v_user_credits
  FROM gift_transactions gt
  WHERE gt.sender_id = p_user_id
    AND gt.recipient_id = p_creator_id
    AND gt.created_at >= NOW() - INTERVAL '7 days'
    AND NOT EXISTS (
      SELECT 1 FROM hidden_gifters hg
      WHERE hg.creator_id = p_creator_id AND hg.gifter_id = p_user_id
    );

  -- Rank table (weekly)
  WITH ranked AS (
    SELECT 
      gt.sender_id,
      SUM(gt.credits_spent)::BIGINT as total_credits,
      ROW_NUMBER() OVER (ORDER BY SUM(gt.credits_spent) DESC, MAX(gt.created_at) DESC) as rank
    FROM gift_transactions gt
    WHERE gt.recipient_id = p_creator_id
      AND gt.created_at >= NOW() - INTERVAL '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM hidden_gifters hg 
        WHERE hg.creator_id = p_creator_id AND hg.gifter_id = gt.sender_id
      )
    GROUP BY gt.sender_id
  )
  SELECT r.rank INTO v_user_rank
  FROM ranked r
  WHERE r.sender_id = p_user_id;

  -- If unranked, target is the 10th place credits (or 1)
  IF v_user_rank IS NULL THEN
    SELECT r.total_credits INTO v_next_credits
    FROM (
      SELECT SUM(gt.credits_spent)::BIGINT as total_credits
      FROM gift_transactions gt
      WHERE gt.recipient_id = p_creator_id
        AND gt.created_at >= NOW() - INTERVAL '7 days'
        AND NOT EXISTS (
          SELECT 1 FROM hidden_gifters hg 
          WHERE hg.creator_id = p_creator_id AND hg.gifter_id = gt.sender_id
        )
      GROUP BY gt.sender_id
      ORDER BY total_credits DESC
      LIMIT 10
    ) r
    ORDER BY r.total_credits ASC
    LIMIT 1;

    RETURN QUERY SELECT 
      NULL::INT,
      v_user_credits,
      COALESCE(v_next_credits, 1::BIGINT),
      GREATEST(COALESCE(v_next_credits, 1::BIGINT) - v_user_credits + 1, 0::BIGINT);
    RETURN;
  END IF;

  -- Credits of rank just above
  WITH ranked AS (
    SELECT 
      gt.sender_id,
      SUM(gt.credits_spent)::BIGINT as total_credits,
      ROW_NUMBER() OVER (ORDER BY SUM(gt.credits_spent) DESC, MAX(gt.created_at) DESC) as rank
    FROM gift_transactions gt
    WHERE gt.recipient_id = p_creator_id
      AND gt.created_at >= NOW() - INTERVAL '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM hidden_gifters hg 
        WHERE hg.creator_id = p_creator_id AND hg.gifter_id = gt.sender_id
      )
    GROUP BY gt.sender_id
  )
  SELECT r.total_credits INTO v_next_credits
  FROM ranked r
  WHERE r.rank = v_user_rank - 1;

  RETURN QUERY SELECT
    v_user_rank,
    v_user_credits,
    COALESCE(v_next_credits, v_user_credits),
    GREATEST(COALESCE(v_next_credits, v_user_credits) - v_user_credits + 1, 0::BIGINT);
END;
$$;