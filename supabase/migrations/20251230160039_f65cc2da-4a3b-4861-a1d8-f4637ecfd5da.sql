-- ============================================================
-- FIX: unlock_image atomic charging + safe refund processor
-- ============================================================

-- 0) Ensure unique constraint exists (safe even if already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'image_unlocks_message_user_unique'
  ) THEN
    ALTER TABLE public.image_unlocks
      ADD CONSTRAINT image_unlocks_message_user_unique
      UNIQUE (message_id, unlocked_by);
  END IF;
END $$;


-- 1) Messages table fields for refund system (idempotent)
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reply_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS refund_status text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

-- If you rely on is_billable_volley and it might not exist, uncomment:
-- ALTER TABLE public.messages
--   ADD COLUMN IF NOT EXISTS is_billable_volley boolean NOT NULL DEFAULT false;

-- Index for refund job scans (idempotent)
CREATE INDEX IF NOT EXISTS idx_messages_reply_deadline
ON public.messages (reply_deadline)
WHERE reply_deadline IS NOT NULL
  AND refund_status IS NULL
  AND is_billable_volley = true;


-- ============================================================
-- 2) unlock_image: ONLY charges if unlock succeeds
--    ATOMIC: either everything happens, or nothing happens.
-- ============================================================
CREATE OR REPLACE FUNCTION public.unlock_image(p_message_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_credits_cost integer := 10; -- ✅ image unlock cost = 10 credits
  v_earner_amount numeric(10,2);
  v_platform_fee numeric(10,2);
  v_user_balance integer;
  v_message record;
  v_unlock_id uuid;
  v_rowcount integer;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Pull the message
  SELECT *
  INTO v_message
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

  -- Ensure wallets exist
  INSERT INTO public.wallets (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.wallets (user_id, credit_balance, pending_earnings, available_earnings)
  VALUES (v_message.sender_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Lock both wallets to prevent race conditions
  SELECT credit_balance
  INTO v_user_balance
  FROM public.wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  -- If already unlocked, return immediately (no charge)
  IF EXISTS (
    SELECT 1
    FROM public.image_unlocks
    WHERE message_id = p_message_id
      AND unlocked_by = v_user_id
  ) THEN
    RETURN json_build_object('success', true, 'already_unlocked', true);
  END IF;

  IF v_user_balance IS NULL OR v_user_balance < v_credits_cost THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient credits',
      'required', v_credits_cost,
      'balance', COALESCE(v_user_balance, 0)
    );
  END IF;

  -- Earnings split (credits -> USD is still 0.10 per credit)
  v_earner_amount := ROUND(v_credits_cost * 0.10 * 0.70, 2);
  v_platform_fee := ROUND(v_credits_cost * 0.10 * 0.30, 2);

  -- ✅ ATOMIC BLOCK:
  -- We deduct credits + record unlock + add earnings + transactions.
  -- If anything fails, raise exception => everything rolls back.
  BEGIN
    -- Deduct credits
    UPDATE public.wallets
    SET credit_balance = credit_balance - v_credits_cost,
        updated_at = now()
    WHERE user_id = v_user_id;

    GET DIAGNOSTICS v_rowcount = ROW_COUNT;
    IF v_rowcount <> 1 THEN
      RAISE EXCEPTION 'Failed to deduct credits (wallet missing?)';
    END IF;

    -- Record unlock (unique constraint prevents duplicates)
    INSERT INTO public.image_unlocks (message_id, unlocked_by, credits_spent)
    VALUES (p_message_id, v_user_id, v_credits_cost)
    ON CONFLICT (message_id, unlocked_by) DO NOTHING
    RETURNING id INTO v_unlock_id;

    -- If conflict happened (another concurrent request), refund our deduction by raising rollback
    IF v_unlock_id IS NULL THEN
      RAISE EXCEPTION 'Unlock already exists (concurrent)'; -- triggers rollback
    END IF;

    -- Add pending earnings to sender (earner)
    UPDATE public.wallets
    SET pending_earnings = pending_earnings + v_earner_amount,
        updated_at = now()
    WHERE user_id = v_message.sender_id;

    GET DIAGNOSTICS v_rowcount = ROW_COUNT;
    IF v_rowcount <> 1 THEN
      RAISE EXCEPTION 'Failed to credit earner pending earnings';
    END IF;

    -- Transactions
    INSERT INTO public.transactions (user_id, transaction_type, credits_amount, description, status)
    VALUES (v_user_id, 'image_unlock', -v_credits_cost, 'Unlocked image', 'completed');

    INSERT INTO public.transactions (user_id, transaction_type, credits_amount, usd_amount, description, status)
    VALUES (v_message.sender_id, 'earning', 0, v_earner_amount, 'Image unlock earnings', 'completed');

  EXCEPTION
    WHEN OTHERS THEN
      -- If the exception was due to concurrent unlock, return "already_unlocked"
      IF SQLERRM ILIKE '%Unlock already exists%' THEN
        RETURN json_build_object('success', true, 'already_unlocked', true);
      END IF;

      -- Any other exception => safe error
      RETURN json_build_object('success', false, 'error', 'Unlock failed', 'details', SQLERRM);
  END;

  RETURN json_build_object(
    'success', true,
    'credits_spent', v_credits_cost,
    'new_balance', v_user_balance - v_credits_cost
  );
END;
$function$;


-- ============================================================
-- 3) Refund processor: concurrency-safe, idempotent
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_expired_message_refunds()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_processed_count integer := 0;
  v_message record;
  v_rowcount integer;
BEGIN
  -- Lock rows to prevent double-processing (SKIP LOCKED)
  FOR v_message IN
    SELECT
      m.id,
      m.conversation_id,
      m.sender_id,
      m.recipient_id,
      m.credits_cost,
      m.earner_amount,
      m.created_at
    FROM public.messages m
    WHERE m.is_billable_volley = true
      AND m.reply_deadline IS NOT NULL
      AND m.reply_deadline < now()
      AND m.refund_status IS NULL
      AND m.credits_cost > 0
      AND NOT EXISTS (
        SELECT 1
        FROM public.messages reply
        WHERE reply.conversation_id = m.conversation_id
          AND reply.sender_id = m.recipient_id
          AND reply.created_at > m.created_at
      )
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Mark message as refunded FIRST (gate). If someone else got it first, skip.
    UPDATE public.messages
    SET refund_status = 'refunded',
        refunded_at = now()
    WHERE id = v_message.id
      AND refund_status IS NULL;

    GET DIAGNOSTICS v_rowcount = ROW_COUNT;
    IF v_rowcount <> 1 THEN
      CONTINUE;
    END IF;

    -- Ensure wallets exist
    INSERT INTO public.wallets (user_id)
    VALUES (v_message.sender_id)
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.wallets (user_id, credit_balance, pending_earnings, available_earnings)
    VALUES (v_message.recipient_id, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    -- Refund credits to sender
    UPDATE public.wallets
    SET credit_balance = credit_balance + v_message.credits_cost,
        updated_at = now()
    WHERE user_id = v_message.sender_id;

    -- Remove pending earnings from recipient (earner)
    UPDATE public.wallets
    SET pending_earnings = GREATEST(pending_earnings - v_message.earner_amount, 0),
        updated_at = now()
    WHERE user_id = v_message.recipient_id;

    -- Zero out financial fields on the message so it can’t be refunded twice
    UPDATE public.messages
    SET credits_cost = 0,
        earner_amount = 0,
        platform_fee = 0
    WHERE id = v_message.id;

    -- Transaction record
    INSERT INTO public.transactions (user_id, transaction_type, credits_amount, description, status)
    VALUES (
      v_message.sender_id,
      'message_refund',
      v_message.credits_cost,
      'Refund: no reply within 12 hours',
      'completed'
    );

    v_processed_count := v_processed_count + 1;
  END LOOP;

  RETURN v_processed_count;
END;
$$;