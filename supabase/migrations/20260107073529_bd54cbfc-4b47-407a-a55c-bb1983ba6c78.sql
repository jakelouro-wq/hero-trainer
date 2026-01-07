-- Create a table to store in-progress workout drafts
-- This serves as a backup to localStorage and ensures data isn't lost
CREATE TABLE public.workout_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_workout_id UUID NOT NULL REFERENCES public.user_workouts(id) ON DELETE CASCADE,
  exercise_data JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ,
  total_paused_ms INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, user_workout_id)
);

-- Enable RLS
ALTER TABLE public.workout_drafts ENABLE ROW LEVEL SECURITY;

-- Users can only access their own drafts
CREATE POLICY "Users can view their own drafts" 
ON public.workout_drafts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own drafts" 
ON public.workout_drafts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drafts" 
ON public.workout_drafts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drafts" 
ON public.workout_drafts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for fast lookups
CREATE INDEX idx_workout_drafts_user_workout ON public.workout_drafts(user_id, user_workout_id);

-- Add trigger to update updated_at
CREATE TRIGGER update_workout_drafts_updated_at
BEFORE UPDATE ON public.workout_drafts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();