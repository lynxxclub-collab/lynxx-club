-- =============================================================================
-- VIRTUAL GIFTING SYSTEM (EARNERS ONLY) - SAFE / IDEMPOTENT MIGRATION
-- =============================================================================

-- 0) Optional: profiles columns for gift preferences (applies mainly to earners in UI)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS mute_gift_animations BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS premium_animation_limit INTEGER NOT NULL DEFAULT 5;

-- 1) Gift catalog (create if missing)
CREATE TABLE IF NOT EXISTS public.gift_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  credits_cost INTEGER NOT NULL CHECK (credits_cost > 0),
  description TEXT,
  animation_type TEXT NOT NULL DEFAULT 'standard' CHECK (animation_type IN ('standard','premium','ultra')),
  sort_order INTEGER DEFAULT 0,
  is_seasonal BOOLEAN DEFAULT false,
  season_tag TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2) Gift transactions (create if missing)
CREATE TABLE IF NOT EXISTS public.gift_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  gift_id UUID NOT NULL REFERENCES public.gift_catalog(id) ON DELETE RESTRICT,
  credits_spent INTEGER NOT NULL CHECK (credits_spent > 0),
  earner_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  platform_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
  message TEXT,
  thank_you_reaction TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Helpful indexes (safe)
CREATE INDEX IF NOT EXISTS idx_gift_transactions_sender ON public.gift_transactions(sender_id);
CREATE INDEX IF NOT EXISTS idx_gift_transactions_recipient ON public.gift_transactions(recipient_id);
CREATE INDEX IF NOT EXISTS idx_gift_transactions_conversation ON public.gift_transactions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_gift_transactions_created ON public.gift_transactions(created_at DESC);

-- 3) Message reactions (create if missing)
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON public.message_reactions(message_id);

-- 4) Credit packs optional add-ons (won't fail if table missing? This WILL fail if credit_packs doesn't exist.)
-- If Lovable definitely has credit_packs, keep this.
ALTER TABLE public.credit_packs
  ADD COLUMN IF NOT EXISTS bonus_credits INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS badge TEXT;

-- 5) Enable RLS
ALTER TABLE public.gift_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- 6) RLS policies (drop/recreate to avoid duplicates)

-- gift_catalog: anyone can view active gifts
DROP POLICY IF EXISTS "Anyone can view active gifts" ON public.gift_catalog;
CREATE POLICY "Anyone can view active gifts"
ON public.gift_catalog FOR SELECT
USING (active = true);

-- (Optional) lock down catalog writes to admins only
DROP POLICY IF EXISTS "Admins can manage gift catalog" ON public.gift_catalog;
CREATE POLICY "Admins can manage gift catalog"
ON public.gift_catalog FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- gift_transactions: sender/recipient can view
DROP POLICY IF EXISTS "Users can view gifts they sent or received" ON public.gift_transactions;
CREATE POLICY "Users can view gifts they sent or received"
ON public.gift_transactions FOR SELECT
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- gift_transactions: recipient can set thank_you_reaction
DROP POLICY IF EXISTS "Recipients can update thank you reaction" ON public.gift_transactions;
CREATE POLICY "Recipients can update thank you reaction"
ON public.gift_transactions FOR UPDATE
TO authenticated
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

-- NOTE: We do NOT need a permissive INSERT policy if all sends go through send_gift().
-- But keeping it is okay; we'll tighten it to "sender matches auth.uid()"
DROP POLICY IF EXISTS "Authenticated users can send gifts" ON public.gift_transactions;
CREATE POLICY "Authenticated users can send gifts"
ON public.gift_transactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- message_reactions policies
DROP POLICY IF EXISTS "Users can view reactions on their messages" ON public.message_reactions;
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

DROP POLICY IF EXISTS "Users can add reactions" ON public.message_reactions;
CREATE POLICY "Users can add reactions"
ON public.message_reactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove their own reactions" ON public.message_reactions;
CREATE POLICY "Users can remove their own reactions"
ON public.message_reactions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 7) Seed gift catalog (upsert by name to avoid duplicates)
INSERT INTO public.gift_catalog (name, emoji, credits_cost, description, animation_type, sort_order, active)
VALUES
  ('Rose', '🌹', 50,  'A beautiful rose to show you care', 'standard', 1, true),
  ('Heart Box', '💝', 75, 'A box full of love', 'standard', 2, true),
  ('Champagne', '🍾', 100,'Celebrate the moment together', 'standard', 3, true),
  ('Teddy Bear', '🧸', 150,'A cuddly companion', 'standard', 4, true),
  ('Diamond', '💎', 200,'Shine bright like a diamond', 'premium', 5, true),
  ('Crown', '👑', 300, 'The royal treatment', 'ultra', 6, true)
