-- Add notification preference columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notify_payouts boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_likes boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS push_subscription jsonb DEFAULT null;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.notify_payouts IS 'Whether user wants payout status email notifications';
COMMENT ON COLUMN public.profiles.notify_likes IS 'Whether user wants profile like email notifications';
COMMENT ON COLUMN public.profiles.push_subscription IS 'Web push subscription data for browser notifications';