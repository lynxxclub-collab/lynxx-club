-- =============================================================================
-- UNLOCK IMAGE (WALLETS SOURCE OF TRUTH) - SAFE/ATOMIC
-- Cost: 10 credits (per your rule: images cost 10)
-- =============================================================================

-- 1) Make sure we cannot double-unlock per user/message (safety)
ALTER TABLE public.image_unlocks
ADD CONSTRAINT IF NOT EXISTS image_unlocks_message_user_unique
UNIQUE (message_id, unlocked_by);

-- 2) Recreate the function
CREATE OR REPLACE FUNCTION public.unlock_image(p_message_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_credits_cost INTEGER := 10; -- images cost 10 credits
  v_earner_amount NUMERIC(10, 2);
  v_platform_fee NUMERIC(10, 2);
  v_user_balance INTEGER;
  v_message RECORD;
  v_unlock_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get message details
  SELECT * INTO v_message
  FROM public.messages
  WHERE id = p_message_id;

  IF v_message IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Message not found');
  END IF;

  IF v_message.message_type <> 'image' THEN
    RETURN json_build_object('success', false, 'error', 'Not an image message');
  END IF;

  IF v_message.recipient_id <> v_user_id THEN
    RETURN json_build_object('success', false, 'error', 'You can only unlock images sent to you');
  END IF;

  -- If already unlocked, return success without charging
  IF EXISTS (
    SELECT 1
    FROM public.image_unlocks
    WHERE message_id = p_message_id
      AND unlocked_by = v_user_id
  ) THEN
    RETURN json_build_object('success', true, 'already_unlocked', true);
  END IF;

  -- Ensure user has a wallet row (important)
  INSERT INTO public.wallets (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Lock wallet row & check balance
  SELECT credit_balance INTO v_user_balance
  FROM public.wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_user_balance IS NULL OR v_user_balance < v_credits_cost THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient credits',
      'required', v_credits_cost,
      'balance', COALESCE(v_user_balance, 0)
    );
  END IF;

  -- Calculate split (70/30) at $0.10 per credit
  v_earner_amount := ROUND(v_credits_cost * 0.10 * 0.70, 2);
  v_platform_fee  := ROUND(v_credits_cost * 0.10 * 0.30, 2);

  -- Record unlock FIRST (atomic protection against double clicks / concurrency)
  BEGIN
    INSERT INTO public.image_unlocks (message_id, unlocked_by, credits_spent)
    VALUES (p_message_id, v_user_id, v_credits_cost)
    RETURNING id INTO v_unlock_id;
  EXCEPTION WHEN unique_violation THEN
    -- Another request unlocked it first; don't charge twice
    RETURN json_build_object('success', true, 'already_unlocked', true);
  END;

  -- Deduct credits from viewer wallet
  UPDATE public.wallets
  SET credit_balance = credit_balance - v_credits_cost,
      updated_at = now()
  WHERE user_id = v_user_id;

  -- Ensure sender (earner) has wallet, add pending earnings
  INSERT INTO public.wallets (user_id, credit_balance, pending_earnings, available_earnings)
  VALUES (v_message.sender_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.wallets
  SET pending_earnings = pending_earnings + v_earner_amount,
      updated_at = now()
  WHERE user_id = v_message.sender_id;

  -- Transaction logs
  INSERT INTO public.transactions (user_id, transaction_type, credits_amount, description)
  VALUES (v_user_id, 'image_unlock', -v_credits_cost, 'Unlocked image');

  INSERT INTO public.transactions (user_id, transaction_type, credits_amount, usd_amount, description)
  VALUES (v_message.sender_id, 'earning', 0, v_earner_amount, 'Image unlock earnings');

  RETURN json_build_object(
    'success', true,
    'credits_spent', v_credits_cost,
    'new_balance', v_user_balance - v_credits_cost
  );
END;
$$;