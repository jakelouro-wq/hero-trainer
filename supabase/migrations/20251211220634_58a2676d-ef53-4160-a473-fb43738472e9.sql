-- Add duration_seconds column to track actual workout time
ALTER TABLE public.user_workouts ADD COLUMN duration_seconds integer DEFAULT NULL;