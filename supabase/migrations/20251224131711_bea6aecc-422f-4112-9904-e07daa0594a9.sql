-- Add featured_until column to profiles for earner featured placement
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;