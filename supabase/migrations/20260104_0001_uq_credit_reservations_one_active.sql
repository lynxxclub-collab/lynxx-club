BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uq_credit_reservations_one_active_per_video_date
ON public.credit_reservations (video_date_id)
WHERE status = 'active';

COMMIT;