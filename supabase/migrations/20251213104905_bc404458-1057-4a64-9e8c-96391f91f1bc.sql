-- Create messages table for coach-athlete communication
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  content TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own messages (sent or received)
CREATE POLICY "Users can view their own messages"
ON public.messages
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Create policy for users to send messages
CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Create policy for recipients to mark messages as read
CREATE POLICY "Recipients can update read status"
ON public.messages
FOR UPDATE
USING (auth.uid() = recipient_id);

-- Coaches can view all messages with their clients
CREATE POLICY "Coaches can view client messages"
ON public.messages
FOR SELECT
USING (
  has_role(auth.uid(), 'coach') OR has_role(auth.uid(), 'admin')
);

-- Create index for faster queries
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_recipient ON public.messages(recipient_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;