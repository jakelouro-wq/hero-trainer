-- Add video_url column to exercises table for YouTube videos
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS video_url text;

-- Create exercise_logs table to track completed sets for "Last" data
CREATE TABLE public.exercise_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  user_workout_id uuid NOT NULL REFERENCES public.user_workouts(id) ON DELETE CASCADE,
  set_number integer NOT NULL,
  reps text NOT NULL,
  weight text,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for exercise_logs
CREATE POLICY "Users can view their own exercise logs"
ON public.exercise_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exercise logs"
ON public.exercise_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exercise logs"
ON public.exercise_logs
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exercise logs"
ON public.exercise_logs
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_exercise_logs_user_exercise ON public.exercise_logs(user_id, exercise_id);
CREATE INDEX idx_exercise_logs_completed_at ON public.exercise_logs(completed_at DESC);