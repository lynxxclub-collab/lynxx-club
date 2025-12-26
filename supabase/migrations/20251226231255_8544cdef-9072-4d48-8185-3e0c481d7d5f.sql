-- Add stripe_onboarded_at column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_onboarded_at TIMESTAMP WITH TIME ZONE;

-- Add index for stripe_account_id lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_account_id ON public.profiles(stripe_account_id);