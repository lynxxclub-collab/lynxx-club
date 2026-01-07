-- ============================================
-- SAFE MIGRATION: setup_earner_pricing_and_ledger_system.sql
-- DESCRIPTION: Cleans up old/incorrect tables and creates the correct schema.
-- SAFE TO RUN: Can be run manually in Supabase OR via Lovable without crashing.
-- ============================================

-- 1. CLEANUP: Drop old/incorrect tables if they exist to avoid conflicts
DROP TABLE IF EXISTS public.ledger CASCADE;
DROP TABLE IF EXISTS public.dates CASCADE;
DROP TABLE IF EXISTS public.earner_services CASCADE;
DROP TABLE IF EXISTS public.wallets CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop Enums if they exist (Must drop tables that use them first, done above)
DROP TYPE IF EXISTS public.date_status;
DROP TYPE IF EXISTS public.service_type;
DROP TYPE IF EXISTS public.user_role;

-- 2. Create Enums for fixed values
CREATE TYPE user_role AS ENUM ('seeker', 'earner', 'admin');
CREATE TYPE date_status AS ENUM ('pending', 'active', 'completed', 'cancelled');
CREATE TYPE service_type AS ENUM ('video', 'audio');

-- 3. Extend the auth.users table with a public profile
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'seeker',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Wallets Table to track user balances
CREATE TABLE public.wallets (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) UNIQUE NOT NULL,
    current_balance_credits INT DEFAULT 0,
    total_earned_credits INT DEFAULT 0,
    total_spent_credits INT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Earner Service Pricing Table
-- This enforces the Min/Max credit rules you specified.
CREATE TABLE public.earner_services (
    id SERIAL PRIMARY KEY,
    earner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Duration in minutes (15, 30, 60, 90)
    duration_minutes INT NOT NULL,
    
    -- Base price for VIDEO chat for this duration
    video_price_credits INT NOT NULL,
    
    -- Ensure unique service per duration per earner
    UNIQUE(earner_id, duration_minutes),
    
    -- CONSTRAINT: Enforce specific Min/Max pricing based on duration
    CONSTRAINT check_video_pricing CHECK (
        (duration_minutes = 15 AND video_price_credits BETWEEN 200 AND 900) OR
        (duration_minutes = 30 AND video_price_credits BETWEEN 280 AND 900) OR
        (duration_minutes = 60 AND video_price_credits BETWEEN 392 AND 900) OR
        (duration_minutes = 90 AND video_price_credits BETWEEN 412 AND 900)
    )
);

-- 6. Dates/Sessions Table
-- This tracks the actual bookings and financial splits.
CREATE TABLE public.dates (
    id SERIAL PRIMARY KEY,
    seeker_id UUID REFERENCES public.profiles(id),
    earner_id UUID REFERENCES public.profiles(id),
    service_type service_type NOT NULL,
    duration_minutes INT NOT NULL,
    
    -- Status tracking
    status date_status DEFAULT 'pending',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    
    -- Financial Breakdown (Locked in at booking time)
    total_price_credits INT NOT NULL,
    platform_fee_credits INT NOT NULL, -- 30% of total
    earner_payout_credits INT NOT NULL, -- 70% of total
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Transaction Ledger (Full Accounting)
-- Records every movement of credits.
CREATE TABLE public.ledger (
    id SERIAL PRIMARY KEY,
    date_id INT REFERENCES public.dates(id),
    from_user_id UUID REFERENCES public.profiles(id), -- The payer (Seeker)
    to_user_id UUID REFERENCES public.profiles(id),   -- The receiver (Earner or Platform logic)
    amount_credits INT NOT NULL, 
    transaction_type TEXT NOT NULL, -- 'booking_payment', 'earner_payout', 'platform_fee'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Function to Handle Payouts when a Date is 'completed'
-- This triggers automatically when a date status is updated to 'completed'.
CREATE OR REPLACE FUNCTION handle_date_completion()
RETURNS TRIGGER AS $$
DECLARE
    v_earner_wallet_id INT;
BEGIN
    -- Only proceed if status is changing TO 'completed'
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        
        -- 1. Add earnings to Earner's wallet
        UPDATE public.wallets 
        SET current_balance_credits = current_balance_credits + NEW.earner_payout_credits,
            total_earned_credits = total_earned_credits + NEW.earner_payout_credits,
            updated_at = now()
        WHERE user_id = NEW.earner_id;
        
        -- 2. Log the Payout to the Ledger
        INSERT INTO public.ledger (date_id, from_user_id, to_user_id, amount_credits, transaction_type, description)
        VALUES (
            NEW.id, 
            NEW.seeker_id, 
            NEW.earner_id, 
            NEW.earner_payout_credits, 
            'earner_payout', 
            'Payout for completed date ID: ' || NEW.id
        );

        -- 3. (Optional) Log Platform Revenue internally for your records
        INSERT INTO public.ledger (date_id, from_user_id, to_user_id, amount_credits, transaction_type, description)
        VALUES (
            NEW.id, 
            NEW.seeker_id, 
            NULL, -- NULL represents the Platform/System here
            NEW.platform_fee_credits, 
            'platform_fee', 
            'Platform fee for date ID: ' || NEW.id
        );
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Trigger to connect the function to the dates table
DROP TRIGGER IF EXISTS trigger_payout_on_date_completion ON public.dates;
CREATE TRIGGER trigger_payout_on_date_completion
AFTER UPDATE OF status ON public.dates
FOR EACH ROW
EXECUTE FUNCTION handle_date_completion();

-- 10. Row Level Security (RLS) Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earner_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger ENABLE ROW LEVEL SECURITY;

-- Basic Policies (Refine these based on specific access needs)
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view earner services" ON public.earner_services FOR SELECT USING (true);
CREATE POLICY "Users can see own dates" ON public.dates FOR SELECT USING (auth.uid() = seeker_id OR auth.uid() = earner_id);
