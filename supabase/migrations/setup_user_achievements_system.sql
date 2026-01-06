-- ============================================
-- MIGRATION: setup_user_achievements_system.sql
-- DESCRIPTION: Creates schema for user badges 
--              and achievements (e.g., Leaderboards).
-- ============================================

-- 1. Create Enum for Badge Types
CREATE TYPE badge_type AS ENUM ('crown_bearer', 'diamond_supporter', 'top_supporter', 'verified', 'vip');

-- 2. Create User Badges Table
CREATE TABLE IF NOT EXISTS public.user_badges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    badge_type badge_type NOT NULL,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure a user doesn't have duplicate active badges of the same type
    -- (Unless you want them to stack weekly, then remove this constraint)
    UNIQUE(user_id, badge_type)
);

-- 3. Indexes for performance
CREATE INDEX idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX idx_user_badges_type ON public.user_badges(badge_type);

-- 4. Enable RLS
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- 5. Policies
CREATE POLICY "Public can view user badges" ON public.user_badges FOR SELECT USING (true);

-- 6. Function to Award a Badge
CREATE OR REPLACE FUNCTION award_badge(p_user_id UUID, p_badge_type badge_type)
RETURNS JSON AS $$
BEGIN
    INSERT INTO public.user_badges (user_id, badge_type)
    VALUES (p_user_id, p_badge_type)
    ON CONFLICT (user_id, badge_type) DO NOTHING; -- Ignore if they already have it
    
    -- Return success
    RETURN json_build_object('success', true, 'badge', p_badge_type);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;