ON CONFLICT (name) DO UPDATE
SET
  emoji = EXCLUDED.emoji,
  credits_cost = EXCLUDED.credits_cost,
  description = EXCLUDED.description,
  animation_type = EXCLUDED.animation_type,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active;

-- 8) SEND GIFT (atomic, wallets source-of-truth, earners-only recipient)
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
  v_gross_usd NUMERIC(10,2);
  v_earner_amount NUMERIC(10, 2);
  v_platform_fee NUMERIC(10, 2);
  v_transaction_id UUID;
  v_is_eligible_creator BOOLEAN;
  v_credit_rate NUMERIC(10,4) := 0.10;
  v_creator_rate NUMERIC(10,4) := 0.70;
BEGIN
  -- SECURITY: Verify sender_id matches authenticated user
  IF auth.uid() IS NULL OR p_sender_id != auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Ensure recipient is an ACTIVE + VERIFIED EARNER (gifts are earners only)
  SELECT EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = p_recipient_id
      AND pr.user_type = 'earner'
      AND pr.account_status = 'active'
      AND pr.verification_status = 'verified'
  )
  INTO v_is_eligible_creator;

  IF NOT v_is_eligible_creator THEN
    RETURN json_build_object('success', false, 'error', 'Recipient is not an active verified earner');
  END IF;

  -- Get gift details
  SELECT * INTO v_gift
  FROM public.gift_catalog
  WHERE id = p_gift_id AND active = true;

  IF v_gift IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Gift not found or inactive');
  END IF;

  -- Ensure sender wallet exists
  INSERT INTO public.wallets (user_id)
  VALUES (p_sender_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Check sender has enough credits
  SELECT credit_balance INTO v_sender_balance
  FROM public.wallets
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

  -- Try to use platform_settings if available (your "single source of truth")
  -- If platform_settings isn't readable here, we fall back to 0.10 + 70/30.
  BEGIN
    SELECT (value #>> '{}')::NUMERIC INTO v_credit_rate
    FROM public.platform_settings WHERE key = 'credit_to_usd_rate';

    SELECT (value #>> '{}')::NUMERIC INTO v_creator_rate
    FROM public.platform_settings WHERE key = 'creator_share_rate';

    v_credit_rate := COALESCE(v_credit_rate, 0.10);
    v_creator_rate := COALESCE(v_creator_rate, 0.70);
  EXCEPTION WHEN undefined_table THEN
    v_credit_rate := 0.10;
    v_creator_rate := 0.70;
  END;

  v_gross_usd := ROUND(v_gift.credits_cost * v_credit_rate, 2);
  v_earner_amount := ROUND(v_gross_usd * v_creator_rate, 2);
  v_platform_fee := v_gross_usd - v_earner_amount;

  -- Deduct credits from sender
  UPDATE public.wallets
  SET credit_balance = credit_balance - v_gift.credits_cost,
      updated_at = now()
  WHERE user_id = p_sender_id;

  -- Ensure recipient wallet exists
  INSERT INTO public.wallets (user_id, credit_balance, pending_earnings, available_earnings)
  VALUES (p_recipient_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Add pending earnings to recipient
  UPDATE public.wallets
  SET pending_earnings = pending_earnings + v_earner_amount,
      updated_at = now()
  WHERE user_id = p_recipient_id;

  -- Record gift transaction
  INSERT INTO public.gift_transactions (
    sender_id, recipient_id, conversation_id, gift_id,
    credits_spent, earner_amount, platform_fee, message
  )
  VALUES (
    p_sender_id, p_recipient_id, p_conversation_id, p_gift_id,
    v_gift.credits_cost, v_earner_amount, v_platform_fee, p_message
  )
  RETURNING id INTO v_transaction_id;

  -- Transactions audit trail
  INSERT INTO public.transactions (user_id, transaction_type, credits_amount, description)
  VALUES (p_sender_id, 'gift_sent', -v_gift.credits_cost, 'Sent ' || v_gift.name || ' gift');

  INSERT INTO public.transactions (user_id, transaction_type, credits_amount, usd_amount, description)
  VALUES (p_recipient_id, 'gift_received', 0, v_earner_amount, 'Received ' || v_gift.name || ' gift');

  -- Update conversation timestamp (optional)
  IF p_conversation_id IS NOT NULL THEN
    UPDATE public.conversations
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
    'earner_amount', v_earner_amount,
    'platform_fee', v_platform_fee,
    'new_balance', v_sender_balance - v_gift.credits_cost
  );
END;
$$;

-- 9) Realtime (may already exist; Supabase usually tolerates repeats)
ALTER PUBLICATION supabase_realtime ADD TABLE public.gift_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;