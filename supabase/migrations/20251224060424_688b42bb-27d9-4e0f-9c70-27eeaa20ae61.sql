-- Create ratings table
CREATE TABLE public.ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rater_id UUID NOT NULL,
  rated_id UUID NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id),
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  conversation_quality INTEGER CHECK (conversation_quality >= 1 AND conversation_quality <= 5),
  respect_boundaries INTEGER CHECK (respect_boundaries >= 1 AND respect_boundaries <= 5),
  punctuality INTEGER CHECK (punctuality >= 1 AND punctuality <= 5),
  would_interact_again BOOLEAN,
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can create ratings" ON public.ratings
FOR INSERT WITH CHECK (auth.uid() = rater_id);

CREATE POLICY "Users can view ratings they gave or received" ON public.ratings
FOR SELECT USING (auth.uid() = rater_id OR auth.uid() = rated_id);

-- Function to update average rating
CREATE OR REPLACE FUNCTION public.update_user_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET 
    average_rating = (
      SELECT COALESCE(AVG(overall_rating), 0)
      FROM ratings
      WHERE rated_id = NEW.rated_id
    ),
    total_ratings = (
      SELECT COUNT(*)
      FROM ratings
      WHERE rated_id = NEW.rated_id
    )
  WHERE id = NEW.rated_id;
  RETURN NEW;
END;
$$;

-- Trigger to auto-update ratings
CREATE TRIGGER on_rating_created
AFTER INSERT ON public.ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_user_rating();

-- Enable realtime for ratings
ALTER PUBLICATION supabase_realtime ADD TABLE public.ratings;