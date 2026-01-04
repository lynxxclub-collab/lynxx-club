DROP FUNCTION IF EXISTS public.mark_video_date_in_progress(uuid);

CREATE OR REPLACE FUNCTION public.mark_video_date_in_progress(p_video_date_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v record;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT *
  INTO v
  FROM public.video_dates
  WHERE id = p_video_date_id
  FOR UPDATE;

  IF v IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Video date not found');
  END IF;

  IF auth.uid() <> v.seeker_id AND auth.uid() <> v.earner_id THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- If already started, don't reset
  UPDATE public.video_dates
  SET status = 'in_progress',
      actual_start = COALESCE(actual_start, now()),
      grace_deadline = NULL,
      updated_at = now()
  WHERE id = p_video_date_id;

  RETURN json_build_object('success', true);
END;
$$;