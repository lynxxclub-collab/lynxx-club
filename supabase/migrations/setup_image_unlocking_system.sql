-- ============================================
-- MIGRATION: setup_image_unlocking_system.sql
-- DESCRIPTION: Handles the logic for Seekers to pay
--              to unlock images sent by Earners.
-- ============================================

-- 1. Create table to track unlocked images
CREATE TABLE IF NOT EXISTS public.image_unlocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    unlocked_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    cost_credits INT NOT NULL DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure a user can only unlock an image once
    UNIQUE(message_id, unlocked_by)
);

-- 2. Enable RLS
ALTER TABLE public.image_unlocks ENABLE ROW LEVEL SECURITY;

-- 3. Policies
-- Users can see their own unlocks
CREATE POLICY "Users can view own unlocks" ON public.image_unlocks
    FOR SELECT USING (auth.uid() = unlocked_by);

-- 4. Function to unlock an image
-- This deducts credits and records the unlock in one transaction
CREATE OR REPLACE FUNCTION unlock_image(p_message_id UUID)
RETURNS JSON AS $$
DECLARE
    v_message RECORD;
    v_sender_id UUID;
    v_recipient_id UUID;
    v_wallet_current INT;
    v_cost INT := 10; -- Fixed cost for image unlock
BEGIN
    -- 1. Get message details
    SELECT * INTO v_message 
    FROM public.messages 
    WHERE id = p_message_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Message not found');
    END IF;

    -- 2. Check if already unlocked
    IF EXISTS (
        SELECT 1 FROM public.image_unlocks 
        WHERE message_id = p_message_id AND unlocked_by = auth.uid()
    ) THEN
        RETURN json_build_object('success', true, 'already_unlocked', true);
    END IF;

    -- 3. Verify the message is an image
    IF v_message.message_type != 'image' THEN
        RETURN json_build_object('success', false, 'error', 'Not an image message');
    END IF;

    -- 4. Lock sender wallet to prevent race conditions
    SELECT current_balance_credits INTO v_wallet_current
    FROM public.wallets 
    WHERE user_id = auth.uid()
    FOR UPDATE;

    -- 5. Check balance
    IF v_wallet_current < v_cost THEN
        RETURN json_build_object('success', false, 'error', 'Insufficient credits');
    END IF;

    -- 6. Deduct credits
    UPDATE public.wallets
    SET current_balance_credits = current_balance_credits - v_cost,
        total_spent_credits = total_spent_credits + v_cost
    WHERE user_id = auth.uid();

    -- 7. Record the unlock
    INSERT INTO public.image_unlocks (message_id, unlocked_by, cost_credits)
    VALUES (p_message_id, auth.uid(), v_cost);

    -- 8. (Optional) Give earnings to the sender? 
    -- Based on your rules, usually unlocking an image might benefit the Earner.
    -- Assuming standard 70/30 split for image unlocks:
    
    -- Get Earner ID (sender)
    v_sender_id := v_message.sender_id;
    
    -- Add 70% to Earner
    UPDATE public.wallets
    SET current_balance_credits = current_balance_credits + (v_cost * 0.7),
        total_earned_credits = total_earned_credits + (v_cost * 0.7)
    WHERE user_id = v_sender_id;

    -- 9. Log Transactions
    INSERT INTO public.ledger (from_user_id, to_user_id, amount_credits, transaction_type, description)
    VALUES 
        (auth.uid(), v_sender_id, (v_cost * 0.7), 'image_unlock_payout', 'Image unlock payout'),
        (auth.uid(), NULL, (v_cost * 0.3), 'platform_fee', 'Image unlock platform fee');

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;