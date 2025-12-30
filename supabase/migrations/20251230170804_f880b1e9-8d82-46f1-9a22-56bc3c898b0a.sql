-- Add notify_matches column (used by match_received notification type)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notify_matches BOOLEAN NOT NULL DEFAULT true;

-- Add notify_gifts column for the gift_received notification type
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notify_gifts BOOLEAN NOT NULL DEFAULT true;