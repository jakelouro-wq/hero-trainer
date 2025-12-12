-- Create table for manual activity logging
CREATE TABLE public.manual_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.manual_activities ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own activities"
ON public.manual_activities
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own activities"
ON public.manual_activities
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activities"
ON public.manual_activities
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activities"
ON public.manual_activities
FOR DELETE
USING (auth.uid() = user_id);