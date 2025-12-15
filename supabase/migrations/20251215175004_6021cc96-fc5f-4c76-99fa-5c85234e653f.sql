-- Add column to track swapped exercise names
ALTER TABLE public.exercise_logs 
ADD COLUMN swapped_exercise_name TEXT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.exercise_logs.swapped_exercise_name IS 'The name of the exercise the user actually performed if they swapped from the programmed exercise';