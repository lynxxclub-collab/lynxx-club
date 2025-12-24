-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Seekers can view earner profiles" ON profiles;

-- Create permissive policy for seekers viewing earners
CREATE POLICY "Seekers can view earner profiles"
ON profiles FOR SELECT TO authenticated
USING ((user_type = 'earner') AND (account_status = 'active'));

-- Add NEW policy for earners viewing seekers
CREATE POLICY "Earners can view seeker profiles"
ON profiles FOR SELECT TO authenticated
USING ((user_type = 'seeker') AND (account_status = 'active'));

-- Create profile_likes table
CREATE TABLE public.profile_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  liker_id uuid NOT NULL,
  liked_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (liker_id, liked_id)
);

ALTER TABLE public.profile_likes ENABLE ROW LEVEL SECURITY;

-- Users can like others
CREATE POLICY "Users can like profiles"
ON profile_likes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = liker_id);

-- Users can view likes they gave or received
CREATE POLICY "Users can view their likes"
ON profile_likes FOR SELECT TO authenticated
USING (auth.uid() = liker_id OR auth.uid() = liked_id);

-- Users can unlike (delete their own likes)
CREATE POLICY "Users can unlike"
ON profile_likes FOR DELETE TO authenticated
USING (auth.uid() = liker_id);