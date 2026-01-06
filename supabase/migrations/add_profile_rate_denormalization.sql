-- ============================================
-- MIGRATION: add_profile_rate_denormalization.sql
-- DESCRIPTION: Adds rate columns to profiles for faster
--              frontend access and syncs with earner_services.
-- ============================================

-- 1. Add columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS video_15min_rate INT,
ADD COLUMN IF NOT EXISTS video_30min_rate INT,
ADD COLUMN IF NOT EXISTS video_60min_rate INT,
ADD COLUMN IF NOT EXISTS video_90min_rate INT;

-- 2. Function to update profile rates when earner_services changes
CREATE OR REPLACE FUNCTION sync_profile_rates()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        UPDATE public.profiles
        SET 
            video_15min_rate = (SELECT video_price_credits FROM public.earner_services WHERE earner_id = NEW.earner_id AND duration_minutes = 15),
            video_30min_rate = (SELECT video_price_credits FROM public.earner_services WHERE earner_id = NEW.earner_id AND duration_minutes = 30),
            video_60min_rate = (SELECT video_price_credits FROM public.earner_services WHERE earner_id = NEW.earner_id AND duration_minutes = 60),
            video_90min_rate = (SELECT video_price_credits FROM public.earner_services WHERE earner_id = NEW.earner_id AND duration_minutes = 90)
        WHERE id = NEW.earner_id;
        RETURN NEW;
    END IF;
    IF (TG_OP = 'DELETE') THEN
        UPDATE public.profiles
        SET 
            video_15min_rate = NULL,
            video_30min_rate = NULL,
            video_60min_rate = NULL,
            video_90min_rate = NULL
        WHERE id = OLD.earner_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. Create Trigger
DROP TRIGGER IF EXISTS trigger_sync_profile_rates ON public.earner_services;
CREATE TRIGGER trigger_sync_profile_rates
AFTER INSERT OR UPDATE OR DELETE ON public.earner_services
FOR EACH ROW EXECUTE FUNCTION sync_profile_rates();

-- 4. Backfill existing data (Run once)
UPDATE public.profiles p
SET 
    video_15min_rate = s.video_price_credits
FROM public.earner_services s
WHERE p.id = s.earner_id AND s.duration_minutes = 15;

UPDATE public.profiles p
SET 
    video_30min_rate = s.video_price_credits
FROM public.earner_services s
WHERE p.id = s.earner_id AND s.duration_minutes = 30;

UPDATE public.profiles p
SET 
    video_60min_rate = s.video_price_credits
FROM public.earner_services s
WHERE p.id = s.earner_id AND s.duration_minutes = 60;

UPDATE public.profiles p
SET 
    video_90min_rate = s.video_price_credits
FROM public.earner_services s
WHERE p.id = s.earner_id AND s.duration_minutes = 90;