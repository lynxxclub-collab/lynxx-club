-- Add suspension and ban columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS suspend_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ban_reason TEXT,
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles(account_status);
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON public.profiles(user_type);