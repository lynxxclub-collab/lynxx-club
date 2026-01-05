BEGIN;

DROP FUNCTION IF EXISTS public.refund_video_date_reservation(uuid, text);

CREATE OR REPLACE FUNCTION public.refund_video_date_reservation(
  p_video_date_id uuid,
  p_reason text DEFAULT 'cancelled'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vd record;
  v_res record;
  v_wallet record;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Lock video_date
  SELECT * INTO v_vd
  FROM public.video_dates
  WHERE id = p_video_date_id
  FOR UPDATE;

  IF v_vd IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Video date not found');
  END IF;

  -- Only participants can trigger (or service role bypasses auth anyway)
  IF auth.uid() <> v_vd.seeker_id AND auth.uid() <> v_vd.earner_id THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Lock ACTIVE reservation (if none, nothing to refund)
  SELECT * INTO v_res
  FROM public.credit_reservations
  WHERE video_date_id = p_video_date_id
    AND status = 'active'
  FOR UPDATE;

  IF v_res IS NULL THEN
    -- already refunded or never reserved
    UPDATE public.video_dates
      SET status = CASE
        WHEN p_reason = 'no_show' THEN 'no_show'
        ELSE 'cancelled'
      END,
      updated_at = now()
    WHERE id = p_video_date_id;

    RETURN json_build_object('success', true, 'refunded', false, 'message', 'No active reservation found');
  END IF;

  -- Lock seeker wallet
  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE user_id = v_vd.seeker_id
  FOR UPDATE;

  IF v_wallet IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Seeker wallet not found');
  END IF;

  -- Refund credits
  UPDATE public.wallets
  SET credit_balance = COALESCE(credit_balance, 0) + COALESCE(v_res.credits_amount, 0),
      updated_at = now()
  WHERE user_id = v_vd.seeker_id;

  -- Mark reservation released
  UPDATE public.credit_reservations
  SET status = 'released',
      released_at = now()
  WHERE id = v_res.id;

  -- Record transaction (credits only)
  INSERT INTO public.transactions (
    user_id,
    transaction_type,
    credits_amount,
    description,
    status
  ) VALUES (
    v_vd.seeker_id,
    'video_date_refund',
    COALESCE(v_res.credits_amount, 0),
    'Refund: video date ' || p_reason,
    'completed'
  );

  -- Update video_date status
  UPDATE public.video_dates
  SET status = CASE
    WHEN p_reason = 'no_show' THEN 'no_show'
    ELSE 'cancelled'
  END,
  updated_at = now()
  WHERE id = p_video_date_id;

  RETURN json_build_object('success', true, 'refunded', true, 'credits_refunded', v_res.credits_amount);
END;
$$;

COMMENT ON FUNCTION public.refund_video_date_reservation(uuid, text)
IS 'Atomically releases an ACTIVE credit reservation and refunds the seeker wallet. Safe to call multiple times.';

COMMIT;