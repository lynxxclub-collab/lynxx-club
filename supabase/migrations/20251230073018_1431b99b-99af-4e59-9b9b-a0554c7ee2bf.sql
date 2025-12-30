-- =============================================
-- VIRTUAL GIFTING SYSTEM SCHEMA
-- =============================================

-- 1. Add gift-related columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS mute_gift_animations BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS premium_animation_limit INTEGER DEFAULT 5;

-- 2. Create gift catalog table
CREATE TABLE public.gift_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  credits_cost INTEGER NOT NULL,
  description TEXT,
  animation_type TEXT NOT NULL DEFAULT 'standard', -- 'standard', 'premium', 'ultra'
  sort_order INTEGER DEFAULT 0,
  is_seasonal BOOLEAN DEFAULT false,
  season_tag TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create gift transactions table
CREATE TABLE public.gift_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id),
  gift_id UUID NOT NULL REFERENCES public.gift_catalog(id),
  credits_spent INTEGER NOT NULL,
  earner_amount NUMERIC(10, 2) NOT NULL,
  platform_fee NUMERIC(10, 2) NOT NULL,
  message TEXT,
  thank_you_reaction TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create message reactions table
CREATE TABLE public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- 5. Add bonus_credits column to credit_packs
ALTER TABLE public.credit_packs
ADD COLUMN IF NOT EXISTS bonus_credits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS badge TEXT;

-- 6. Enable RLS on new tables
ALTER TABLE public.gift_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for gift_catalog (public read for active gifts)
CREATE POLICY "Anyone can view active gifts"
ON public.gift_catalog FOR SELECT
USING (active = true);

-- 8. RLS Policies for gift_transactions
CREATE POLICY "Authenticated users can send gifts"
ON public.gift_transactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can view gifts they sent or received"
ON public.gift_transactions FOR SELECT
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Recipients can update thank you reaction"
ON public.gift_transactions FOR UPDATE
TO authenticated
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

-- 9. RLS Policies for message_reactions
CREATE POLICY "Users can view reactions on their messages"
ON public.message_reactions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_id
    AND (m.sender_id = auth.uid() OR m.recipient_id = auth.uid())
  )
);

CREATE POLICY "Users can add reactions"
ON public.message_reactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own reactions"
ON public.message_reactions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 10. Seed the gift catalog with initial gifts
INSERT INTO public.gift_catalog (name, emoji, credits_cost, description, animation_type, sort_order) VALUES
  ('Rose', '🌹', 50, 'A beautiful rose to show you care', 'standard', 1),
  ('Heart Box', '💝', 75, 'A box full of love', 'standard', 2),
  ('Champagne', '🍾', 100, 'Celebrate the moment together', 'standard', 3),
  ('Teddy Bear', '🧸', 150, 'A cuddly companion', 'standard', 4),
  ('Diamond', '💎', 200, 'Shine bright like a diamond', 'premium', 5),
  ('Crown', '👑', 300, 'The royal treatment', 'ultra', 6);

-- 11. Enable realtime for gift_transactions and message_reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.gift_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;

-- 12. Create indexes for performance
CREATE INDEX idx_gift_transactions_sender ON public.gift_transactions(sender_id);
CREATE INDEX idx_gift_transactions_recipient ON public.gift_transactions(recipient_id);
CREATE INDEX idx_gift_transactions_conversation ON public.gift_transactions(conversation_id);
CREATE INDEX idx_gift_transactions_created ON public.gift_transactions(created_at DESC);
CREATE INDEX idx_message_reactions_message ON public.message_reactions(message_id);

-- 13. Create function for sending gifts (atomic transaction)
CREATE OR REPLACE FUNCTION public.send_gift(
  p_sender_id UUID,
  p_recipient_id UUID,
  p_conversation_id UUID,
  p_gift_id UUID,
  p_message TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_gift RECORD;
  v_sender_balance INTEGER;
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

  -- Calculate earnings split (70% to earner, 30% platform)
  -- 1 credit = $0.10
  v_earner_amount := (v_gift.credits_cost * 0.10 * 0.70);
  v_platform_fee := (v_gift.credits_cost * 0.10 * 0.30);

  -- Deduct credits from sender's wallet
  UPDATE wallets
  SET credit_balance = credit_balance - v_gift.credits_cost,
      updated_at = now()
  WHERE user_id = p_sender_id;

  -- Ensure recipient has a wallet
  INSERT INTO wallets (user_id, credit_balance, pending_earnings, available_earnings)
  VALUES (p_recipient_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Add earnings to recipient's wallet
  UPDATE wallets
  SET pending_earnings = pending_earnings + v_earner_amount,
      updated_at = now()
  WHERE user_id = p_recipient_id;

  -- Create gift transaction record
  INSERT INTO gift_transactions (
    sender_id, recipient_id, conversation_id, gift_id, 
    credits_spent, earner_amount, platform_fee, message
  )
  VALUES (
    p_sender_id, p_recipient_id, p_conversation_id, p_gift_id,
    v_gift.credits_cost, v_earner_amount, v_platform_fee, p_message
  )
  RETURNING id INTO v_transaction_id;

  -- Create transaction record for sender
  INSERT INTO transactions (user_id, transaction_type, credits_amount, description)
  VALUES (p_sender_id, 'gift_sent', -v_gift.credits_cost, 'Sent ' || v_gift.name || ' gift');

  -- Create transaction record for earner
  INSERT INTO transactions (user_id, transaction_type, credits_amount, usd_amount, description)
  VALUES (p_recipient_id, 'gift_received', 0, v_earner_amount, 'Received ' || v_gift.name || ' gift');

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
    'new_balance', v_sender_balance - v_gift.credits_cost
  );
END;
$$;