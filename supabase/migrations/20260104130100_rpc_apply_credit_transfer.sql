BEGIN;

DROP FUNCTION IF EXISTS public.apply_credit_transfer(uuid, uuid, int, int, text, uuid, uuid);

CREATE OR REPLACE FUNCTION public.apply_credit_transfer(
  p_seeker_id uuid,
  p_earner_id uuid,
  p_credits_total int,
  p_platform_fee int,
  p_kind text,                 -- 'video' | 'message'
  p_video_date_id uuid DEFAULT NULL,
  p_message_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_to_earner int;
  v_seeker_wallet record;
  v_earner_wallet record;
BEGIN
  IF p_credits_total <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'credits_total must be > 0');
  END IF;

  IF p_platform_fee < 0 OR p_platform_fee > p_credits_total THEN
    RETURN json_build_object('success', false, 'error', 'invalid platform_fee');
  END IF;

  IF p_kind NOT IN ('video','message') THEN
    RETURN json_build_object('success', false, 'error', 'invalid kind');
  END IF;

  v_to_earner := p_credits_total - p_platform_fee;

  -- Lock both wallets to prevent race conditions
  SELECT * INTO v_seeker_wallet FROM public.wallets WHERE user_id = p_seeker_id FOR UPDATE;
  SELECT * INTO v_earner_wallet FROM public.wallets WHERE user_id = p_earner_id FOR UPDATE;

  IF v_seeker_wallet IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'seeker wallet missing');
  END IF;

  IF v_earner_wallet IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'earner wallet missing');
  END IF;

  IF v_seeker_wallet.credits_balance < p_credits_total THEN
    RETURN json_build_object('success', false, 'error', 'insufficient credits');
  END IF;

  -- Prevent double-charge for video (or double-charge per message_id if you pass it)
  IF p_kind = 'video' AND p_video_date_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.credit_ledger
      WHERE video_date_id = p_video_date_id AND kind = 'video'
    ) THEN
      RETURN json_build_object('success', true, 'already_charged', true);
    END IF;
  END IF;

  -- Debit seeker
  UPDATE public.wallets
    SET credits_balance = credits_balance - p_credits_total
  WHERE user_id = p_seeker_id;

  -- Credit earner (pending)
  UPDATE public.wallets
    SET earnings_credits_pending = earnings_credits_pending + v_to_earner
  WHERE user_id = p_earner_id;

  -- Write ledger row
  INSERT INTO public.credit_ledger(
    seeker_id, earner_id,
    credits_total, credits_to_earner, credits_platform_fee,
    kind, video_date_id, message_id
  )
  VALUES (
    p_seeker_id, p_earner_id,
    p_credits_total, v_to_earner, p_platform_fee,
    p_kind, p_video_date_id, p_message_id
  );

  RETURN json_build_object(
    'success', true,
    'credits_total', p_credits_total,
    'credits_to_earner', v_to_earner,
    'platform_fee', p_platform_fee
  );
END;
$$;

COMMIT;