-- Prevent duplicate credit reservations from double-charging a user
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
  v_existing_amount INTEGER;
BEGIN
  -- SECURITY: Verify caller is the user reserving credits
  IF p_user_id != auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Ensure wallet exists
  INSERT INTO public.wallets (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Lock wallet row
  SELECT credit_balance INTO v_user_balance
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- If there is already an active reservation for this video date, do NOT charge again
  SELECT cr.credits_amount INTO v_existing_amount
  FROM public.credit_reservations cr
  WHERE cr.user_id = p_user_id
    AND cr.video_date_id = p_video_date_id
    AND cr.status = 'active'
  LIMIT 1;

  IF v_existing_amount IS NOT NULL THEN
    RETURN json_build_object(
      'success', true,
      'already_reserved', true,
      'reserved_amount', v_existing_amount,
      'balance', COALESCE(v_user_balance, 0)
    );
  END IF;

  -- Check user has enough credits
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