BEGIN;

ALTER TABLE public.video_dates
ADD COLUMN IF NOT EXISTS daily_room_name TEXT,
ADD COLUMN IF NOT EXISTS daily_room_url  TEXT,
ADD COLUMN IF NOT EXISTS daily_room_created_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS grace_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS actual_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS actual_end TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uq_video_dates_daily_room_name
ON public.video_dates (daily_room_name)
WHERE daily_room_name IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_video_dates_daily_room_url
ON public.video_dates (daily_room_url)
WHERE daily_room_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_video_dates_grace_deadline
ON public.video_dates (grace_deadline)
WHERE grace_deadline IS NOT NULL;

COMMIT;