-- ============================================
-- MIGRATION: setup_creator_applications_system.sql
-- DESCRIPTION: Creates the schema for users to apply 
--              to become creators/earners.
-- ============================================

-- 1. Create Enum for Application Status
CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected');

-- 2. Create Creator Applications Table
CREATE TABLE IF NOT EXISTS public.creator_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL,
    social_link TEXT,
    why_join TEXT NOT NULL,
    status application_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Constraints
-- Ensure a user can only submit one active application at a time
CREATE UNIQUE INDEX idx_creator_applications_unique_user ON public.creator_applications(user_id) 
WHERE (status = 'pending');

-- 4. Enable RLS
ALTER TABLE public.creator_applications ENABLE ROW LEVEL SECURITY;

-- 5. Policies
-- Users can insert their own application
CREATE POLICY "Users can submit creator application" ON public.creator_applications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view their own applications
CREATE POLICY "Users can view own application" ON public.creator_applications
    FOR SELECT USING (auth.uid() = user_id);

-- 6. Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_creator_applications_updated_at 
    BEFORE UPDATE ON public.creator_applications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
