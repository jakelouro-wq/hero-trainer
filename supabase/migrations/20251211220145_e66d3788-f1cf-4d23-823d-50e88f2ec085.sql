-- Add rest_seconds column to exercises table
ALTER TABLE public.exercises ADD COLUMN rest_seconds integer DEFAULT 60;