-- ============================================
-- MIGRATION: setup_gift_system.sql
-- DESCRIPTION: Handles virtual gifts, animations, and payouts.
-- ============================================

-- 1. Gift Catalog (Available gifts)
CREATE TYPE gift_animation AS ENUM ('standard', 'premium', 'ultra');

CREATE TABLE IF NOT EXISTS public.gift_catalog (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL,
    cost_credits INT NOT NULL,
    animation_type gift_animation NOT NULL DEFAULT 'standard',
    is_active BOOLEAN DEFAULT true
);

-- 2. Seed some initial gifts
INSERT INTO public.gift_catalog (name, emoji, cost_credits, animation_type) VALUES
    ('Rose', '🌹', 50, 'standard'),
    ('Bear', '🧸', 100, 'premium'),
    ('Diamond Ring', '💍', 500, 'ultra')
ON CONFLICT DO NOTHING;

-- 3. Gift Transactions (Record of sent gifts)
CREATE TABLE IF NOT EXISTS public.gift_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES public.profiles(id) NOT NULL,
    recipient_id UUID REFERENCES public.profiles(id) NOT NULL,
    gift_id UUID REFERENCES public.gift_catalog(id) NOT NULL,
    cost_credits INT NOT NULL,
    conversation_id UUID, -- Optional link to conversation
    thank_you_emoji TEXT, -- If receiver reacted
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Enable RLS
ALTER TABLE public.gift_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_transactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view gift catalog" ON public.gift_catalog FOR SELECT USING (true);
CREATE POLICY "Users can view own sent gifts" ON public.gift_transactions FOR SELECT USING (auth.uid() = sender_id);
CREATE POLICY "Users can view own received gifts" ON public.gift_transactions FOR SELECT USING (auth.uid() = recipient_id);

-- 5. Function to send a gift (Handles Payouts)
CREATE OR REPLACE FUNCTION send_gift(p_recipient_id UUID, p_gift_id UUID, p_conversation_id UUID)
RETURNS JSON AS $$
DECLARE
    v_gift RECORD;
    v_wallet_current INT;
    v_payout INT;
BEGIN
    -- 1. Get Gift Info
    SELECT * INTO v_gift FROM public.gift_catalog WHERE id = p_gift_id AND is_active = true;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Gift not found');
    END IF;

    -- 2. Lock Sender Wallet
    SELECT current_balance_credits INTO v_wallet_current
    FROM public.wallets WHERE user_id = auth.uid() FOR UPDATE;

    IF v_wallet_current < v_gift.cost_credits THEN
        RETURN json_build_object('success', false, 'error', 'Insufficient credits');
    END IF;

    -- 3. Deduct from Sender
    UPDATE public.wallets
    SET current_balance_credits = current_balance_credits - v_gift.cost_credits,
        total_spent_credits = total_spent_credits + v_gift.cost_credits
    WHERE user_id = auth.uid();

    -- 4. Add to Recipient (70/30 Split logic applies here too based on your global rules)
    v_payout := v_gift.cost_credits * 0.7;
    
    UPDATE public.wallets
    SET current_balance_credits = current_balance_credits + v_payout,
        total_earned_credits = total_earned_credits + v_payout
    WHERE user_id = p_recipient_id;

    -- 5. Record Transaction
    INSERT INTO public.gift_transactions (sender_id, recipient_id, gift_id, cost_credits, conversation_id)
    VALUES (auth.uid(), p_recipient_id, p_gift_id, v_gift.cost_credits, p_conversation_id);

    -- 6. Ledger
    INSERT INTO public.ledger (from_user_id, to_user_id, amount_credits, transaction_type, description)
    VALUES 
        (auth.uid(), p_recipient_id, v_payout, 'gift_payout', 'Gift sent'),
        (auth.uid(), NULL, v_gift.cost_credits - v_payout, 'platform_fee', 'Gift platform fee');

    RETURN json_build_object('success', true, 'gift_emoji', v_gift.emoji, 'animation_type', v_gift.animation_type);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
