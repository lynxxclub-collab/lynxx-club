-- Create conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seeker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  earner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_messages INTEGER NOT NULL DEFAULT 0,
  total_credits_spent INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(seeker_id, earner_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image')),
  credits_cost INTEGER NOT NULL,
  earner_amount NUMERIC(10, 2) NOT NULL,
  platform_fee NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Conversation policies
CREATE POLICY "Users can view their own conversations"
ON public.conversations FOR SELECT
USING (auth.uid() = seeker_id OR auth.uid() = earner_id);

CREATE POLICY "Seekers can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (auth.uid() = seeker_id);

CREATE POLICY "Users can update their own conversations"
ON public.conversations FOR UPDATE
USING (auth.uid() = seeker_id OR auth.uid() = earner_id);

-- Message policies
CREATE POLICY "Users can view messages in their conversations"
ON public.messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can insert messages they send"
ON public.messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can update messages (read receipts)"
ON public.messages FOR UPDATE
USING (auth.uid() = recipient_id);

-- Indexes for performance
CREATE INDEX idx_conversations_seeker ON public.conversations(seeker_id);
CREATE INDEX idx_conversations_earner ON public.conversations(earner_id);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_created ON public.messages(created_at DESC);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Atomic send message function
CREATE OR REPLACE FUNCTION public.send_message(
  p_sender_id UUID,
  p_recipient_id UUID,
  p_conversation_id UUID,
  p_content TEXT,
  p_message_type TEXT DEFAULT 'text'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits_cost INTEGER;
  v_earner_amount NUMERIC(10, 2);
  v_platform_fee NUMERIC(10, 2);
  v_sender_balance INTEGER;
  v_message_id UUID;
  v_conv_id UUID;
BEGIN
  -- Determine credits cost based on message type
  IF p_message_type = 'image' THEN
    v_credits_cost := 40;
  ELSE
    v_credits_cost := 20;
  END IF;
  
  -- Calculate earnings: credits * 0.10 * 0.70
  v_earner_amount := (v_credits_cost * 0.10 * 0.70);
  v_platform_fee := (v_credits_cost * 0.10 * 0.30);
  
  -- Check sender has enough credits
  SELECT credit_balance INTO v_sender_balance
  FROM profiles
  WHERE id = p_sender_id
  FOR UPDATE;
  
  IF v_sender_balance IS NULL OR v_sender_balance < v_credits_cost THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient credits', 'required', v_credits_cost, 'balance', COALESCE(v_sender_balance, 0));
  END IF;
  
  -- Get or create conversation
  IF p_conversation_id IS NOT NULL THEN
    v_conv_id := p_conversation_id;
  ELSE
    INSERT INTO conversations (seeker_id, earner_id)
    VALUES (p_sender_id, p_recipient_id)
    ON CONFLICT (seeker_id, earner_id) DO UPDATE SET last_message_at = now()
    RETURNING id INTO v_conv_id;
  END IF;
  
  -- Deduct credits from sender
  UPDATE profiles
  SET credit_balance = credit_balance - v_credits_cost
  WHERE id = p_sender_id;
  
  -- Add earnings to recipient
  UPDATE profiles
  SET earnings_balance = earnings_balance + v_earner_amount
  WHERE id = p_recipient_id;
  
  -- Create message
  INSERT INTO messages (conversation_id, sender_id, recipient_id, content, message_type, credits_cost, earner_amount, platform_fee)
  VALUES (v_conv_id, p_sender_id, p_recipient_id, p_content, p_message_type, v_credits_cost, v_earner_amount, v_platform_fee)
  RETURNING id INTO v_message_id;
  
  -- Update conversation stats
  UPDATE conversations
  SET total_messages = total_messages + 1,
      total_credits_spent = total_credits_spent + v_credits_cost,
      last_message_at = now()
  WHERE id = v_conv_id;
  
  -- Create transaction record for sender
  INSERT INTO transactions (user_id, transaction_type, credits_amount, description)
  VALUES (p_sender_id, 'message_sent', -v_credits_cost, 
          CASE WHEN p_message_type = 'image' THEN 'Image message sent' ELSE 'Text message sent' END);
  
  -- Create transaction record for earner
  INSERT INTO transactions (user_id, transaction_type, credits_amount, usd_amount, description)
  VALUES (p_recipient_id, 'earning', 0, v_earner_amount, 
          CASE WHEN p_message_type = 'image' THEN 'Received image message' ELSE 'Received text message' END);
  
  RETURN json_build_object(
    'success', true, 
    'message_id', v_message_id, 
    'conversation_id', v_conv_id,
    'credits_spent', v_credits_cost,
    'new_balance', v_sender_balance - v_credits_cost
  );
END;
$$;