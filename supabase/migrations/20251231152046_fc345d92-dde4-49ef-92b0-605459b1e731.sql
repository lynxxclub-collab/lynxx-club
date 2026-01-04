-- ============================================
-- Video dates: call_type + credits_per_minute
-- ============================================

-- 1) Add call_type column (idempotent)
ALTER TABLE public.video_dates
ADD COLUMN IF NOT EXISTS call_type text;

-- 2) Normalize existing rows (so we can add NOT NULL safely)
UPDATE public.video_dates
SET call_type = 'video'
WHERE call_type IS NULL OR call_type NOT IN ('audio', 'video');

-- 3) Add constraint + default + not null (safe order)
ALTER TABLE public.video_dates
  ALTER COLUMN call_type SET DEFAULT 'video';

-- Add CHECK constraint only if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'video_dates_call_type_check'
      AND conrelid = 'public.video_dates'::regclass
  ) THEN
    ALTER TABLE public.video_dates
      ADD CONSTRAINT video_dates_call_type_check
      CHECK (call_type IN ('audio', 'video'));
  END IF;
END $$;

ALTER TABLE public.video_dates
  ALTER COLUMN call_type SET NOT NULL;


-- 4) Add credits_per_minute column (numeric snapshot)
ALTER TABLE public.video_dates
ADD COLUMN IF NOT EXISTS credits_per_minute numeric(10,4);

-- 5) Backfill credits_per_minute safely
-- Handles NULLs, 0 duration, and avoids division by zero.
UPDATE public.video_dates
SET credits_per_minute =
  CASE
    WHEN scheduled_duration IS NULL OR scheduled_duration <= 0 THEN 0
    WHEN credits_reserved IS NULL THEN 0
    ELSE ROUND((credits_reserved::numeric / scheduled_duration::numeric), 4)
  END
WHERE credits_per_minute IS NULL;

-- 6) Ensure no NULLs remain
UPDATE public.video_dates
SET credits_per_minute = 0
WHERE credits_per_minute IS NULL;

-- Optional: lock it to NOT NULL (recommended for snapshots)
ALTER TABLE public.video_dates
  ALTER COLUMN credits_per_minute SET DEFAULT 0;

ALTER TABLE public.video_dates
  ALTER COLUMN credits_per_minute SET NOT NULL;


-- 7) Index for call_type filtering
CREATE INDEX IF NOT EXISTS idx_video_dates_call_type
  ON public.video_dates (call_type);