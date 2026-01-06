-- ============================================
-- MIGRATION: add_gifting_settings_columns.sql
-- DESCRIPTION: Adds columns for gifting preferences
--              and gift catalog sorting/visibility.
-- ============================================

-- 1. Add Gifting Preferences to Profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS leaderboard_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_daily_leaderboard BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS auto_thank_you_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS gifting_onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- 2. Add Display Control to Gift Catalog
ALTER TABLE public.gift_catalog
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

-- 3. Update Default Values for new columns (if null)
UPDATE public.gift_catalog 
SET active = COALESCE(active, true);

UPDATE public.gift_catalog 
SET sort_order = COALESCE(sort_order, 0);