-- ============================================
-- MIGRATION: setup_notifications_system.sql
-- DESCRIPTION: Creates the notifications table and 
--              secure functions for managing read status.
-- ============================================

-- 1. Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL, -- e.g., 'profile_like', 'new_message', 'video_booking', 'earning'
    title TEXT NOT NULL,
    message TEXT,
    
    -- Optional: Link to related entities
    related_type TEXT, -- 'message', 'video_date', 'profile'
    related_id UUID,
    
    metadata JSONB DEFAULT '{}', -- Store extra data like amount, gift_emoji, etc.
    
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Indexes for Performance
CREATE INDEX idx_notifications_recipient_created ON public.notifications(recipient_id, created_at DESC);
CREATE INDEX idx_notifications_read_status ON public.notifications(recipient_id) WHERE read_at IS NULL;

-- 3. Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = recipient_id);

-- Users can update their own read status (via function mainly, but good to have)
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = recipient_id);

-- 5. Helper Function: Mark Single Notification as Read
CREATE OR REPLACE FUNCTION mark_notification_as_read(p_notification_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.notifications
    SET read_at = now()
    WHERE id = p_notification_id 
    AND recipient_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Helper Function: Mark All Notifications as Read
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS VOID AS $$
BEGIN
    UPDATE public.notifications
    SET read_at = now()
    WHERE recipient_id = auth.uid()
    AND read_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Helper Function: Create Notification (Used by triggers)
CREATE OR REPLACE FUNCTION create_notification(
    p_recipient_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_related_type TEXT DEFAULT NULL,
    p_related_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_new_id UUID;
BEGIN
    INSERT INTO public.notifications (recipient_id, type, title, message, related_type, related_id, metadata)
    VALUES (p_recipient_id, p_type, p_title, p_message, p_related_type, p_related_id, p_metadata)
    RETURNING id INTO v_new_id;
    
    RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;