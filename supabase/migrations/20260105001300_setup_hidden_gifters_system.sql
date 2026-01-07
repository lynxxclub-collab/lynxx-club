-- ============================================
-- MIGRATION: setup_hidden_gifters_system.sql
-- DESCRIPTION: Allows creators to hide specific 
--              gifters from their leaderboards.
-- ============================================

-- 1. Create Hidden Gifters Table
CREATE TABLE IF NOT EXISTS public.hidden_gifters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    gifter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Prevent duplicate hiding
    UNIQUE(creator_id, gifter_id)
);

-- 2. Enable RLS
ALTER TABLE public.hidden_gifters ENABLE ROW LEVEL SECURITY;

-- 3. Policies
-- Users can view their own hidden list
CREATE POLICY "Users can view own hidden list" ON public.hidden_gifters
    FOR SELECT USING (auth.uid() = creator_id);

-- Users can insert (hide) others
CREATE POLICY "Users can hide gifter" ON public.hidden_gifters
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- Users can delete (unhide) others
CREATE POLICY "Users can unhide gifter" ON public.hidden_gifters
    FOR DELETE USING (auth.uid() = creator_id);
