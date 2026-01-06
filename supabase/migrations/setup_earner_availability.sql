-- ============================================
-- MIGRATION: setup_earner_availability.sql
-- DESCRIPTION: Creates the table for earners to set
--              their available time slots.
-- ============================================

-- 1. Create Earner Availability Table
CREATE TABLE IF NOT EXISTS public.earner_availability (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,
    
    -- Prevent duplicate slots for the same user/day
    UNIQUE(user_id, day_of_week, start_time)
);

-- 2. Indexes for performance
CREATE INDEX idx_availability_user ON public.earner_availability(user_id);
CREATE INDEX idx_availability_day ON public.earner_availability(day_of_week);

-- 3. Enable RLS
ALTER TABLE public.earner_availability ENABLE ROW LEVEL SECURITY;

-- 4. Policies
-- Users can view availability (usually we make this public for seekers to see, 
-- but for the settings page, viewing own is key)
CREATE POLICY "Users can view own availability" ON public.earner_availability
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own availability
CREATE POLICY "Users can insert own availability" ON public.earner_availability
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own availability
CREATE POLICY "Users can update own availability" ON public.earner_availability
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own availability
CREATE POLICY "Users can delete own availability" ON public.earner_availability
    FOR DELETE USING (auth.uid() = user_id);