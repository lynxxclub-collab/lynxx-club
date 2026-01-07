-- ============================================
-- MIGRATION: setup_block_user_system.sql
-- DESCRIPTION: Creates the blocked_users table
--              to prevent interactions between users.
-- ============================================

-- 1. Create Blocked Users Table
CREATE TABLE IF NOT EXISTS public.blocked_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    blocker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    blocked_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Constraints
-- Prevent blocking the same user twice
CREATE UNIQUE INDEX idx_blocked_users_unique_pair 
ON public.blocked_users(blocker_id, blocked_id);

-- Prevent blocking yourself
ALTER TABLE public.blocked_users
ADD CONSTRAINT check_not_self CHECK (blocker_id != blocked_id);

-- 3. Enable RLS
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- 4. Policies
-- Users can insert their own blocks
CREATE POLICY "Users can block others" ON public.blocked_users
    FOR INSERT WITH CHECK (auth.uid() = blocker_id);

-- Users can view their own blocked list
CREATE POLICY "Users can view own blocks" ON public.blocked_users
    FOR SELECT USING (auth.uid() = blocker_id);

-- Users can unblock (delete their own blocks)
CREATE POLICY "Users can unblock others" ON public.blocked_users
    FOR DELETE USING (auth.uid() = blocker_id);
