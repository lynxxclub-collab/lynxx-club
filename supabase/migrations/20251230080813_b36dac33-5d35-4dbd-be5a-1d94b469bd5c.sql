-- =============================================================================
-- Gifting onboarding tracking (EARNERS ONLY)
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gifting_onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gifting_onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_thank_you_enabled BOOLEAN NOT NULL DEFAULT false;

-- Safety backfill (in case columns existed without NOT NULL)
UPDATE public.profiles
SET
  gifting_onboarding_completed = COALESCE(gifting_onboarding_completed, false),
  auto_thank_you_enabled = COALESCE(auto_thank_you_enabled, false)
WHERE
  gifting_onboarding_completed IS NULL
  OR auto_thank_you_enabled IS NULL;