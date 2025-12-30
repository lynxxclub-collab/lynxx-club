-- Add performance indexes for common message query patterns

-- Index for loading messages by conversation, ordered by creation date
CREATE INDEX IF NOT EXISTS messages_convo_created_at
ON public.messages (conversation_id, created_at DESC);

-- Index for loading messages by sender, ordered by creation date
CREATE INDEX IF NOT EXISTS messages_sender_created_at
ON public.messages (sender_id, created_at DESC);