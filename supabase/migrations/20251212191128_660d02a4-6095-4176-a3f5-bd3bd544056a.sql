-- Add RIR (Reps in Reserve) column to exercises table for intensity prescription
ALTER TABLE public.exercises ADD COLUMN rir text NULL;