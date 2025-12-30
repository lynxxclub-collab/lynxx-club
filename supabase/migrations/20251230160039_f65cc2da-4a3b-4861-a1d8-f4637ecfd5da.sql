-- Fix unlock_image function to only charge on success using exception handling
CREATE OR REPLACE FUNCTION public.unlock_image(p_message_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_credits_cost INTEGER := 10;
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
  FROM messages
  WHERE id = p_message_id;
  
  IF v_message IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Message not found');
  END IF;
  
  IF v_message.message_type != 'image' THEN
    RETURN json_build_object('success', false, 'error', 'Not an image message');
  END IF;
  
  IF v_message.recipient_id != v_user_id THEN
    RETURN json_build_object('success', false, 'error', 'You can only unlock images sent to you');
  END IF;
  
  -- Check if already unlocked FIRST (before any balance operations)
  IF EXISTS (SELECT 1 FROM image_unlocks WHERE message_id = p_message_id AND unlocked_by = v_user_id) THEN
    RETURN json_build_object('success', true, 'already_unlocked', true);
  END IF;
  
  -- Check user has enough credits in WALLETS table
  SELECT credit_balance INTO v_user_balance
  FROM wallets
  WHERE user_id = v_user_id
  FOR UPDATE;
  
  IF v_user_balance IS NULL OR v_user_balance < v_credits_cost THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient credits', 'required', v_credits_cost, 'balance', COALESCE(v_user_balance, 0));
  END IF;
  
  -- Calculate earnings split (70% to earner, 30% platform)
  v_earner_amount := (v_credits_cost * 0.10 * 0.70);
  v_platform_fee := (v_credits_cost * 0.10 * 0.30);
  
  -- Try to record the unlock FIRST - this will fail on duplicate
  BEGIN
    INSERT INTO image_unlocks (message_id, unlocked_by, credits_spent)
    VALUES (p_message_id, v_user_id, v_credits_cost)
    RETURNING id INTO v_unlock_id;
  EXCEPTION WHEN unique_violation THEN
    -- Already unlocked by another concurrent request
    RETURN json_build_object('success', true, 'already_unlocked', true);
  END;
  
  -- Only proceed with financial operations if unlock was recorded
  -- Deduct credits from user's wallet
  UPDATE wallets
  SET credit_balance = credit_balance - v_credits_cost,
      updated_at = now()
  WHERE user_id = v_user_id;
  
  -- Ensure earner has a wallet, then add pending earnings
  INSERT INTO wallets (user_id, credit_balance, pending_earnings, available_earnings)
  VALUES (v_message.sender_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Add pending earnings to earner
  UPDATE wallets
  SET pending_earnings = pending_earnings + v_earner_amount,
      updated_at = now()
  WHERE user_id = v_message.sender_id;
  
  -- Create transaction for seeker
  INSERT INTO transactions (user_id, transaction_type, credits_amount, description)
  VALUES (v_user_id, 'image_unlock', -v_credits_cost, 'Unlocked image');
  
  -- Create transaction for earner
  INSERT INTO transactions (user_id, transaction_type, credits_amount, usd_amount, description)
  VALUES (v_message.sender_id, 'earning', 0, v_earner_amount, 'Image unlock earnings');
  
  RETURN json_build_object(
    'success', true,
    'credits_spent', v_credits_cost,
    'new_balance', v_user_balance - v_credits_cost
  );
END;
$function$;

-- Add unique constraint to image_unlocks to prevent duplicate unlocks
ALTER TABLE public.image_unlocks 
ADD CONSTRAINT image_unlocks_message_user_unique 
UNIQUE (message_id, unlocked_by);

-- Add columns for 12-hour timer refund system to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS reply_deadline timestamp with time zone,
ADD COLUMN IF NOT EXISTS refund_status text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS refunded_at timestamp with time zone;

-- Add index for efficient query of messages needing refunds
CREATE INDEX IF NOT EXISTS idx_messages_reply_deadline 
ON public.messages(reply_deadline) 
WHERE reply_deadline IS NOT NULL AND refund_status IS NULL AND is_billable_volley = true;

-- Create function to process expired messages and refund credits
CREATE OR REPLACE FUNCTION public.process_expired_message_refunds()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_processed_count INTEGER := 0;
  v_message RECORD;
BEGIN
  -- Find all billable messages past their deadline without a reply
  FOR v_message IN
    SELECT m.id, m.conversation_id, m.sender_id, m.recipient_id, m.credits_cost, m.earner_amount
    FROM messages m
    WHERE m.is_billable_volley = true
      AND m.reply_deadline IS NOT NULL
      AND m.reply_deadline < NOW()
      AND m.refund_status IS NULL
      AND m.credits_cost > 0
      -- Check that there's no reply from recipient after this message
      AND NOT EXISTS (
        SELECT 1 FROM messages reply
        WHERE reply.conversation_id = m.conversation_id
          AND reply.sender_id = m.recipient_id
          AND reply.created_at > m.created_at
      )
  LOOP
    -- Refund credits to sender's wallet
    UPDATE wallets
    SET credit_balance = credit_balance + v_message.credits_cost,
        updated_at = now()
    WHERE user_id = v_message.sender_id;
    
    -- Remove pending earnings from earner's wallet
    UPDATE wallets
    SET pending_earnings = GREATEST(pending_earnings - v_message.earner_amount, 0),
        updated_at = now()
    WHERE user_id = v_message.recipient_id;
    
    -- Mark message as refunded
    UPDATE messages
    SET refund_status = 'refunded',
        refunded_at = NOW(),
        credits_cost = 0,
        earner_amount = 0,
        platform_fee = 0
    WHERE id = v_message.id;
    
    -- Create refund transaction record for sender
    INSERT INTO transactions (user_id, transaction_type, credits_amount, description)
    VALUES (v_message.sender_id, 'message_refund', v_message.credits_cost, 'Refund: no reply within 12 hours');
    
    v_processed_count := v_processed_count + 1;
  END LOOP;
  
  RETURN v_processed_count;
END;
$$;