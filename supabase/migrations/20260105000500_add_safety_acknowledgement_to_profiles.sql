-- ============================================
-- MIGRATION: add_safety_acknowledgement_to_profiles.sql
-- DESCRIPTION: Adds a timestamp to track when a user
--              acknowledged safety tips (compliance).
-- ============================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS safety_tips_acknowledged_at TIMESTAMP WITH TIME ZONE;
