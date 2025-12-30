-- Create table to track unlocked images
CREATE TABLE public.image_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  unlocked_by UUID NOT NULL,
  credits_spent INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(message_id, unlocked_by)
);

-- Enable RLS
ALTER TABLE public.image_unlocks ENABLE ROW LEVEL SECURITY;

-- Users can see their own unlocks
CREATE POLICY "Users can view their own image unlocks"
  ON public.image_unlocks FOR SELECT
  USING (auth.uid() = unlocked_by);

-- Users can insert their own unlocks (actual unlock logic in function)
CREATE POLICY "Users can create their own image unlocks"
  ON public.image_unlocks FOR INSERT
  WITH CHECK (auth.uid() = unlocked_by);

-- Create function to unlock an image with proper credit handling
CREATE OR REPLACE FUNCTION public.unlock_image(p_message_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_credits_cost INTEGER := 10;
  v_earner_amount NUMERIC(10, 2);
  v_platform_fee NUMERIC(10, 2);
  v_user_balance INTEGER;
  v_message RECORD;
BEGIN
  v_user_id := auth.uid();
  
  -- Verify user is authenticated
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
  
  -- Verify this is an image message
  IF v_message.message_type != 'image' THEN
    RETURN json_build_object('success', false, 'error', 'Not an image message');
  END IF;
  
  -- Verify user is the recipient (should only unlock images sent TO them)
  IF v_message.recipient_id != v_user_id THEN
    RETURN json_build_object('success', false, 'error', 'You can only unlock images sent to you');
  END IF;
  
  -- Check if already unlocked
  IF EXISTS (SELECT 1 FROM image_unlocks WHERE message_id = p_message_id AND unlocked_by = v_user_id) THEN
    RETURN json_build_object('success', true, 'already_unlocked', true);
  END IF;
  
  -- Check user has enough credits
  SELECT credit_balance INTO v_user_balance
  FROM profiles
  WHERE id = v_user_id
  FOR UPDATE;
  
  IF v_user_balance IS NULL OR v_user_balance < v_credits_cost THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient credits', 'required', v_credits_cost, 'balance', COALESCE(v_user_balance, 0));
  END IF;
  
  -- Calculate earnings split (70% to earner, 30% platform)
  v_earner_amount := (v_credits_cost * 0.10 * 0.70);
  v_platform_fee := (v_credits_cost * 0.10 * 0.30);
  
  -- Deduct credits from seeker
  UPDATE profiles
  SET credit_balance = credit_balance - v_credits_cost
  WHERE id = v_user_id;
  
  -- Add earnings to earner (sender of the image)
  UPDATE profiles
  SET earnings_balance = earnings_balance + v_earner_amount
  WHERE id = v_message.sender_id;
  
  -- Record the unlock
  INSERT INTO image_unlocks (message_id, unlocked_by, credits_spent)
  VALUES (p_message_id, v_user_id, v_credits_cost);
  
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
$$;