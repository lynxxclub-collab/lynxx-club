/* ============================================================================
   send_message: SEEKER PAYS ONLY
   - Text = 5 credits, Image = 10 credits (ONLY when sender is seeker)
   - Earner -> seeker messages are FREE
   - Earnings go to earner as pending_earnings when seeker pays
   ============================================================================ */

CREATE OR REPLACE FUNCTION public.send_message(
  p_sender_id uuid,
  p_recipient_id uuid,
  p_conversation_id uuid,
  p_content text,
  p_message_type text DEFAULT 'text'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sender_type user_type;
  v_recipient_type user_type;

  v_seeker_id uuid;
  v_earner_id uuid;

  v_conv_id uuid;
  v_message_id uuid;

  v_credits_cost integer;

  v_sender_balance integer;

  v_earner_amount numeric(10,2);
  v_platform_fee numeric(10,2);

  v_wallet_first uuid;
  v_wallet_second uuid;
BEGIN
  -- SECURITY: sender must be the authed user
  IF auth.uid() IS NULL OR p_sender_id != auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: sender_id must match authenticated user');
  END IF;

  -- Validate content
  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Message content is required');
  END IF;

  -- Validate message type
  IF p_message_type NOT IN ('text','image') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid message_type');
  END IF;

  -- Determine user types
  SELECT user_type INTO v_sender_type
  FROM public.profiles
  WHERE id = p_sender_id;

  SELECT user_type INTO v_recipient_type
  FROM public.profiles
  WHERE id = p_recipient_id;

  IF v_sender_type IS NULL OR v_recipient_type IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Sender or recipient profile missing');
  END IF;

  -- Must be seeker <-> earner only
  IF v_sender_type = 'seeker' AND v_recipient_type = 'earner' THEN
    v_seeker_id := p_sender_id;
    v_earner_id := p_recipient_id;
  ELSIF v_sender_type = 'earner' AND v_recipient_type = 'seeker' THEN
    v_seeker_id := p_recipient_id;
    v_earner_id := p_sender_id;
  ELSE
    RETURN json_build_object('success', false, 'error', 'Invalid pairing: messages must be between seeker and earner');
  END IF;

  -- COST RULES:
  -- Seeker -> earner costs credits (text=5, image=10)
  -- Earner -> seeker is free
  IF v_sender_type = 'seeker' THEN
    v_credits_cost := CASE WHEN p_message_type = 'image' THEN 10 ELSE 5 END;

    -- Earnings: credits × $0.10 × 70%
    v_earner_amount := ROUND((v_credits_cost * 0.10 * 0.70)::numeric, 2);
    v_platform_fee := ROUND((v_credits_cost * 0.10 * 0.30)::numeric, 2);
  ELSE
    v_credits_cost := 0;
    v_earner_amount := 0;
    v_platform_fee := 0;
  END IF;

  -- Ensure wallets exist
  INSERT INTO public.wallets (user_id)
  VALUES (v_seeker_id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.wallets (user_id, credit_balance, pending_earnings, available_earnings)
  VALUES (v_earner_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Lock both wallets deterministically to avoid deadlocks
  v_wallet_first := LEAST(v_seeker_id, v_earner_id);
  v_wallet_second := GREATEST(v_seeker_id, v_earner_id);

  PERFORM 1 FROM public.wallets WHERE user_id = v_wallet_first FOR UPDATE;
  PERFORM 1 FROM public.wallets WHERE user_id = v_wallet_second FOR UPDATE;

  -- If seeker is paying, ensure seeker has enough credits
  IF v_credits_cost > 0 THEN
    SELECT credit_balance INTO v_sender_balance
    FROM public.wallets
    WHERE user_id = v_seeker_id;

    IF v_sender_balance IS NULL OR v_sender_balance < v_credits_cost THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Insufficient credits',
        'required', v_credits_cost,
        'balance', COALESCE(v_sender_balance, 0)
      );
    END IF;
  END IF;

  -- Get or create conversation (always keyed by seeker_id + earner_id)
  IF p_conversation_id IS NOT NULL THEN
    v_conv_id := p_conversation_id;

    -- Ensure conversation matches these two users
    IF NOT EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = v_conv_id
        AND c.seeker_id = v_seeker_id
        AND c.earner_id = v_earner_id
    ) THEN
      RETURN json_build_object('success', false, 'error', 'Conversation mismatch');
    END IF;
  ELSE
    INSERT INTO public.conversations (seeker_id, earner_id)
    VALUES (v_seeker_id, v_earner_id)
    ON CONFLICT (seeker_id, earner_id)
    DO UPDATE SET last_message_at = now()
    RETURNING id INTO v_conv_id;
  END IF;

  -- Apply payment only when seeker sends
  IF v_credits_cost > 0 THEN
    -- Deduct credits from seeker
    UPDATE public.wallets
    SET credit_balance = credit_balance - v_credits_cost,
        updated_at = now()
    WHERE user_id = v_seeker_id;

    -- Add pending earnings to earner
    UPDATE public.wallets
    SET pending_earnings = pending_earnings + v_earner_amount,
        updated_at = now()
    WHERE user_id = v_earner_id;
  END IF;

  -- Create message record
  INSERT INTO public.messages (
    conversation_id,
    sender_id,
    recipient_id,
    content,
    message_type,
    credits_cost,
    earner_amount,
    platform_fee
  )
  VALUES (
    v_conv_id,
    p_sender_id,
    p_recipient_id,
    p_content,
    p_message_type,
    v_credits_cost,
    v_earner_amount,
    v_platform_fee
  )
  RETURNING id INTO v_message_id;

  -- Update conversation stats
  UPDATE public.conversations
  SET total_messages = total_messages + 1,
      total_credits_spent = total_credits_spent + v_credits_cost,
      last_message_at = now()
  WHERE id = v_conv_id;

  -- Transactions: only when seeker pays
  IF v_credits_cost > 0 THEN
    INSERT INTO public.transactions (user_id, transaction_type, credits_amount, description)
    VALUES (
      v_seeker_id,
      'message_sent',
      -v_credits_cost,
      CASE WHEN p_message_type = 'image' THEN 'Image message sent' ELSE 'Text message sent' END
    );

    INSERT INTO public.transactions (user_id, transaction_type, credits_amount, usd_amount, description)
    VALUES (
      v_earner_id,
      'earning',
      0,
      v_earner_amount,
      CASE WHEN p_message_type = 'image' THEN 'Received paid image message' ELSE 'Received paid text message' END
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'message_id', v_message_id,
    'conversation_id', v_conv_id,
    'credits_spent', v_credits_cost,
    'free_message', (v_credits_cost = 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_message(uuid, uuid, uuid, text, text) TO authenticated;