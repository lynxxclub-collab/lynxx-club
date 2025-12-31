-- Use wallets as the source of truth for video-date credit reservations/refunds

CREATE OR REPLACE FUNCTION public.reserve_credits_for_video_date(
  p_user_id uuid,
  p_video_date_id uuid,
  p_credits_amount integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_balance INTEGER;
BEGIN
  -- SECURITY: Verify caller is the user reserving credits
  IF p_user_id != auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Ensure wallet exists
  INSERT INTO public.wallets (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Check user has enough credits
  SELECT credit_balance INTO v_user_balance
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_user_balance IS NULL OR v_user_balance < p_credits_amount THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient credits',
      'required', p_credits_amount,
      'balance', COALESCE(v_user_balance, 0)
    );
  END IF;

  -- Deduct credits from user (reservation)
  UPDATE public.wallets
  SET credit_balance = credit_balance - p_credits_amount,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Create reservation record
  INSERT INTO public.credit_reservations (user_id, video_date_id, credits_amount, status)
  VALUES (p_user_id, p_video_date_id, p_credits_amount, 'active');

  -- Create transaction record
  INSERT INTO public.transactions (user_id, transaction_type, credits_amount, description, status)
  VALUES (p_user_id, 'video_date_reservation', -p_credits_amount, 'Credits reserved for video date', 'completed');

  RETURN json_build_object('success', true, 'new_balance', v_user_balance - p_credits_amount);
END;
$$;


CREATE OR REPLACE FUNCTION public.release_credit_reservation(
  p_video_date_id uuid,
  p_reason text DEFAULT 'cancelled'::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_reservation RECORD;
  v_caller_id UUID;
  v_video_date RECORD;
BEGIN
  v_caller_id := auth.uid();

  -- Get video date to verify caller is part of it
  SELECT * INTO v_video_date
  FROM public.video_dates
  WHERE id = p_video_date_id;

  IF v_video_date IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Video date not found');
  END IF;

  -- Verify caller is part of the video date
  IF v_caller_id != v_video_date.seeker_id AND v_caller_id != v_video_date.earner_id THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Find active reservation
  SELECT * INTO v_reservation
  FROM public.credit_reservations
  WHERE video_date_id = p_video_date_id
    AND status = 'active'
  FOR UPDATE;

  IF v_reservation IS NULL THEN
    -- No active reservation to refund
    RETURN json_build_object('success', true, 'message', 'No active reservation found');
  END IF;

  -- Ensure wallet exists
  INSERT INTO public.wallets (user_id)
  VALUES (v_reservation.user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Refund credits to user's wallet
  UPDATE public.wallets
  SET credit_balance = credit_balance + v_reservation.credits_amount,
      updated_at = now()
  WHERE user_id = v_reservation.user_id;

  -- Update reservation status
  UPDATE public.credit_reservations
  SET status = 'refunded', released_at = now()
  WHERE id = v_reservation.id;

  -- Create refund transaction record
  INSERT INTO public.transactions (user_id, transaction_type, credits_amount, description, status)
  VALUES (
    v_reservation.user_id,
    'video_date_refund',
    v_reservation.credits_amount,
    'Credits refunded: ' || p_reason,
    'completed'
  );

  RETURN json_build_object('success', true, 'credits_refunded', v_reservation.credits_amount);
END;
$$;
