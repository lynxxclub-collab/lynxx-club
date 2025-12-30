-- Add leaderboard settings to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS leaderboard_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_daily_leaderboard BOOLEAN DEFAULT true;

-- Create hidden_gifters table for creator moderation
CREATE TABLE public.hidden_gifters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL,
  gifter_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(creator_id, gifter_id)
);

-- Enable RLS on hidden_gifters
ALTER TABLE public.hidden_gifters ENABLE ROW LEVEL SECURITY;

-- RLS policies for hidden_gifters
CREATE POLICY "Creators can view their hidden gifters"
ON public.hidden_gifters FOR SELECT
USING (auth.uid() = creator_id);

CREATE POLICY "Creators can hide gifters"
ON public.hidden_gifters FOR INSERT
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can unhide gifters"
ON public.hidden_gifters FOR DELETE
USING (auth.uid() = creator_id);

-- Create leaderboard_nudges table for tracking nudge sessions
CREATE TABLE public.leaderboard_nudges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  nudge_type TEXT NOT NULL DEFAULT 'rank_up',
  session_id TEXT NOT NULL,
  shown_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, creator_id, session_id, nudge_type)
);

-- Enable RLS on leaderboard_nudges
ALTER TABLE public.leaderboard_nudges ENABLE ROW LEVEL SECURITY;

-- RLS policies for leaderboard_nudges
CREATE POLICY "Users can view their own nudges"
ON public.leaderboard_nudges FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own nudges"
ON public.leaderboard_nudges FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Function: Get top gifters for daily window (rolling 24 hours)
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
  WITH ranked AS (
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
  LIMIT p_limit;
$$;

-- Function: Get top gifters for weekly window (rolling 7 days)
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
  WITH ranked AS (
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
  LIMIT p_limit;
$$;

-- Function: Get top gifters for all time
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
  WITH ranked AS (
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
  LIMIT p_limit;
$$;

-- Function: Get user's rank info for nudge calculation
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
  v_user_credits BIGINT;
  v_user_rank INT;
  v_next_credits BIGINT;
BEGIN
  -- Get user's current weekly credits
  SELECT COALESCE(SUM(gt.credits_spent), 0)::BIGINT INTO v_user_credits
  FROM gift_transactions gt
  WHERE gt.sender_id = p_user_id
    AND gt.recipient_id = p_creator_id
    AND gt.created_at >= NOW() - INTERVAL '7 days';
  
  -- Get user's current rank
  WITH ranked AS (
    SELECT 
      gt.sender_id,
      SUM(gt.credits_spent)::BIGINT as total_credits,
      ROW_NUMBER() OVER (ORDER BY SUM(gt.credits_spent) DESC) as rank
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
  
  -- If user has no rank, they're unranked
  IF v_user_rank IS NULL THEN
    -- Get the credits of the 10th ranked person (or lowest if less than 10)
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
      NULL::INT as current_rank,
      v_user_credits as current_credits,
      COALESCE(v_next_credits, 1::BIGINT) as next_rank_credits,
      GREATEST(COALESCE(v_next_credits, 1::BIGINT) - v_user_credits + 1, 0::BIGINT) as credits_to_next_rank;
    RETURN;
  END IF;
  
  -- Get the credits of the person ranked just above the user
  WITH ranked AS (
    SELECT 
      gt.sender_id,
      SUM(gt.credits_spent)::BIGINT as total_credits,
      ROW_NUMBER() OVER (ORDER BY SUM(gt.credits_spent) DESC) as rank
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
    v_user_rank as current_rank,
    v_user_credits as current_credits,
    COALESCE(v_next_credits, v_user_credits) as next_rank_credits,
    GREATEST(COALESCE(v_next_credits, v_user_credits) - v_user_credits + 1, 0::BIGINT) as credits_to_next_rank;
END;
$$;