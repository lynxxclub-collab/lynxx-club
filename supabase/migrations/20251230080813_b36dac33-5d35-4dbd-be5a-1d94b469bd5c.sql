-- Add gifting onboarding tracking columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS gifting_onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS gifting_onboarding_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auto_thank_you_enabled BOOLEAN DEFAULT false;