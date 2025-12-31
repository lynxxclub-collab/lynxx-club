
-- Function for new message notifications
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name TEXT;
BEGIN
  -- Get sender name
  SELECT COALESCE(name, 'Someone') INTO v_sender_name
  FROM profiles WHERE id = NEW.sender_id;
  
  -- Create notification for recipient
  INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
  VALUES (
    NEW.recipient_id,
    'new_message',
    v_sender_name || ' sent you a message',
    LEFT(NEW.content, 100),
    NEW.conversation_id,
    'conversation'
  );
  
  RETURN NEW;
END;
$$;

-- Trigger for new messages
DROP TRIGGER IF EXISTS on_new_message ON messages;
CREATE TRIGGER on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

-- Function for profile like notifications
CREATE OR REPLACE FUNCTION public.notify_profile_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_liker_name TEXT;
BEGIN
  -- Get liker name
  SELECT COALESCE(name, 'Someone') INTO v_liker_name
  FROM profiles WHERE id = NEW.liker_id;
  
  -- Create notification for liked user
  INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
  VALUES (
    NEW.liked_id,
    'profile_like',
    v_liker_name || ' liked your profile',
    'Check out who''s interested in you',
    NEW.liker_id,
    'profile'
  );
  
  RETURN NEW;
END;
$$;

-- Trigger for profile likes
DROP TRIGGER IF EXISTS on_profile_like ON profile_likes;
CREATE TRIGGER on_profile_like
  AFTER INSERT ON profile_likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_profile_like();

-- Function for profile save notifications
CREATE OR REPLACE FUNCTION public.notify_profile_save()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saver_name TEXT;
BEGIN
  -- Get saver name
  SELECT COALESCE(name, 'Someone') INTO v_saver_name
  FROM profiles WHERE id = NEW.user_id;
  
  -- Create notification for saved profile owner
  INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
  VALUES (
    NEW.saved_profile_id,
    'profile_save',
    v_saver_name || ' saved your profile',
    'Your profile caught their attention',
    NEW.user_id,
    'profile'
  );
  
  RETURN NEW;
END;
$$;

-- Trigger for profile saves
DROP TRIGGER IF EXISTS on_profile_save ON saved_profiles;
CREATE TRIGGER on_profile_save
  AFTER INSERT ON saved_profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_profile_save();

-- Function for gift received notifications
CREATE OR REPLACE FUNCTION public.notify_gift_received()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name TEXT;
  v_gift_name TEXT;
  v_gift_emoji TEXT;
BEGIN
  -- Get sender name
  SELECT COALESCE(name, 'Someone') INTO v_sender_name
  FROM profiles WHERE id = NEW.sender_id;
  
  -- Get gift details
  SELECT name, emoji INTO v_gift_name, v_gift_emoji
  FROM gift_catalog WHERE id = NEW.gift_id;
  
  -- Create notification for recipient
  INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
  VALUES (
    NEW.recipient_id,
    'gift',
    v_sender_name || ' sent you ' || COALESCE(v_gift_emoji, '🎁') || ' ' || COALESCE(v_gift_name, 'a gift'),
    'Check your messages to thank them',
    NEW.conversation_id,
    'conversation'
  );
  
  RETURN NEW;
END;
$$;

-- Trigger for gift transactions
DROP TRIGGER IF EXISTS on_gift_received ON gift_transactions;
CREATE TRIGGER on_gift_received
  AFTER INSERT ON gift_transactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_gift_received();

-- Function for video date notifications
CREATE OR REPLACE FUNCTION public.notify_video_date_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_other_user_id UUID;
  v_other_name TEXT;
  v_notify_user_id UUID;
  v_title TEXT;
  v_message TEXT;
  v_type TEXT;
BEGIN
  -- Determine who to notify based on the change
  IF TG_OP = 'INSERT' THEN
    -- New booking - notify the earner
    v_notify_user_id := NEW.earner_id;
    SELECT COALESCE(name, 'Someone') INTO v_other_name FROM profiles WHERE id = NEW.seeker_id;
    v_title := v_other_name || ' booked a video date with you';
    v_message := 'Check your video dates for details';
    v_type := 'video_booking';
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- Status changed - notify the other party
    IF NEW.status = 'confirmed' THEN
      v_notify_user_id := NEW.seeker_id;
      SELECT COALESCE(name, 'Someone') INTO v_other_name FROM profiles WHERE id = NEW.earner_id;
      v_title := v_other_name || ' confirmed your video date';
      v_message := 'Your video date is confirmed!';
      v_type := 'video_booking';
    ELSIF NEW.status = 'cancelled' THEN
      -- Notify both parties
      v_notify_user_id := NEW.seeker_id;
      SELECT COALESCE(name, 'Someone') INTO v_other_name FROM profiles WHERE id = NEW.earner_id;
      v_title := 'Video date cancelled';
      v_message := 'Your video date has been cancelled';
      v_type := 'video_booking';
      
      INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
      VALUES (v_notify_user_id, v_type, v_title, v_message, NEW.id, 'video_date');
      
      -- Also notify earner
      v_notify_user_id := NEW.earner_id;
      SELECT COALESCE(name, 'Someone') INTO v_other_name FROM profiles WHERE id = NEW.seeker_id;
    ELSIF NEW.status = 'completed' THEN
      -- Notify seeker that it's completed
      v_notify_user_id := NEW.seeker_id;
      v_title := 'Video date completed';
      v_message := 'Hope you had a great time! Don''t forget to leave a rating.';
      v_type := 'video_booking';
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;
  
  -- Create notification
  INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
  VALUES (v_notify_user_id, v_type, v_title, v_message, NEW.id, 'video_date');
  
  RETURN NEW;
END;
$$;

-- Trigger for video dates
DROP TRIGGER IF EXISTS on_video_date_change ON video_dates;
CREATE TRIGGER on_video_date_change
  AFTER INSERT OR UPDATE ON video_dates
  FOR EACH ROW
  EXECUTE FUNCTION notify_video_date_change();

-- Function for wallet/earnings notifications
CREATE OR REPLACE FUNCTION public.notify_earnings_available()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_earnings_increase NUMERIC;
BEGIN
  -- Only notify when available_earnings increases
  IF NEW.available_earnings > OLD.available_earnings THEN
    v_earnings_increase := NEW.available_earnings - OLD.available_earnings;
    
    INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
    VALUES (
      NEW.user_id,
      'earning',
      'Earnings now available: $' || TO_CHAR(v_earnings_increase, 'FM999,999.00'),
      'Your pending earnings are now available for withdrawal',
      NEW.user_id,
      'wallet'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for wallet earnings
DROP TRIGGER IF EXISTS on_earnings_available ON wallets;
CREATE TRIGGER on_earnings_available
  AFTER UPDATE ON wallets
  FOR EACH ROW
  WHEN (NEW.available_earnings > OLD.available_earnings)
  EXECUTE FUNCTION notify_earnings_available();
