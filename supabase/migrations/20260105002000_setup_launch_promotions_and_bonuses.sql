-- ============================================
-- MIGRATION: setup_launch_promotions_and_bonuses.sql
-- DESCRIPTION: Tracks launch promotions and adds
--              columns for featured status and credits
--              to profiles for the onboarding flow.
-- ============================================

-- 1. Create Launch Promotions Table
CREATE TYPE promotion_type AS ENUM ('launch_bonus_100', 'launch_featured_30d');

CREATE TABLE IF NOT EXISTS public.launch_promotions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    user_type user_role NOT NULL, -- 'seeker' or 'earner'
    promotion_type promotion_type NOT NULL,
    bonus_credits INT, -- Applicable if credits awarded
    featured_until TIMESTAMP WITH TIME ZONE, -- Applicable if featured status awarded
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add Columns to Profiles for Bonuses/Features
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS credit_balance INT DEFAULT 0; -- Stores current balance on profile (mirrors wallet for onboarding speed)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- 3. Enable RLS
ALTER TABLE public.launch_promotions ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY "Users can view own promotions" ON public.launch_promotions
    FOR SELECT USING (auth.uid() = user_id);

-- 5. Indexes
CREATE INDEX idx_launch_promotions_user ON public.launch_promotions(user_id);

-- 6. Trigger to sync profile credit_balance to wallet (Optional but recommended)
-- If you want to ensure consistency between profiles.credit_balance and wallets.current_balance_credits
-- You would add a trigger here, but for onboarding speed, direct update is okay.
