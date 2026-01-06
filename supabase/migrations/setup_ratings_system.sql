-- ============================================
-- MIGRATION: setup_ratings_system.sql
-- DESCRIPTION: Creates the ratings table to allow
--              users to review dates/conversations.
-- ============================================

-- 1. Create Ratings Table
CREATE TABLE IF NOT EXISTS public.ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rater_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    rated_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    overall_rating INT NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    review_text TEXT,
    conversation_id UUID, -- Reference to conversation (if exists in DB)
    video_date_id UUID REFERENCES public.dates(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Indexes for performance
CREATE INDEX idx_ratings_rated_user ON public.ratings(rated_id);
CREATE INDEX idx_ratings_conversation ON public.ratings(conversation_id);

-- 3. Enable RLS
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- 4. Policies
-- Everyone can view ratings (needed for average calculation/display)
CREATE POLICY "Public can view ratings" ON public.ratings
    FOR SELECT USING (true);

-- Users can insert their own ratings
CREATE POLICY "Users can create rating" ON public.ratings
    FOR INSERT WITH CHECK (auth.uid() = rater_id);

-- Optional: Prevent duplicate ratings for the same context
-- CREATE UNIQUE INDEX idx_unique_rating_per_context ON public.ratings(rater_id, COALESCE(conversation_id::text, video_date_id::text));