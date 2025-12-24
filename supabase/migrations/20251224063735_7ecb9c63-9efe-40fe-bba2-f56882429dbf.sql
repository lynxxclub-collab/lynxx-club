-- Add new columns to video_dates for tracking actual call duration
ALTER TABLE public.video_dates 
ADD COLUMN IF NOT EXISTS actual_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS actual_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS credits_charged INTEGER;

-- Create the charge video date transaction function
CREATE OR REPLACE FUNCTION public.charge_video_date_transaction(
  p_video_date_id UUID,
  p_seeker_id UUID,
  p_earner_id UUID,
  p_credits_charged INTEGER,
  p_earner_amount DECIMAL(10,2),
  p_platform_fee DECIMAL(10,2),
  p_usd_amount DECIMAL(10,2)
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seeker_balance INTEGER;
BEGIN
  -- Check seeker has enough credits
  SELECT credit_balance INTO v_seeker_balance
  FROM profiles
  WHERE id = p_seeker_id
  FOR UPDATE;
  
  IF v_seeker_balance IS NULL OR v_seeker_balance < p_credits_charged THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient credits');
  END IF;
  
  -- 1. Deduct credits from seeker
  UPDATE profiles
  SET credit_balance = credit_balance - p_credits_charged
  WHERE id = p_seeker_id;
  
  -- 2. Add earnings to earner
  UPDATE profiles
  SET earnings_balance = earnings_balance + p_earner_amount
  WHERE id = p_earner_id;
  
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