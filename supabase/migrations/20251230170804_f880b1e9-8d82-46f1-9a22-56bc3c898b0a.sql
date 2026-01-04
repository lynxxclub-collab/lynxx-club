-- =============================================================================
-- Add notification preference flags to profiles
-- =============================================================================

-- Match notifications (used by match_received)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notify_matches BOOLEAN NOT NULL DEFAULT true;

-- Gift notifications (used by gift_received)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notify_gifts BOOLEAN NOT NULL DEFAULT true;