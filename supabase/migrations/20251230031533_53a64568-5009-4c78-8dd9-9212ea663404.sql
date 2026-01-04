-- =========================================================
-- VIDEO DATE RECORDING SUPPORT
-- =========================================================

-- 1. Add consent flags (explicit + indexed for fast checks)
ALTER TABLE public.video_dates
ADD COLUMN IF NOT EXISTS recording_consent_seeker BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS recording_consent_earner BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_video_dates_recording_consent
ON public.video_dates (recording_consent_seeker, recording_consent_earner);

-- 2. Add recording metadata
ALTER TABLE public.video_dates
ADD COLUMN IF NOT EXISTS recording_id TEXT,
ADD COLUMN IF NOT EXISTS recording_url TEXT,
ADD COLUMN IF NOT EXISTS recording_started_at TIMESTAMPTZ;

-- 3. Guardrail: recording cannot exist unless BOTH consented
ALTER TABLE public.video_dates
DROP CONSTRAINT IF EXISTS video_dates_recording_requires_consent;

ALTER TABLE public.video_dates
ADD CONSTRAINT video_dates_recording_requires_consent
CHECK (
  recording_id IS NULL
  OR (
    recording_consent_seeker = true
    AND recording_consent_earner = true
  )
);

-- 4. Guardrail: URL cannot exist without recording_id
ALTER TABLE public.video_dates
DROP CONSTRAINT IF EXISTS video_dates_recording_url_requires_id;

ALTER TABLE public.video_dates
ADD CONSTRAINT video_dates_recording_url_requires_id
CHECK (
  recording_url IS NULL
  OR recording_id IS NOT NULL
);