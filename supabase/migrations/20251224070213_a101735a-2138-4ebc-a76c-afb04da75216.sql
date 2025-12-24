-- Add pause/alumni columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS paused_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS exit_reason TEXT,
ADD COLUMN IF NOT EXISTS reactivation_eligible_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS alumni_access_expires TIMESTAMPTZ;

-- Create index for account status filtering
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles(account_status);
CREATE INDEX IF NOT EXISTS idx_profiles_alumni_expires ON public.profiles(alumni_access_expires);