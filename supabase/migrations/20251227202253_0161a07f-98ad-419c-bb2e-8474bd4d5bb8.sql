-- Create saved_profiles table for favorites feature
CREATE TABLE public.saved_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  saved_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, saved_profile_id)
);

-- Enable Row Level Security
ALTER TABLE public.saved_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can save profiles" 
ON public.saved_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave profiles" 
ON public.saved_profiles 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their saved profiles" 
ON public.saved_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Add notification preference columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notify_new_message BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notify_video_booking BOOLEAN DEFAULT true;