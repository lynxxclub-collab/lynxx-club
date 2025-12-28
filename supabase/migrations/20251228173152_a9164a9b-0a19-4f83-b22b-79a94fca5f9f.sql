-- Fix 1: Add policy to explicitly block anonymous access to profiles table
-- The existing policies use RESTRICTIVE mode, so adding a default deny for anon isn't needed
-- But we should ensure there's no way for unauthenticated users to access the table

-- Drop the profiles_browse view and recreate as a regular view with RLS
-- Views inherit RLS from their base tables, but we need to ensure proper security

-- First, enable RLS on profiles_browse if it's a table (not a view)
-- Check if profiles_browse is a view or table and handle accordingly

-- Add an explicit policy requiring authentication for profiles table
-- This acts as an additional safeguard
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- For profiles_browse, if it's a view, we need to ensure it respects RLS
-- If it's a materialized view or table, we need to add RLS policies

-- Since profiles_browse appears to be a view (based on the schema), 
-- we need to ensure it's created with security_invoker = true
-- Let's drop and recreate it properly

DROP VIEW IF EXISTS public.profiles_browse;

CREATE VIEW public.profiles_browse 
WITH (security_invoker = true)
AS
SELECT 
  p.id,
  p.name,
  p.date_of_birth,
  p.gender,
  p.gender_preference,
  p.location_city,
  p.location_state,
  p.bio,
  p.profile_photos,
  p.user_type,
  p.video_15min_rate,
  p.video_30min_rate,
  p.video_60min_rate,
  p.video_90min_rate,
  p.average_rating,
  p.total_ratings,
  p.created_at,
  p.verification_status,
  p.account_status,
  p.is_featured,
  p.featured_until,
  p.height,
  p.hobbies,
  p.interests
FROM public.profiles p
WHERE p.account_status = 'active'
  AND p.verification_status = 'verified';