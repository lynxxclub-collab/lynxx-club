/* =========================================================
   STORAGE BUCKET: profile-photos (PUBLIC READ)
   ========================================================= */

-- Create bucket if missing (or ensure public=true if it exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id)
DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public;

-- Ensure RLS is enabled (usually already enabled in Supabase)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (prevents duplicates)
DROP POLICY IF EXISTS "Users can upload their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile photos" ON storage.objects;

-- Allow authenticated users to upload ONLY into their folder: {user_id}/filename.jpg
CREATE POLICY "Users can upload their own photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos'
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update ONLY their own folder objects
-- (USING controls which rows they can target, WITH CHECK prevents changing name into another folder)
CREATE POLICY "Users can update their own photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'profile-photos'
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete ONLY their own folder objects
CREATE POLICY "Users can delete their own photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Public read access (so BOTH seekers + earners + logged-out visitors can see images)
-- Use anon + authenticated (Supabase roles), not "public"
CREATE POLICY "Anyone can view profile photos"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'profile-photos');


/* =========================================================
   PROFILES TABLE RLS POLICIES (PERMISSIVE)
   ========================================================= */

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop old policies to avoid conflicts
DROP POLICY IF EXISTS "Seekers can view earner profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Logged-in users can view active earner profiles (so seekers + earners can browse earners)
CREATE POLICY "Users can view active earner profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  user_type = 'earner'
  AND account_status = 'active'
);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);