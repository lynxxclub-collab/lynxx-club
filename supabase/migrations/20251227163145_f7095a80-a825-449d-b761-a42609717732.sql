-- Create earner_availability table for video date scheduling
CREATE TABLE public.earner_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, day_of_week, start_time, end_time)
);

-- Enable RLS
ALTER TABLE public.earner_availability ENABLE ROW LEVEL SECURITY;

-- Users can view their own availability
CREATE POLICY "Users can view own availability" 
ON public.earner_availability 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own availability
CREATE POLICY "Users can insert own availability" 
ON public.earner_availability 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own availability
CREATE POLICY "Users can update own availability" 
ON public.earner_availability 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own availability
CREATE POLICY "Users can delete own availability" 
ON public.earner_availability 
FOR DELETE 
USING (auth.uid() = user_id);

-- Verified users can view earner availability (for booking)
CREATE POLICY "Verified users can view earner availability" 
ON public.earner_availability 
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() 
  AND verification_status = 'verified'
));

-- Create chat-images storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload chat images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow anyone to view chat images
CREATE POLICY "Anyone can view chat images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-images');