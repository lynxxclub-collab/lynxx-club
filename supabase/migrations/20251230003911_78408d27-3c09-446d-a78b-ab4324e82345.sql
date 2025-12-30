-- Create a secure function to get conversation participant profile data
-- This limits what fields can be accessed, providing defense-in-depth
CREATE OR REPLACE FUNCTION public.get_conversation_participant_profile(p_profile_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  profile_photos text[],
  video_15min_rate integer,
  video_30min_rate integer,
  video_60min_rate integer,
  video_90min_rate integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.name,
    p.profile_photos,
    p.video_15min_rate,
    p.video_30min_rate,
    p.video_60min_rate,
    p.video_90min_rate
  FROM public.profiles p
  WHERE p.id = p_profile_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE (c.seeker_id = auth.uid() AND c.earner_id = p.id)
         OR (c.earner_id = auth.uid() AND c.seeker_id = p.id)
    );
$$;