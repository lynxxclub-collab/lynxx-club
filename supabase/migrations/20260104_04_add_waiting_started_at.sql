BEGIN;

ALTER TABLE public.video_dates
ADD COLUMN IF NOT EXISTS waiting_started_at timestamptz;

COMMENT ON COLUMN public.video_dates.waiting_started_at IS
'Set when the first participant joins the call. Used for 5-minute no-show countdown and automated refunds.';

CREATE INDEX IF NOT EXISTS idx_video_dates_waiting_started_at
ON public.video_dates (waiting_started_at)
WHERE waiting_started_at IS NOT NULL;

COMMIT;