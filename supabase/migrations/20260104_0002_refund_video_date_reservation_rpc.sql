BEGIN;

DROP FUNCTION IF EXISTS public.refund_video_date_reservation(uuid, text);

CREATE OR REPLACE FUNCTION public.refund_video_date_reservation(
  p_video_date_id uuid,
  p_reason text DEFAULT 'user_cancelled'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vd record;
  v_total_refunded int := 0;
BEGIN
  -- Lock the video_date row
  SELECT * INTO v_vd
  FROM public.video_dates
  WHERE id = p_video_date_id
  FOR UPDATE;

  IF v_vd IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Video date not found');
  END IF;

  -- Refund ALL active reservations (handles historical duplicates safely)
  WITH locked AS (
    SELECT id, user_id, credits_amount
    FROM public.credit_reservations
    WHERE video_date_id = p_video_date_id
      AND status = 'active'
    FOR UPDATE
  ),
  wallet_upd AS (
    UPDATE public.wallets w
    SET credit_balance = COALESCE(w.credit_balance,0) + COALESCE(l.credits_amount,0),
        updated_at = now()
    FROM locked l
    WHERE w.user_id = l.user_id
    RETURNING l.credits_amount
  ),
  res_upd AS (
    UPDATE public.credit_reservations r
    SET status = 'released',
        released_at = now()
    FROM locked l
    WHERE r.id = l.id
    RETURNING l.user_id, l.credits_amount
  )
  SELECT COALESCE(SUM(credits_amount),0)::int INTO v_total_refunded
  FROM res_upd;

  IF v_total_refunded > 0 THEN
    INSERT INTO public.transactions (user_id, transaction_type, credits_amount, description, status)
    VALUES (
      v_vd.seeker_id,
      'video_date_refund',
      v_total_refunded,
      'Credits refunded: ' || p_reason,
      'completed'
    );
  END IF;

  UPDATE public.video_dates
  SET status = 'cancelled',
      cancelled_at = now(),
      updated_at = now()
  WHERE id = p_video_date_id;

  RETURN json_build_object('success', true, 'credits_refunded', v_total_refunded);
END;
$$;

COMMIT;