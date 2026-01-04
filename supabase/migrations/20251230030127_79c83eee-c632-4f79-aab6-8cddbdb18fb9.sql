-- =========================================================
-- CREDIT RESERVATIONS (WALLETS SOURCE OF TRUTH)
-- =========================================================

-- 1) TABLE: credit_reservations
CREATE TABLE IF NOT EXISTS public.credit_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  video_date_id UUID NOT NULL REFERENCES public.video_dates(id) ON DELETE CASCADE,
  credits_amount INTEGER NOT NULL CHECK (credits_amount > 0),
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','charged','refunded'))
);

-- (Optional but recommended) prevent duplicate active reservations per video_date
CREATE UNIQUE INDEX IF NOT EXISTS uq_credit_reservations_active_per_video_date
ON public.credit_reservations (video_date_id)
WHERE status = 'active';

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_credit_reservations_video_date
ON public.credit_reservations(video_date_id);

CREATE INDEX IF NOT EXISTS idx_credit_reservations_user_status
ON public.credit_reservations(user_id, status);

-- FK to wallets user_id (matches your money source of truth)
ALTER TABLE public.credit_reservations
DROP CONSTRAINT IF EXISTS credit_reservations_user_id_fkey;

ALTER TABLE public.credit_reservations
ADD CONSTRAINT credit_reservations_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.wallets(user_id) ON DELETE CASCADE;

-- 2) RLS
ALTER TABLE public.credit_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own reservations" ON public.credit_reservations;
DROP POLICY IF EXISTS "Users can create their own reservations" ON public.credit_reservations;

CREATE POLICY "Users can view their own reservations"
ON public.credit_reservations
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reservations"
ON public.credit_reservations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- (Optional) Let users update their own reservations ONLY for client-side display changes (usually you don't need this)
-- Keep OFF unless you have a UI that updates reservations directly.
-- CREATE POLICY "Users can update their own reservations"
-- ON public.credit_reservations
-- FOR UPDATE
-- TO authenticated
-- USING (auth.uid() = user_id)
-- WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- 3) FUNCTION: reserve credits (WALLETS)
-- =========================================================
CREATE OR REPLACE FUNCTION public.reserve_credits_for_video_date(
  p_user_id UUID,
  p_video_date_id UUID,
  p_credits_amount INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_balance INTEGER;
BEGIN
  -- SECURITY: caller must match
  IF p_user_id != auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  IF p_credits_amount IS NULL OR p_credits_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid credits amount');
  END IF;

  -- Ensure wallet exists
  INSERT INTO public.wallets (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Prevent duplicate active reservation for same video date (fast-path)
  IF EXISTS (
    SELECT 1
    FROM public.credit_reservations
    WHERE video_date_id = p_video_date_id
      AND status = 'active'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Reservation already exists');
  END IF;

  -- Lock wallet row & check balance
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

  -- Deduct credits (reservation)
  UPDATE public.wallets
  SET credit_balance = credit_balance - p_credits_amount,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Create reservation record
  INSERT INTO public.credit_reservations (user_id, video_date_id, credits_amount, status)
  VALUES (p_user_id, p_video_date_id, p_credits_amount, 'active');

  -- Audit transaction
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
    'reserved', p_credits_amount,
    'new_balance', v_user_balance - p_credits_amount
  );
END;
$$;

-- =========================================================
-- 4) FUNCTION: release reservation (refund to WALLETS)
-- =========================================================
CREATE OR REPLACE FUNCTION public.release_credit_reservation(
  p_video_date_id UUID,
  p_reason TEXT DEFAULT 'cancelled'
)
RETURNS JSON
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

  IF v_caller_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Caller must be part of the video date
  SELECT * INTO v_video_date
  FROM public.video_dates
  WHERE id = p_video_date_id;

  IF v_video_date IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Video date not found');
  END IF;

  IF v_caller_id != v_video_date.seeker_id AND v_caller_id != v_video_date.earner_id THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Lock reservation
  SELECT * INTO v_reservation
  FROM public.credit_reservations
  WHERE video_date_id = p_video_date_id
    AND status = 'active'
  FOR UPDATE;

  IF v_reservation IS NULL THEN
    RETURN json_build_object('success', true, 'message', 'No active reservation found');
  END IF;

  -- Ensure wallet exists
  INSERT INTO public.wallets (user_id)
  VALUES (v_reservation.user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Refund credits
  UPDATE public.wallets
  SET credit_balance = credit_balance + v_reservation.credits_amount,
      updated_at = now()
  WHERE user_id = v_reservation.user_id;

  -- Mark refunded
  UPDATE public.credit_reservations
  SET status = 'refunded',
      released_at = now()
  WHERE id = v_reservation.id;

  -- Audit transaction
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

-- =========================================================
-- 5) FUNCTION: mark reservation charged (no refund, just status)
-- =========================================================
CREATE OR REPLACE FUNCTION public.mark_reservation_charged(
  p_video_date_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_reservation RECORD;
BEGIN
  -- Lock reservation
  SELECT * INTO v_reservation
  FROM public.credit_reservations
  WHERE video_date_id = p_video_date_id
    AND status = 'active'
  FOR UPDATE;

  IF v_reservation IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No active reservation found');
  END IF;

  UPDATE public.credit_reservations
  SET status = 'charged',
      released_at = now()
  WHERE id = v_reservation.id;

  RETURN json_build_object('success', true);
END;
$$;