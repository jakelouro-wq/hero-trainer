-- Add intensity_rating column to user_workouts table
ALTER TABLE public.user_workouts 
ADD COLUMN intensity_rating integer CHECK (intensity_rating >= 1 AND intensity_rating <= 10);