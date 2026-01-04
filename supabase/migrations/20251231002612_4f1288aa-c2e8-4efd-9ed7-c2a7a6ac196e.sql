/* ============================================================================
   VIDEO DATE CREDIT RESERVATIONS (Wallets = source of truth)
   - Only the SEEKER can reserve credits (the payer)
   - One active reservation per video_date
   - Refunds are idempotent (safe to call multiple times)
   - Wallet locking avoids race conditions
   ============================================================================ */

-- 1) Guarantee only one ACTIVE reservation per video_date
-- (Prevents duplicate charges)
CREATE UNIQUE INDEX IF NOT EXISTS ux_credit_reservations_one_active_per_video_date
ON public.credit_reservations (video_date_id)
WHERE status = 'active';


/* ============================================================================
   reserve_credits_for_video_date
   - Validates caller == p_user_id
   - Validates p_user_id is the SEEKER for the video_date
   - If an active reservation already exists, returns success without charging again
   ============================================================================ */
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
  v_user_balance integer;
  v_video_date record;
  v_existing record;
BEGIN
  -- SECURITY: caller must match
  IF auth.uid() IS NULL OR p_user_id != auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  IF p_credits_amount IS NULL OR p_credits_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'credits_amount must be > 0');
  END IF;

  -- Validate the video date exists AND caller is the seeker (payer)
  SELECT id, seeker_id, earner_id, status
  INTO v_video_date
  FROM public.video_dates
  WHERE id = p_video_date_id;

  IF v_video_date IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Video date not found');
  END IF;

  IF v_video_date.seeker_id != p_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Only the seeker can reserve credits');
  END IF;

  -- If an active reservation already exists, do NOT double charge
  SELECT *
  INTO v_existing
  FROM public.credit_reservations
  WHERE video_date_id = p_video_date_id
    AND status = 'active'
  FOR UPDATE;

  IF v_existing IS NOT NULL THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Reservation already active',
      'credits_reserved', v_existing.credits_amount
    );
  END IF;

  -- Ensure wallet exists
  INSERT INTO public.wallets (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Lock wallet row
  SELECT credit_balance
  INTO v_user_balance
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

  -- Deduct credits (reservation)
  UPDATE public.wallets
  SET credit_balance = credit_balance - p_credits_amount,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Create reservation
  INSERT INTO public.credit_reservations (user_id, video_date_id, credits_amount, status)
  VALUES (p_user_id, p_video_date_id, p_credits_amount, 'active');

  -- Transaction log
  INSERT INTO public.transactions (user_id, transaction_type, credits_amount, description, status)
  VALUES (
    p_user_id,
    'video_date_reservation',
    -p_credits_amount,
    'Credits reserved for video date',
    'completed'
  );

  RETURN json_build_object(
    'success', true,
    'credits_reserved', p_credits_amount,
    'new_balance', v_user_balance - p_credits_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reserve_credits_for_video_date(uuid, uuid, integer) TO authenticated;


/* ============================================================================
   release_credit_reservation
   - Allows either party to request a release
   - Refund ONLY goes to the reservation owner (seeker)
   - Idempotent: if already refunded/none exists => success
   ============================================================================ */
CREATE OR REPLACE FUNCTION public.release_credit_reservation(
  p_video_date_id uuid,
  p_reason text DEFAULT 'cancelled'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_reservation record;
  v_video_date record;
  v_caller_id uuid;
BEGIN
  v_caller_id := auth.uid();

  IF v_caller_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Ensure video date exists & caller is participant
  SELECT id, seeker_id, earner_id
  INTO v_video_date
  FROM public.video_dates
  WHERE id = p_video_date_id;

  IF v_video_date IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Video date not found');
  END IF;

  IF v_caller_id != v_video_date.seeker_id AND v_caller_id != v_video_date.earner_id THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Lock active reservation (if any)
  SELECT *
  INTO v_reservation
  FROM public.credit_reservations
  WHERE video_date_id = p_video_date_id
    AND status = 'active'
  FOR UPDATE;

  IF v_reservation IS NULL THEN
    -- Idempotent success
    RETURN json_build_object('success', true, 'message', 'No active reservation found');
  END IF;

  -- Ensure wallet exists for reservation owner (should be seeker)
  INSERT INTO public.wallets (user_id)
  VALUES (v_reservation.user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Lock wallet row
  PERFORM 1
  FROM public.wallets
  WHERE user_id = v_reservation.user_id
  FOR UPDATE;

  -- Refund credits
  UPDATE public.wallets
  SET credit_balance = credit_balance + v_reservation.credits_amount,
      updated_at = now()
  WHERE user_id = v_reservation.user_id;

  -- Mark reservation refunded
  UPDATE public.credit_reservations
  SET status = 'refunded',
      released_at = now()
  WHERE id = v_reservation.id;

  -- Transaction log
  INSERT INTO public.transactions (user_id, transaction_type, credits_amount, description, status)
  VALUES (
    v_reservation.user_id,
    'video_date_refund',
    v_reservation.credits_amount,
    'Credits refunded: ' || COALESCE(p_reason, 'cancelled'),
    'completed'
  );

  RETURN json_build_object(
    'success', true,
    'credits_refunded', v_reservation.credits_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_credit_reservation(uuid, text) TO authenticated;