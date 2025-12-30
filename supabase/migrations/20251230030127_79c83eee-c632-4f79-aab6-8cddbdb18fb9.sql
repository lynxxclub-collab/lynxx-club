-- Create credit_reservations table
CREATE TABLE public.credit_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  video_date_id UUID NOT NULL REFERENCES public.video_dates(id) ON DELETE CASCADE,
  credits_amount INTEGER NOT NULL,
  reserved_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  released_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'charged', 'refunded'
  CONSTRAINT credit_reservations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.credit_reservations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own reservations" ON public.credit_reservations
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reservations" ON public.credit_reservations
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_credit_reservations_video_date ON public.credit_reservations(video_date_id);
CREATE INDEX idx_credit_reservations_user_status ON public.credit_reservations(user_id, status);

-- Function to reserve credits for a video date
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
  -- SECURITY: Verify caller is the user reserving credits
  IF p_user_id != auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Check user has enough credits
  SELECT credit_balance INTO v_user_balance
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF v_user_balance IS NULL OR v_user_balance < p_credits_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient credits', 'required', p_credits_amount, 'balance', COALESCE(v_user_balance, 0));
  END IF;
  
  -- Deduct credits from user (reservation)
  UPDATE profiles
  SET credit_balance = credit_balance - p_credits_amount
  WHERE id = p_user_id;
  
  -- Create reservation record
  INSERT INTO credit_reservations (user_id, video_date_id, credits_amount, status)
  VALUES (p_user_id, p_video_date_id, p_credits_amount, 'active');
  
  -- Create transaction record
  INSERT INTO transactions (user_id, transaction_type, credits_amount, description, status)
  VALUES (p_user_id, 'video_date_reservation', -p_credits_amount, 'Credits reserved for video date', 'completed');
  
  RETURN json_build_object('success', true, 'new_balance', v_user_balance - p_credits_amount);
END;
$$;

-- Function to release (refund) reserved credits
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
  
  -- Get video date to verify caller is part of it
  SELECT * INTO v_video_date
  FROM video_dates
  WHERE id = p_video_date_id;
  
  IF v_video_date IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Video date not found');
  END IF;
  
  -- Verify caller is part of the video date
  IF v_caller_id != v_video_date.seeker_id AND v_caller_id != v_video_date.earner_id THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  
  -- Find active reservation
  SELECT * INTO v_reservation
  FROM credit_reservations
  WHERE video_date_id = p_video_date_id
    AND status = 'active'
  FOR UPDATE;
  
  IF v_reservation IS NULL THEN
    -- No active reservation to refund
    RETURN json_build_object('success', true, 'message', 'No active reservation found');
  END IF;
  
  -- Refund credits to user
  UPDATE profiles
  SET credit_balance = credit_balance + v_reservation.credits_amount
  WHERE id = v_reservation.user_id;
  
  -- Update reservation status
  UPDATE credit_reservations
  SET status = 'refunded', released_at = now()
  WHERE id = v_reservation.id;
  
  -- Create refund transaction record
  INSERT INTO transactions (user_id, transaction_type, credits_amount, description, status)
  VALUES (v_reservation.user_id, 'video_date_refund', v_reservation.credits_amount, 
          'Credits refunded: ' || p_reason, 'completed');
  
  RETURN json_build_object('success', true, 'credits_refunded', v_reservation.credits_amount);
END;
$$;

-- Function to mark reservation as charged (when call completes)
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
  -- Find active reservation
  SELECT * INTO v_reservation
  FROM credit_reservations
  WHERE video_date_id = p_video_date_id
    AND status = 'active'
  FOR UPDATE;
  
  IF v_reservation IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No active reservation found');
  END IF;
  
  -- Update reservation status
  UPDATE credit_reservations
  SET status = 'charged', released_at = now()
  WHERE id = v_reservation.id;
  
  RETURN json_build_object('success', true);
END;
$$;