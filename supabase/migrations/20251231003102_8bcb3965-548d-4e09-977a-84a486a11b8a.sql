-- Update send_message to use wallets table instead of profiles
CREATE OR REPLACE FUNCTION public.send_message(
  p_sender_id uuid,
  p_recipient_id uuid,
  p_conversation_id uuid,
  p_content text,
  p_message_type text DEFAULT 'text'::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_credits_cost INTEGER;
  v_earner_amount NUMERIC(10, 2);
  v_platform_fee NUMERIC(10, 2);
  v_sender_balance INTEGER;
  v_message_id UUID;
  v_conv_id UUID;
BEGIN
  -- SECURITY: Verify sender_id matches the authenticated user
  IF p_sender_id != auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: sender_id must match authenticated user');
  END IF;

  -- Determine credits cost based on message type
  IF p_message_type = 'image' THEN
    v_credits_cost := 40;
  ELSE
    v_credits_cost := 20;
  END IF;
  
  -- Calculate earnings: credits * 0.10 * 0.70
  v_earner_amount := (v_credits_cost * 0.10 * 0.70);
  v_platform_fee := (v_credits_cost * 0.10 * 0.30);
  
  -- Ensure sender has a wallet
  INSERT INTO wallets (user_id)
  VALUES (p_sender_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Check sender has enough credits FROM WALLETS TABLE
  SELECT credit_balance INTO v_sender_balance
  FROM wallets
  WHERE user_id = p_sender_id
  FOR UPDATE;
  
  IF v_sender_balance IS NULL OR v_sender_balance < v_credits_cost THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient credits', 'required', v_credits_cost, 'balance', COALESCE(v_sender_balance, 0));
  END IF;
  
  -- Get or create conversation
  IF p_conversation_id IS NOT NULL THEN
    v_conv_id := p_conversation_id;
  ELSE
    INSERT INTO conversations (seeker_id, earner_id)
    VALUES (p_sender_id, p_recipient_id)
    ON CONFLICT (seeker_id, earner_id) DO UPDATE SET last_message_at = now()
    RETURNING id INTO v_conv_id;
  END IF;
  
  -- Deduct credits from sender's WALLET
  UPDATE wallets
  SET credit_balance = credit_balance - v_credits_cost,
      updated_at = now()
  WHERE user_id = p_sender_id;
  
  -- Ensure recipient has a wallet
  INSERT INTO wallets (user_id, credit_balance, pending_earnings, available_earnings)
  VALUES (p_recipient_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Add pending earnings to recipient's WALLET
  UPDATE wallets
  SET pending_earnings = pending_earnings + v_earner_amount,
      updated_at = now()
  WHERE user_id = p_recipient_id;
  
  -- Create message
  INSERT INTO messages (conversation_id, sender_id, recipient_id, content, message_type, credits_cost, earner_amount, platform_fee)
  VALUES (v_conv_id, p_sender_id, p_recipient_id, p_content, p_message_type, v_credits_cost, v_earner_amount, v_platform_fee)
  RETURNING id INTO v_message_id;
  
  -- Update conversation stats
  UPDATE conversations
  SET total_messages = total_messages + 1,
      total_credits_spent = total_credits_spent + v_credits_cost,
      last_message_at = now()
  WHERE id = v_conv_id;
  
  -- Create transaction record for sender
  INSERT INTO transactions (user_id, transaction_type, credits_amount, description)
  VALUES (p_sender_id, 'message_sent', -v_credits_cost, 
          CASE WHEN p_message_type = 'image' THEN 'Image message sent' ELSE 'Text message sent' END);
  
  -- Create transaction record for earner
  INSERT INTO transactions (user_id, transaction_type, credits_amount, usd_amount, description)
  VALUES (p_recipient_id, 'earning', 0, v_earner_amount, 
          CASE WHEN p_message_type = 'image' THEN 'Received image message' ELSE 'Received text message' END);
  
  RETURN json_build_object(
    'success', true, 
    'message_id', v_message_id, 
    'conversation_id', v_conv_id,
    'credits_spent', v_credits_cost,
    'new_balance', v_sender_balance - v_credits_cost
  );
END;
$$;

-- Update charge_video_date_transaction to use wallets table
CREATE OR REPLACE FUNCTION public.charge_video_date_transaction(
  p_video_date_id uuid,
  p_seeker_id uuid,
  p_earner_id uuid,
  p_credits_charged integer,
  p_earner_amount numeric,
  p_platform_fee numeric,
  p_usd_amount numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_seeker_balance INTEGER;
  v_caller_id UUID;
BEGIN
  -- SECURITY: Verify the caller is part of the video date
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL OR (v_caller_id != p_seeker_id AND v_caller_id != p_earner_id) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: caller must be part of the video date');
  END IF;

  -- Ensure seeker has a wallet
  INSERT INTO wallets (user_id)
  VALUES (p_seeker_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Check seeker has enough credits FROM WALLETS TABLE
  SELECT credit_balance INTO v_seeker_balance
  FROM wallets
  WHERE user_id = p_seeker_id
  FOR UPDATE;
  
  IF v_seeker_balance IS NULL OR v_seeker_balance < p_credits_charged THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient credits');
  END IF;
  
  -- 1. Deduct credits from seeker's WALLET
  UPDATE wallets
  SET credit_balance = credit_balance - p_credits_charged,
      updated_at = now()
  WHERE user_id = p_seeker_id;
  
  -- Ensure earner has a wallet
  INSERT INTO wallets (user_id, credit_balance, pending_earnings, available_earnings)
  VALUES (p_earner_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- 2. Add earnings to earner's WALLET (pending_earnings)
  UPDATE wallets
  SET pending_earnings = pending_earnings + p_earner_amount,
      updated_at = now()
  WHERE user_id = p_earner_id;
  
  -- 3. Update video date record
  UPDATE video_dates
  SET 
    status = 'completed',
    credits_charged = p_credits_charged,
    earner_amount = p_earner_amount,
    platform_fee = p_platform_fee,
    completed_at = NOW()
  WHERE id = p_video_date_id;
  
  -- 4. Create transaction record for seeker (credit deduction)
  INSERT INTO transactions (user_id, transaction_type, credits_amount, usd_amount, description, status)
  VALUES (p_seeker_id, 'video_date', -p_credits_charged, -p_usd_amount, 'Video date completed', 'completed');
  
  -- 5. Create transaction record for earner (earnings)
  INSERT INTO transactions (user_id, transaction_type, credits_amount, usd_amount, description, status)
  VALUES (p_earner_id, 'video_earning', 0, p_earner_amount, 'Video date earnings', 'completed');
  
  RETURN json_build_object('success', true, 'credits_charged', p_credits_charged, 'earner_amount', p_earner_amount);
END;
$$;

-- Create sync trigger to keep profiles.credit_balance in sync (safety net during deprecation)
CREATE OR REPLACE FUNCTION public.sync_wallet_to_profile_credit_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE profiles 
  SET credit_balance = NEW.credit_balance,
      updated_at = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS sync_wallet_credits ON wallets;

CREATE TRIGGER sync_wallet_credits
AFTER INSERT OR UPDATE OF credit_balance ON wallets
FOR EACH ROW EXECUTE FUNCTION public.sync_wallet_to_profile_credit_balance();

-- Add deprecation comment to profiles.credit_balance
COMMENT ON COLUMN profiles.credit_balance IS 'DEPRECATED: Use wallets.credit_balance instead. This column is kept for backward compatibility and synced via trigger.';