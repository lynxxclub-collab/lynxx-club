-- Phase 1: Database Schema Enhancements for 70/30 Revenue Split

-- 1.1 Add missing columns to wallets table
ALTER TABLE public.wallets 
ADD COLUMN IF NOT EXISTS paid_out_total NUMERIC(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS payout_hold BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payout_hold_reason TEXT,
ADD COLUMN IF NOT EXISTS payout_hold_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_payout_at TIMESTAMPTZ;

-- 1.2 Add missing columns to gift_transactions table
ALTER TABLE public.gift_transactions 
ADD COLUMN IF NOT EXISTS credit_to_usd_rate NUMERIC(10,4) NOT NULL DEFAULT 0.10,
ADD COLUMN IF NOT EXISTS gross_value_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';

-- 1.3 Create platform_ledger table to track platform's 30% share
CREATE TABLE IF NOT EXISTS public.platform_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type TEXT NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  gross_value_usd NUMERIC(10,2) NOT NULL,
  platform_share_usd NUMERIC(10,2) NOT NULL,
  creator_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  description TEXT
);

-- Enable RLS on platform_ledger
ALTER TABLE public.platform_ledger ENABLE ROW LEVEL SECURITY;

-- Only admins can view platform ledger
CREATE POLICY "Admins can view platform ledger"
ON public.platform_ledger FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert (for edge functions)
CREATE POLICY "Service role can insert platform ledger"
ON public.platform_ledger FOR INSERT
WITH CHECK (true);

-- 1.4 Create payout_schedules table for automated payouts
CREATE TABLE IF NOT EXISTS public.payout_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  stripe_transfer_id TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Enable RLS on payout_schedules
ALTER TABLE public.payout_schedules ENABLE ROW LEVEL SECURITY;

-- Users can view their own payout schedules
CREATE POLICY "Users can view own payout schedules"
ON public.payout_schedules FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all payout schedules
CREATE POLICY "Admins can view all payout schedules"
ON public.payout_schedules FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert/update payout schedules
CREATE POLICY "Service role can manage payout schedules"
ON public.payout_schedules FOR ALL
WITH CHECK (true);

-- 1.5 Create processed_earnings table to track pending->available migrations
CREATE TABLE IF NOT EXISTS public.processed_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_transaction_id UUID NOT NULL UNIQUE,
  processed_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on processed_earnings
ALTER TABLE public.processed_earnings ENABLE ROW LEVEL SECURITY;

-- Admins can view processed earnings
CREATE POLICY "Admins can view processed earnings"
ON public.processed_earnings FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert
CREATE POLICY "Service role can insert processed earnings"
ON public.processed_earnings FOR INSERT
WITH CHECK (true);

-- 1.6 Create chargeback_records table for refund handling
CREATE TABLE IF NOT EXISTS public.chargeback_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_purchase_id UUID,
  stripe_charge_id TEXT,
  credits_purchased INTEGER NOT NULL,
  credits_remaining INTEGER NOT NULL,
  credits_used INTEGER NOT NULL,
  affected_creators JSONB,
  clawback_total NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Enable RLS on chargeback_records
ALTER TABLE public.chargeback_records ENABLE ROW LEVEL SECURITY;

-- Admins can view chargeback records
CREATE POLICY "Admins can view chargeback records"
ON public.chargeback_records FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can manage chargeback records
CREATE POLICY "Service role can manage chargeback records"
ON public.chargeback_records FOR ALL
WITH CHECK (true);

-- 1.7 Create platform_settings table for global configuration
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on platform_settings
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Admins can view and manage platform settings
CREATE POLICY "Admins can manage platform settings"
ON public.platform_settings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can read platform settings (needed for payout threshold display)
CREATE POLICY "Anyone can read platform settings"
ON public.platform_settings FOR SELECT
USING (true);

-- Insert fixed $25 payout minimum
INSERT INTO public.platform_settings (key, value) 
VALUES ('payout_minimum_usd', '"25.00"')
ON CONFLICT (key) DO UPDATE SET value = '"25.00"', updated_at = now();

-- 1.8 Backfill existing gift_transactions with gross_value_usd
UPDATE public.gift_transactions
SET 
  gross_value_usd = credits_spent * 0.10,
  credit_to_usd_rate = 0.10
WHERE gross_value_usd = 0;

-- 1.9 Create function to process pending earnings (48-hour hold)
CREATE OR REPLACE FUNCTION public.process_pending_earnings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_processed_count INTEGER := 0;
BEGIN
  -- Move earnings from gifts older than 48 hours from pending to available
  WITH eligible_gifts AS (
    SELECT gt.id, gt.recipient_id, gt.earner_amount
    FROM gift_transactions gt
    WHERE gt.created_at <= NOW() - INTERVAL '48 hours'
      AND gt.status = 'completed'
      AND NOT EXISTS (
        SELECT 1 FROM processed_earnings pe WHERE pe.gift_transaction_id = gt.id
      )
  ),
  aggregated AS (
    SELECT recipient_id, SUM(earner_amount) as total
    FROM eligible_gifts
    GROUP BY recipient_id
  ),
  updated_wallets AS (
    UPDATE wallets w
    SET 
      available_earnings = w.available_earnings + a.total,
      pending_earnings = GREATEST(w.pending_earnings - a.total, 0),
      updated_at = now()
    FROM aggregated a
    WHERE w.user_id = a.recipient_id
    RETURNING w.user_id
  )
  -- Mark gifts as processed
  INSERT INTO processed_earnings (gift_transaction_id, processed_at)
  SELECT eg.id, now() 
  FROM eligible_gifts eg;
  
  GET DIAGNOSTICS v_processed_count = ROW_COUNT;
  RETURN v_processed_count;
