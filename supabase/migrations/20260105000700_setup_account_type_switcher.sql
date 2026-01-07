-- ============================================
-- MIGRATION: setup_account_type_switcher.sql
-- DESCRIPTION: Handles logic for users switching 
--              between Seeker and Earner roles once.
-- ============================================

-- 1. Create Enum for Switch Status
CREATE TYPE switch_status AS ENUM ('pending', 'completed', 'cancelled');

-- 2. Create Account Type Switches Table
CREATE TABLE IF NOT EXISTS public.account_type_switches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    from_type user_role NOT NULL,
    to_type user_role NOT NULL,
    status switch_status DEFAULT 'pending',
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    effective_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Ensure a user can't have multiple pending requests
    CONSTRAINT check_no_multiple_pending EXCLUDE (
        user_id WITH =
        WHERE status = 'pending'
    )
);

-- 3. Enable RLS
ALTER TABLE public.account_type_switches ENABLE ROW LEVEL SECURITY;

-- 4. Policies
-- Users can view their own switches
CREATE POLICY "Users can view own switches" ON public.account_type_switches
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own switch
CREATE POLICY "Users can create switch" ON public.account_type_switches
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. RPC Function: Check Account Switch Eligibility
-- Returns: { can_switch: boolean, pending_switch: jsonb | null }
CREATE OR REPLACE FUNCTION check_account_switch()
RETURNS JSON AS $$
DECLARE
    v_latest_switch RECORD;
    v_can_switch BOOLEAN := TRUE;
    v_response JSON;
BEGIN
    -- Get the most recent switch request for the user
    SELECT * INTO v_latest_switch
    FROM public.account_type_switches
    WHERE user_id = auth.uid()
    ORDER BY requested_at DESC
    LIMIT 1;

    -- Logic: 
    -- 1. If status is 'pending' -> Cannot switch (Waiting for 7 days)
    -- 2. If status is 'completed' -> Cannot switch (One-time only)
    -- 3. Else -> Can switch
    
    IF v_latest_switch IS NOT NULL THEN
        IF v_latest_switch.status = 'pending' THEN
            v_can_switch := FALSE;
        ELSIF v_latest_switch.status = 'completed' THEN
            v_can_switch := FALSE;
        END IF;
    END IF;

    -- Build Response
    IF v_can_switch THEN
        v_response := json_build_object('can_switch', true, 'pending_switch', null);
    ELSE
        v_response := json_build_object('can_switch', false, 'pending_switch', v_latest_switch);
    END IF;

    RETURN v_response;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
