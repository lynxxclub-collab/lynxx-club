-- Allow users to view profiles of people they share conversations with
CREATE POLICY "Users can view profiles of conversation participants"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE (conversations.seeker_id = auth.uid() AND conversations.earner_id = profiles.id)
       OR (conversations.earner_id = auth.uid() AND conversations.seeker_id = profiles.id)
  )
);