END;
$$;

-- 1.10 Update send_gift function to include platform ledger entry
CREATE OR REPLACE FUNCTION public.send_gift(
  p_sender_id uuid, 
  p_recipient_id uuid, 
  p_conversation_id uuid, 
  p_gift_id uuid, 
  p_message text DEFAULT NULL::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_gift RECORD;
  v_sender_balance INTEGER;
  v_credit_rate NUMERIC(10,4) := 0.10;
  v_gross_usd NUMERIC(10,2);
  v_earner_amount NUMERIC(10, 2);
  v_platform_fee NUMERIC(10, 2);
  v_transaction_id UUID;
BEGIN
  -- SECURITY: Verify sender_id matches authenticated user
  IF p_sender_id != auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Get gift details
  SELECT * INTO v_gift
  FROM gift_catalog
  WHERE id = p_gift_id AND active = true;

  IF v_gift IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Gift not found or inactive');
  END IF;

  -- Check sender has enough credits in wallets table
  SELECT credit_balance INTO v_sender_balance
  FROM wallets
  WHERE user_id = p_sender_id
  FOR UPDATE;

  IF v_sender_balance IS NULL OR v_sender_balance < v_gift.credits_cost THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Insufficient credits', 
      'required', v_gift.credits_cost, 
      'balance', COALESCE(v_sender_balance, 0)
    );
  END IF;

  -- Calculate 70/30 split with explicit rate
  -- 1 credit = $0.10 USD
  v_gross_usd := v_gift.credits_cost * v_credit_rate;
  v_earner_amount := v_gross_usd * 0.70;
  v_platform_fee := v_gross_usd * 0.30;

  -- Deduct credits from sender's wallet
  UPDATE wallets
  SET credit_balance = credit_balance - v_gift.credits_cost,
      updated_at = now()
  WHERE user_id = p_sender_id;

  -- Ensure recipient has a wallet
  INSERT INTO wallets (user_id, credit_balance, pending_earnings, available_earnings)
  VALUES (p_recipient_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Add earnings to recipient's wallet (pending, not available)
  UPDATE wallets
  SET pending_earnings = pending_earnings + v_earner_amount,
      updated_at = now()
  WHERE user_id = p_recipient_id;

  -- Create gift transaction record with full audit fields
  INSERT INTO gift_transactions (
    sender_id, recipient_id, conversation_id, gift_id, 
    credits_spent, earner_amount, platform_fee, message,
    credit_to_usd_rate, gross_value_usd, status
  )
  VALUES (
    p_sender_id, p_recipient_id, p_conversation_id, p_gift_id,
    v_gift.credits_cost, v_earner_amount, v_platform_fee, p_message,
    v_credit_rate, v_gross_usd, 'completed'
  )
  RETURNING id INTO v_transaction_id;

  -- Insert platform ledger entry for 30% share
  INSERT INTO platform_ledger (
    entry_type, reference_id, reference_type,
    gross_value_usd, platform_share_usd, creator_id, description
  )
  VALUES (
    'gift_fee', v_transaction_id, 'gift',
    v_gross_usd, v_platform_fee, p_recipient_id,
    'Platform 30% share from gift: ' || v_gift.name
  );

  -- Create transaction record for sender
  INSERT INTO transactions (user_id, transaction_type, credits_amount, description)
  VALUES (p_sender_id, 'gift_sent', -v_gift.credits_cost, 'Sent ' || v_gift.name || ' gift');

  -- Create transaction record for earner
  INSERT INTO transactions (user_id, transaction_type, credits_amount, usd_amount, description)
  VALUES (p_recipient_id, 'gift_received', 0, v_earner_amount, 'Received ' || v_gift.name || ' gift (70% of $' || v_gross_usd || ')');

  -- Update conversation last_message_at
  IF p_conversation_id IS NOT NULL THEN
    UPDATE conversations
    SET last_message_at = now()
    WHERE id = p_conversation_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'gift_name', v_gift.name,
    'gift_emoji', v_gift.emoji,
    'animation_type', v_gift.animation_type,
    'credits_spent', v_gift.credits_cost,
    'gross_value_usd', v_gross_usd,
    'creator_earnings', v_earner_amount,
    'platform_fee', v_platform_fee,
    'new_balance', v_sender_balance - v_gift.credits_cost
  );
END;
$$;