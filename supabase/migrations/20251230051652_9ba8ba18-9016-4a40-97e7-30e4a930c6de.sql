-- Drop the overly permissive conversation-based profile policy
-- The get_conversation_participant_profile() function already provides 
-- limited, safe access to participant data for conversations
DROP POLICY IF EXISTS "Users can view profiles of conversation participants" ON public.profiles;